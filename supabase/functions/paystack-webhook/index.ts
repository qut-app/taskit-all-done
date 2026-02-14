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
      // Update escrow status to held
      const { error: updateError } = await supabase
        .from("escrow_transactions")
        .update({ status: "held" })
        .eq("id", escrow.id);

      if (updateError) {
        console.error("Escrow update error:", updateError);
        throw new Error("Failed to update escrow status");
      }

      // Log wallet transaction for the payer (debit)
      await supabase.from("wallet_transactions").insert({
        user_id: escrow.payer_id,
        type: "debit",
        source: "escrow_hold",
        amount: escrow.amount,
        reference: reference,
        escrow_transaction_id: escrow.id,
      });

      // Notify provider that payment is secured in escrow
      await supabase.from("notifications").insert({
        user_id: escrow.payee_id,
        title: "💰 Payment Secured",
        message: `Payment of ₦${(escrow.amount / 100).toLocaleString()} has been secured in escrow. Complete the job to receive your payout.`,
        type: "escrow",
        metadata: { escrow_id: escrow.id, job_id: escrow.job_id },
      });

      console.log(`Escrow ${escrow.id} moved to held status`);
    } else {
      // Check if this is a subscription payment
      const subscriptionType = metadata?.subscription_type;
      if (subscriptionType) {
        // Find the user by the reference pattern or metadata
        console.log(`Subscription payment verified: ${reference}, type: ${subscriptionType}`);
        // Subscription handling is done client-side after Paystack popup success
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
