// Supabase Edge Function : pilote automatique de prise de contact.
//
// À chaque exécution (déclenchée par un Cron, voir README), cette fonction :
//  1. Cherche les annonces status='new' dont le score de décote/marge dépasse
//     AUTO_OUTREACH_MIN_SCORE (défaut 70).
//  2. Génère un email de visite (créneaux tirés de availability_slots non
//     réservés) et l'envoie via Resend.
//  3. Marque l'annonce contacted et journalise le message dans
//     outreach_messages.
//
// C'est la brique "automatisation complète" demandée : aucune validation
// humaine par message individuel. Le garde-fou reste le seuil de score et la
// désactivation de ce Cron à tout moment (voir README "Désactiver le pilote
// automatique").
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const MAX_SLOTS_PROPOSED = 3;

interface ListingRow {
  id: string;
  user_id: string;
  title: string;
  commune: string;
  postal_code: string;
  price_eur: number;
  surface_m2: number;
  source_url: string;
  contact_email: string | null;
}

function buildEmail(
  listing: ListingRow,
  slots: Array<{ starts_at: string }>,
  senderName: string,
  senderPhone: string | undefined,
): { subject: string; body: string } {
  const subject = `Demande de visite — ${listing.title} (${listing.commune})`;
  const slotLines = slots.length
    ? slots
        .map(
          (s) =>
            `- ${new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(s.starts_at))}`,
        )
        .join("\n")
    : "- (à préciser selon vos disponibilités)";

  const body = `Bonjour,

Je vous contacte au sujet de votre annonce "${listing.title}" à ${listing.commune} (${listing.postal_code}), ${listing.surface_m2} m² à ${new Intl.NumberFormat("fr-FR").format(listing.price_eur)} €, référence : ${listing.source_url}

Ce bien m'intéresse et je souhaiterais organiser une visite. Voici mes disponibilités :
${slotLines}

N'hésitez pas à me proposer un autre créneau si aucun ne convient.

Cordialement,
${senderName}${senderPhone ? `\n${senderPhone}` : ""}

---
Ce message a été rédigé et envoyé par un assistant automatisé pour le compte de ${senderName}, qui reste seul décisionnaire. Vous pouvez répondre directement à cet email.`;

  return { subject, body };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("OUTREACH_FROM_EMAIL");
  const senderName = Deno.env.get("OUTREACH_SENDER_NAME") ?? "L'acheteur";
  const senderPhone = Deno.env.get("OUTREACH_SENDER_PHONE") ?? undefined;
  const minScore = Number(Deno.env.get("AUTO_OUTREACH_MIN_SCORE") ?? "70");

  if (!resendApiKey || !fromEmail) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY et OUTREACH_FROM_EMAIL doivent être configurés." }),
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: candidates, error: candidatesError } = await admin
    .from("listings")
    .select("id,user_id,title,commune,postal_code,price_eur,surface_m2,source_url,contact_email,deal_scores!inner(score)")
    .eq("status", "new")
    .not("contact_email", "is", null)
    .gte("deal_scores.score", minScore);

  if (candidatesError) {
    return new Response(JSON.stringify({ error: candidatesError.message }), { status: 500 });
  }

  const results: Array<{ listingId: string; status: string }> = [];

  for (const listing of (candidates ?? []) as ListingRow[]) {
    const { data: slots } = await admin
      .from("availability_slots")
      .select("id,starts_at")
      .eq("user_id", listing.user_id)
      .eq("is_booked", false)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(MAX_SLOTS_PROPOSED);

    const email = buildEmail(listing, slots ?? [], senderName, senderPhone);

    const { data: outreachRow, error: insertError } = await admin
      .from("outreach_messages")
      .insert({
        user_id: listing.user_id,
        listing_id: listing.id,
        channel: "email",
        status: "queued",
        to_email: listing.contact_email!,
        subject: email.subject,
        body: email.body,
        proposed_slot_ids: (slots ?? []).map((s: { id: string }) => s.id),
      })
      .select("id")
      .single();

    if (insertError || !outreachRow) {
      results.push({ listingId: listing.id, status: `échec journalisation: ${insertError?.message}` });
      continue;
    }

    const resendResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: listing.contact_email, subject: email.subject, text: email.body }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      await admin
        .from("outreach_messages")
        .update({ status: "failed", error_message: errorText.slice(0, 500) })
        .eq("id", outreachRow.id);
      results.push({ listingId: listing.id, status: "échec envoi" });
      continue;
    }

    await admin
      .from("outreach_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", outreachRow.id);
    await admin.from("listings").update({ status: "contacted" }).eq("id", listing.id);

    results.push({ listingId: listing.id, status: "envoyé" });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
