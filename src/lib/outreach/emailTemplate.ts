import type { Listing } from "@/types/listing";

export interface OutreachSender {
  name: string;
  phone?: string;
}

export interface AvailabilitySlot {
  startsAt: string; // ISO
  endsAt: string; // ISO
}

const slotFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSlot(slot: AvailabilitySlot): string {
  return slotFormatter.format(new Date(slot.startsAt));
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

/**
 * Génère un email de prise de contact avec l'agence, se présentant
 * explicitement comme envoyé par un assistant pour le compte de l'acheteur
 * (transparence — pas d'usurpation d'identité humaine), et proposant des
 * créneaux de visite concrets.
 */
export function generateOutreachEmail(
  listing: Listing,
  slots: AvailabilitySlot[],
  sender: OutreachSender,
): OutreachEmail {
  const subject = `Demande de visite — ${listing.title} (${listing.commune})`;

  const slotLines = slots.length
    ? slots.map((s) => `- ${formatSlot(s)}`).join("\n")
    : "- (à préciser selon vos disponibilités)";

  const body = `Bonjour,

Je vous contacte au sujet de votre annonce "${listing.title}" à ${listing.commune} (${listing.postalCode}), ${listing.surfaceM2} m² à ${new Intl.NumberFormat("fr-FR").format(listing.priceEur)} €, référence : ${listing.sourceUrl}

Ce bien m'intéresse et je souhaiterais organiser une visite. Voici mes disponibilités :
${slotLines}

N'hésitez pas à me proposer un autre créneau si aucun ne convient.

Cordialement,
${sender.name}${sender.phone ? `\n${sender.phone}` : ""}

---
Ce message a été rédigé par un assistant automatisé pour le compte de ${sender.name}, qui reste seul décisionnaire. Vous pouvez répondre directement à cet email.`;

  return { subject, body };
}
