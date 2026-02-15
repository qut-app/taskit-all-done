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
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { escrow_id } = await req.json();

    if (!escrow_id) {
      throw new Error("Missing escrow_id");
    }

    // Use service role for privileged operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the escrow transaction
    const { data: escrow, error: escrowError } = await supabase
      .from("escrow_transactions")
      .select("*")
      .eq("id", escrow_id)
      .single();

    if (escrowError || !escrow) {
      throw new Error("Escrow transaction not found");
    }

    // Only the payer (job giver) can release
    if (escrow.payer_id !== userId) {
      throw new Error("Only the job giver can release escrow");
    }

    if (escrow.status !== "held") {
      throw new Error("Escrow is not in held status");
    }

    // Check 24-hour release delay
    if (escrow.release_eligible_at && new Date(escrow.release_eligible_at) > new Date()) {
      throw new Error("Release not yet eligible (24-hour fraud protection delay)");
    }

    // Use the secure database function for atomic release
    const { data: result, error: rpcError } = await supabase
      .rpc("process_escrow_release", { _escrow_id: escrow_id });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    if (result?.error) {
      throw new Error(result.error);
    }

    return new Response(
      JSON.stringify({ success: true, provider_payout: result.provider_payout, commission: result.commission }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Release escrow error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to release escrow" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
