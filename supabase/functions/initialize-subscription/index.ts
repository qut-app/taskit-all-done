import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { amount, email, reference, subscription_type } = body;

    console.log('[Paystack Server Debug] Received:', JSON.stringify({ amount, email, reference, subscription_type, amount_type: typeof amount }));

    if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
      console.error('[Paystack Server Debug] Invalid amount:', amount, typeof amount);
      throw new Error(`Invalid amount: ${amount} (${typeof amount})`);
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('[Paystack Server Debug] Invalid email:', email);
      throw new Error("Invalid email address");
    }
    if (!reference || typeof reference !== 'string') {
      console.error('[Paystack Server Debug] Invalid reference:', reference);
      throw new Error("Invalid reference");
    }

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const paystackPublicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY");

    const paystackPayload = {
      amount: Math.round(amount), // ensure integer
      email,
      reference,
      currency: "NGN",
      metadata: {
        subscription_type,
      },
    };

    console.log('[Paystack Server Debug] Sending to Paystack API:', JSON.stringify(paystackPayload));

    // Initialize transaction with Paystack
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackPayload),
    });

    const data = await response.json();

    console.log('[Paystack Server Debug] Paystack response:', JSON.stringify(data));

    if (!data.status) {
      throw new Error(data.message || "Failed to initialize Paystack transaction");
    }

    return new Response(
      JSON.stringify({
        access_code: data.data.access_code,
        authorization_url: data.data.authorization_url,
        reference: data.data.reference,
        public_key: paystackPublicKey,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
