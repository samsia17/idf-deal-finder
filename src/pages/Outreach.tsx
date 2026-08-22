import { useEffect, useState } from "react";
import {
  addAvailabilitySlot,
  listAvailabilitySlots,
  listOutreachMessages,
  removeAvailabilitySlot,
} from "@/lib/outreach/store";
import { supabase } from "@/lib/supabase/client";
import type { AvailabilitySlotRecord, OutreachMessageRecord } from "@/lib/outreach/types";

const STATUS_LABELS: Record<OutreachMessageRecord["status"], string> = {
  draft: "Brouillon",
  queued: "En file",
  sent: "Envoyé",
  failed: "Échec",
  replied: "Réponse reçue",
};

const STATUS_STYLES: Record<OutreachMessageRecord["status"], string> = {
  draft: "bg-neutral-100 text-neutral-600",
  queued: "bg-amber-100 text-amber-800",
  sent: "bg-brand-100 text-brand-700",
  failed: "bg-red-100 text-red-700",
  replied: "bg-blue-100 text-blue-700",
};

function AvailabilityPanel() {
  const [slots, setSlots] = useState<AvailabilitySlotRecord[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const refresh = () => listAvailabilitySlots().then(setSlots);
  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    if (!start || !end) return;
    await addAvailabilitySlot(new Date(start).toISOString(), new Date(end).toISOString());
    setStart("");
    setEnd("");
    refresh();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Mes disponibilités pour les visites</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Créneaux proposés automatiquement aux agences lors de la prise de contact.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-xs text-neutral-500">Début</label>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500">Fin</label>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          onClick={handleAdd}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Ajouter
        </button>
      </div>

      <ul className="mt-3 space-y-1">
        {slots.map((slot) => (
          <li key={slot.id} className="flex items-center justify-between text-sm">
            <span className={slot.isBooked ? "text-neutral-400 line-through" : "text-neutral-700"}>
              {new Date(slot.startsAt).toLocaleString("fr-FR")} → {new Date(slot.endsAt).toLocaleTimeString("fr-FR")}
              {slot.isBooked && " (réservé)"}
            </span>
            <button
              onClick={() => removeAvailabilitySlot(slot.id).then(refresh)}
              className="text-xs text-red-600 hover:underline"
            >
              Retirer
            </button>
          </li>
        ))}
        {slots.length === 0 && <li className="text-sm text-neutral-400">Aucun créneau renseigné.</li>}
      </ul>
    </div>
  );
}

function AutoPilotPanel() {
  const [running, setRunning] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setResultText(null);
    try {
      if (!supabase) {
        setResultText(
          "Mode démonstration : le pilote automatique nécessite Supabase configuré (les Edge Functions ne tournent pas en local statique).",
        );
        return;
      }
      const { data, error } = await supabase.functions.invoke("auto-outreach", { body: {} });
      if (error) throw error;
      setResultText(`${data.processed} annonce(s) traitée(s).`);
    } catch (err) {
      setResultText(`Erreur : ${err instanceof Error ? err.message : "inconnue"}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Pilote automatique</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Contacte automatiquement, sans validation manuelle, toutes les annonces "nouvelles" dont le score
        dépasse le seuil configuré (AUTO_OUTREACH_MIN_SCORE, 70 par défaut). Se déclenche normalement sur un
        Cron — voir README pour la planification. Le bouton ci-dessous permet un déclenchement ponctuel.
      </p>
      <button
        onClick={handleRun}
        disabled={running}
        className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50"
      >
        {running ? "Exécution..." : "Lancer maintenant"}
      </button>
      {resultText && <p className="mt-2 text-xs text-neutral-600">{resultText}</p>}
    </div>
  );
}

export function Outreach() {
  const [messages, setMessages] = useState<OutreachMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOutreachMessages()
      .then(setMessages)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Prises de contact</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Historique des emails envoyés aux agences et gestion des disponibilités de visite.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <AvailabilityPanel />
        <AutoPilotPanel />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-neutral-900">Messages</h2>
      {loading && <p className="mt-2 text-sm text-neutral-500">Chargement...</p>}
      <div className="mt-2 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-900">{m.listingTitle}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status]}`}>
                {STATUS_LABELS[m.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              À {m.toEmail} · {new Date(m.createdAt).toLocaleString("fr-FR")}
            </p>
            {m.errorMessage && <p className="mt-1 text-xs text-red-600">{m.errorMessage}</p>}
          </div>
        ))}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-neutral-400">Aucune prise de contact pour le moment.</p>
        )}
      </div>
    </div>
  );
}
