// Supabase Edge Function : envoie réellement un email de prise de contact via
// Resend, et met à jour outreach_messages en conséquence. C'est la seule
// brique qui touche un vrai serveur tiers (Resend) et détient la clé API —
// jamais exposée côté navigateur.
//
// Déploiement : supabase functions deploy send-outreach-email
// Secrets requis : supabase secrets set RESEND_API_KEY=... OUTREACH_FROM_EMAIL="..."
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, handleCorsPreflight } from "../_shared/cors.ts";

const RESEND_API_URL = "https://api.resend.com/emails";

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const { outreachMessageId } = await req.json();
  if (!outreachMessageId) {
    return new Response(JSON.stringify({ error: "outreachMessageId requis" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("OUTREACH_FROM_EMAIL");

  if (!resendApiKey || !fromEmail) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY et OUTREACH_FROM_EMAIL doivent être configurés (secrets Supabase)." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: message, error: fetchError } = await admin
    .from("outreach_messages")
    .select("*")
    .eq("id", outreachMessageId)
    .single();

  if (fetchError || !message) {
    return new Response(JSON.stringify({ error: "Message introuvable" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendResponse = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: message.to_email,
      subject: message.subject,
      text: message.body,
    }),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    await admin
      .from("outreach_messages")
      .update({ status: "failed", error_message: errorText.slice(0, 500) })
      .eq("id", outreachMessageId);
    return new Response(JSON.stringify({ error: `Échec Resend: ${errorText}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin
    .from("outreach_messages")
    .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
    .eq("id", outreachMessageId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
