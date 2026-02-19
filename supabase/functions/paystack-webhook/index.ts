import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    // Verify webhook signature
    const body = await req.text();
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(paystackSecretKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedHash = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const paystackSignature = req.headers.get("x-paystack-signature");
    if (!paystackSignature || paystackSignature !== expectedHash) {
      console.error("Invalid Paystack signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(body);

    // Only handle charge.success events
    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference, amount, metadata } = event.data;

    // Create Supabase service role client for privileged operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the escrow transaction by paystack reference
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("paystack_reference", reference)
      .eq("status", "pending")
      .maybeSingle();

    if (escrowError) {
      console.error("Escrow lookup error:", escrowError);
      throw new Error("Failed to find escrow transaction");
    }

    if (escrow) {
      // Use atomic database function to hold funds in escrow + update wallets
      const { data: holdResult, error: holdError } = await supabase
        .rpc("hold_escrow_funds", { _escrow_id: escrow.id });

      if (holdError) {
        console.error("Hold escrow error:", holdError);
        throw new Error("Failed to hold escrow funds");
      }

      if (holdResult?.error) {
        console.error("Hold escrow logic error:", holdResult.error);
        throw new Error(holdResult.error);
      }

      // Notify provider that payment is secured in escrow
      await supabase.from("notifications").insert({
        user_id: escrow.payee_id,
        title: "💰 Payment Secured",
        message: `Payment of ₦${escrow.amount.toLocaleString()} has been secured in escrow. Complete the job to receive your payout.`,
        type: "escrow",
        metadata: { escrow_id: escrow.id, job_id: escrow.job_id },
      });

      console.log(`Escrow ${escrow.id} held with 24-hour release delay`);

      // Silent AI fraud scoring - runs in background, does not block payment
      try {
        const { data: aiResult } = await supabase.rpc("calculate_ai_fraud_score", {
          _user_id: escrow.payer_id,
          _transaction_id: escrow.id,
        });
        console.log(`AI fraud score for escrow ${escrow.id}:`, aiResult);
        
        // Also score the payee
        await supabase.rpc("calculate_ai_fraud_score", {
          _user_id: escrow.payee_id,
          _transaction_id: escrow.id,
        });
      } catch (aiErr) {
        // AI scoring is non-blocking - log but don't fail the webhook
        console.error("AI fraud scoring error (non-blocking):", aiErr);
      }
    } else {
      // Check if this is a subscription payment
      const subscriptionType = metadata?.subscription_type;
      if (subscriptionType && reference?.startsWith('sub_')) {
        // Extract user_id from reference pattern: sub_{userId}_{timestamp}
        const parts = reference.split('_');
        // userId is parts[1] through parts[5] (UUID has 5 parts separated by -)
        // Reference format: sub_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx_timestamp
        const userId = parts.slice(1, -1).join('_');
        
        console.log(`Subscription payment verified: ${reference}, type: ${subscriptionType}, user: ${userId}`);

        // Calculate expiry (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Insert subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            subscription_type: subscriptionType,
            amount: amount / 100, // Convert kobo back to naira
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            status: 'active',
          });

        if (subError) {
          console.error('Subscription insert error:', subError);
          throw new Error('Failed to create subscription record');
        }

        // Upgrade slot limits for premium users
        if (subscriptionType === 'provider_slot_boost') {
          await supabase
            .from('provider_profiles')
            .update({ max_job_slots: 15 })
            .eq('user_id', userId);
        } else if (subscriptionType === 'requester_unlimited') {
          await supabase
            .from('profiles')
            .update({ requester_max_slots: 99 })
            .eq('user_id', userId);
        }

        // Notify user
        await supabase.from('notifications').insert({
          user_id: userId,
          title: '🎉 Subscription Activated',
          message: `Your ${subscriptionType === 'requester_unlimited' ? 'Unlimited Hiring' : 'Pro Service Provider'} plan is now active! Your job slots have been upgraded.`,
          type: 'subscription',
          metadata: { subscription_type: subscriptionType, reference },
        });

        console.log(`Subscription created for user ${userId}, expires ${expiresAt.toISOString()}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
