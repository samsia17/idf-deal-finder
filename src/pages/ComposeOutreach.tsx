import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRankedListings } from "@/lib/RankedListingsContext";
import { generateOutreachEmail } from "@/lib/outreach/emailTemplate";
import { createOutreachMessage, listAvailabilitySlots, sendOutreachMessage } from "@/lib/outreach/store";
import type { AvailabilitySlotRecord } from "@/lib/outreach/types";

const SENDER_NAME = (import.meta.env.VITE_OUTREACH_SENDER_NAME as string | undefined) ?? "Votre nom";
const SENDER_PHONE = import.meta.env.VITE_OUTREACH_SENDER_PHONE as string | undefined;

export function ComposeOutreach() {
  const [params] = useSearchParams();
  const listingId = params.get("listingId");
  const navigate = useNavigate();
  const { result } = useRankedListings();

  const listing = useMemo(
    () => result?.items.find((i) => i.listing.id === listingId)?.listing,
    [result, listingId],
  );

  const [slots, setSlots] = useState<AvailabilitySlotRecord[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listAvailabilitySlots().then(setSlots);
  }, []);

  useEffect(() => {
    if (!listing) return;
    const upcoming = slots.filter((s) => !s.isBooked && new Date(s.startsAt) > new Date()).slice(0, 3);
    const email = generateOutreachEmail(
      listing,
      upcoming.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
      { name: SENDER_NAME, phone: SENDER_PHONE },
    );
    setSubject(email.subject);
    setBody(email.body);
  }, [listing, slots]);

  if (!listingId) {
    return <p className="text-sm text-neutral-600">Aucune annonce sélectionnée.</p>;
  }
  if (!listing) {
    return (
      <div>
        <p className="text-sm text-neutral-600">Annonce introuvable.</p>
        <Link to="/" className="text-sm text-brand-600 underline">
          Retour aux annonces
        </Link>
      </div>
    );
  }
  if (!listing.contact.email) {
    return (
      <div>
        <p className="text-sm text-neutral-600">
          Pas d'email de contact connu pour cette annonce — utilise le lien vers l'annonce originale pour
          contacter l'agence manuellement.
        </p>
        <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 underline">
          Voir l'annonce
        </a>
      </div>
    );
  }

  async function handleSend() {
    setSending(true);
    setErrorMessage(null);
    try {
      const message = await createOutreachMessage({
        listingId: listing!.id,
        listingTitle: listing!.title,
        toEmail: listing!.contact.email!,
        subject,
        body,
      });
      await sendOutreachMessage(message.id);
      setSentMessage("Message envoyé (ou simulé en mode démonstration).");
      setTimeout(() => navigate("/contacts"), 1200);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to={`/annonces/${listing.id}`} className="text-sm text-brand-600 underline">
        ← Retour à l'annonce
      </Link>
      <h1 className="mt-2 text-xl font-bold text-neutral-900">Prise de contact — {listing.title}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Destinataire : {listing.contact.agencyName ?? "Agence"} ({listing.contact.email})
      </p>

      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Cet email est rédigé automatiquement et se présente comme envoyé par un assistant pour ton compte.
        Relis-le avant envoi si tu veux l'ajuster. Gère tes créneaux depuis la page{" "}
        <Link to="/contacts" className="underline">
          Prises de contact
        </Link>
        .
      </div>

      <label className="mt-4 block text-sm font-medium text-neutral-700">Objet</label>
      <input
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />

      <label className="mt-3 block text-sm font-medium text-neutral-700">Message</label>
      <textarea
        className="mt-1 h-72 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
      {sentMessage && <p className="mt-2 text-sm text-brand-600">{sentMessage}</p>}

      <button
        onClick={handleSend}
        disabled={sending}
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {sending ? "Envoi..." : "Envoyer maintenant"}
      </button>
    </div>
  );
}
