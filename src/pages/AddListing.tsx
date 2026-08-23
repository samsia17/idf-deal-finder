import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/AuthContext";
import { useRankedListings } from "@/lib/RankedListingsContext";
import { addManualListing } from "@/lib/manualListing";
import type { Condition, PropertyType } from "@/types/listing";

const CONDITION_OPTIONS: Array<{ value: Condition | ""; label: string }> = [
  { value: "", label: "Deviner depuis la description" },
  { value: "neuf", label: "Neuf" },
  { value: "bon_etat", label: "Bon état" },
  { value: "travaux_a_prevoir", label: "Travaux à prévoir" },
  { value: "a_renover", label: "À rénover" },
];

export function AddListing() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { refetch } = useRankedListings();

  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [commune, setCommune] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("appartement");
  const [priceEur, setPriceEur] = useState("");
  const [surfaceM2, setSurfaceM2] = useState("");
  const [rooms, setRooms] = useState("");
  const [condition, setCondition] = useState<Condition | "">("");
  const [description, setDescription] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noReferenceWarning, setNoReferenceWarning] = useState(false);

  if (!supabase) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-neutral-900">Ajouter une annonce</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Cette fonctionnalité nécessite d'être connecté à Supabase (mode démonstration non supporté ici).
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    const price = Number(priceEur);
    const surface = Number(surfaceM2);
    if (!sourceUrl || !commune || !postalCode || !price || !surface) {
      setErrorMessage("Merci de remplir au moins le lien, la commune, le code postal, le prix et la surface.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setNoReferenceWarning(false);

    try {
      const result = await addManualListing(supabase!, session.user.id, {
        source: "manuel",
        sourceUrl,
        title: title || `${rooms ? `${rooms} pièces ` : ""}${surface} m² à ${commune}`,
        commune,
        postalCode,
        propertyType,
        priceEur: price,
        surfaceM2: surface,
        rooms: rooms ? Number(rooms) : null,
        condition: condition || undefined,
        description,
        contact: {
          agencyName: agencyName || null,
          email: contactEmail || null,
          phone: contactPhone || null,
        },
      });

      refetch();

      if (!result.scored) {
        setNoReferenceWarning(true);
        setSubmitting(false);
        return;
      }

      navigate(`/annonces/${result.listingId}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Échec de l'enregistrement");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-neutral-900">Ajouter une annonce</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Colle le lien d'une annonce que tu as repérée toi-même (Jinka, SeLoger, LeBonCoin...) et remplis les
        infos affichées dessus. Elle sera scorée et prise en charge par l'agent de contact comme les autres.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Lien de l'annonce *</label>
          <input
            type="url"
            required
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Titre (optionnel)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Généré automatiquement si vide"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Commune *</label>
            <input
              required
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              placeholder="ex: Montreuil"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Code postal *</label>
            <input
              required
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="93100"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Type de bien</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="appartement">Appartement</option>
              <option value="maison">Maison</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">État du bien</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition | "")}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {CONDITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Prix (€) *</label>
            <input
              type="number"
              required
              min="1"
              value={priceEur}
              onChange={(e) => setPriceEur(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Surface (m²) *</label>
            <input
              type="number"
              required
              min="1"
              value={surfaceM2}
              onChange={(e) => setSurfaceM2(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Pièces</label>
            <input
              type="number"
              min="1"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Colle le texte de l'annonce si tu veux — utilisé pour deviner l'état du bien si non précisé ci-dessus."
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <h2 className="pt-2 text-sm font-semibold text-neutral-900">Contact agence (optionnel)</h2>
        <p className="text-xs text-neutral-500">
          Sans email, cette annonce ne pourra pas être prise en charge par l'agent de contact automatique.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700">Nom de l'agence</label>
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Téléphone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Email de contact</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        {noReferenceWarning && (
          <p className="text-sm text-amber-700">
            Annonce enregistrée, mais aucun prix de référence trouvé pour "{commune}" — vérifie l'orthographe
            exacte de la commune (celle utilisée dans les données DVF). Elle n'apparaîtra pas dans le
            classement tant qu'un prix de référence n'est pas trouvé.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? "Enregistrement..." : "Enregistrer et scorer"}
        </button>
      </form>
    </div>
  );
}
