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
    // Auth validation
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

    // Verify caller
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .maybeSingle();

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the notification owner can trigger their own email
    if (notification.user_id !== claimsData.claims.sub) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already sent
    if (notification.is_email_sent) {
      return new Response(JSON.stringify({ skipped: true, reason: "already_sent" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile and check email preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, email_notifications_enabled, company_name, account_type")
      .eq("user_id", notification.user_id)
      .maybeSingle();

    if (!profile?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.email_notifications_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "email_disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = profile.account_type === 'company'
      ? (profile.company_name || profile.full_name)
      : profile.full_name;

    const subjectMap: Record<string, string> = {
      job_application: "You have a new job application on QUT",
      job_accepted: "Your job has been accepted",
      application_accepted: "Your application has been accepted!",
      application_declined: "Update on your job application",
      escrow: "Payment secured — You may begin work",
      job_completed: "Job completed successfully",
      dispute: "Dispute update on your job",
      job_cancelled: "Job cancellation notice",
      verification: "Verification update",
      general: "New notification from QUT",
    };

    const subject = subjectMap[notification.type] || subjectMap.general;
    const jobId = notification.metadata?.job_id;
    const viewUrl = jobId
      ? `https://taskit-all-done.lovable.app/my-jobs`
      : `https://taskit-all-done.lovable.app/profile?tab=alerts`;

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#1a1a2e;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">QUT</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#71717a;font-size:14px;">Hi ${userName},</p>
          <h2 style="margin:0 0 16px;color:#18181b;font-size:18px;font-weight:600;">${notification.title}</h2>
          <p style="margin:0 0 24px;color:#3f3f46;font-size:14px;line-height:1.6;">${notification.message}</p>
          <a href="${viewUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">View Job</a>
        </td></tr>
        <tr><td style="padding:20px 32px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">QUT — Your trusted marketplace for services</p>
          <p style="margin:4px 0 0;color:#a1a1aa;font-size:11px;">You received this because you have email notifications enabled.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Attempt real email delivery via Resend API (if configured)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;

    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "QUT <notifications@taskit-all-done.lovable.app>",
            to: [profile.email],
            subject,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log(`Email sent to ${profile.email}: ${subject}`);
        } else {
          const errBody = await emailRes.text();
          console.error(`Resend API error: ${emailRes.status} - ${errBody}`);
        }
      } catch (emailErr) {
        console.error("Email delivery error:", emailErr);
      }
    } else {
      console.log(`Email prepared for ${profile.email}: ${subject} (no RESEND_API_KEY configured)`);
    }

    // Mark notification as email processed (even if delivery failed, to prevent retries)
    await supabase
      .from("notifications")
      .update({
        delivery_method: "both",
        is_email_sent: emailSent,
        email_sent_at: emailSent ? new Date().toISOString() : null,
      } as any)
      .eq("id", notification_id);

    return new Response(
      JSON.stringify({
        success: true,
        email: profile.email,
        subject,
        delivered: emailSent,
        note: emailSent ? "Email delivered via Resend" : "Email prepared. Add RESEND_API_KEY secret for delivery.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process email notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
