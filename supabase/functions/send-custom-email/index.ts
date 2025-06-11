import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailTemplate {
  to: string[];
  subject: string;
  html: string;
  text?: string;
  from_type?: "noreply" | "news" | "support";
}

const FROM_EMAILS = {
  noreply: "noreply@synapsegame.ai",
  news: "news@synapsegame.ai",
  support: "support@synapsegame.ai",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Resend API key not configured");
    }

    const { template }: { template: EmailTemplate } = await req.json();

    if (!template || !template.to || !template.subject || !template.html) {
      throw new Error("Missing required email template fields");
    }

    const fromEmail = FROM_EMAILS[template.from_type || "noreply"];

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message}`);
    }

    const result = await response.json();
    console.log("📧 Email sent successfully:", result.id);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("📧 Failed to send email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
