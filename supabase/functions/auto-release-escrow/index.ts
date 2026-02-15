import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all escrows that are delivered and past 48-hour auto-release window
    const { data: escrows, error: fetchErr } = await supabase
      .from("escrow_transactions")
      .select("id, delivered_at, job_id, payer_id, payee_id")
      .eq("status", "held")
      .not("delivered_at", "is", null);

    if (fetchErr) {
      throw new Error(fetchErr.message);
    }

    const now = Date.now();
    let released = 0;
    let errors = 0;

    for (const escrow of (escrows || [])) {
      const deliveredAt = new Date(escrow.delivered_at).getTime();
      const autoReleaseTime = deliveredAt + 48 * 60 * 60 * 1000; // 48 hours

      if (now >= autoReleaseTime) {
        // Auto-release via RPC
        const { data: result, error: rpcErr } = await supabase
          .rpc("process_escrow_release", { _escrow_id: escrow.id });

        if (rpcErr || result?.error) {
          console.error(`Failed to auto-release escrow ${escrow.id}:`, rpcErr || result?.error);
          errors++;
        } else {
          // Update job status to completed
          await supabase
            .from("jobs")
            .update({ status: "completed" })
            .eq("id", escrow.job_id);

          // Notify both parties
          await Promise.all([
            supabase.from("notifications").insert({
              user_id: escrow.payer_id,
              title: "⏰ Auto-Release Complete",
              message: "Payment has been automatically released after 48 hours.",
              type: "escrow",
              metadata: { escrow_id: escrow.id, job_id: escrow.job_id },
            }),
            supabase.from("notifications").insert({
              user_id: escrow.payee_id,
              title: "💸 Payment Auto-Released",
              message: "Payment has been automatically released to your wallet.",
              type: "escrow",
              metadata: { escrow_id: escrow.id, job_id: escrow.job_id },
            }),
          ]);

          released++;
          console.log(`Auto-released escrow ${escrow.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, released, errors, checked: escrows?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-release cron error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Auto-release failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
