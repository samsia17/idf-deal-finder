import { Link, useParams } from "react-router-dom";
import { useRankedListings } from "@/lib/RankedListingsContext";
import { DealScoreBadge } from "@/components/DealScoreBadge";
import {
  CONDITION_LABELS,
  CONFIDENCE_LABELS,
  formatEur,
  formatEurPerM2,
  formatPercent,
} from "@/lib/format";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div
        className={`mt-1 text-lg font-semibold ${
          tone === "positive" ? "text-brand-600" : tone === "negative" ? "text-red-600" : "text-neutral-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { loading, result } = useRankedListings();

  if (loading) return <p className="text-sm text-neutral-500">Chargement...</p>;

  const item = result?.items.find((i) => i.listing.id === id);
  if (!item) {
    return (
      <div>
        <p className="text-sm text-neutral-600">Annonce introuvable (rechargement de la page ?).</p>
        <Link to="/" className="text-sm text-brand-600 underline">
          Retour aux annonces
        </Link>
      </div>
    );
  }

  const { listing, score } = item;

  return (
    <div className="max-w-3xl">
      <Link to="/" className="text-sm text-brand-600 underline">
        ← Retour aux annonces
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{listing.title}</h1>
          <p className="text-sm text-neutral-500">
            {listing.commune} ({listing.postalCode}) · {CONDITION_LABELS[listing.condition]} ·{" "}
            {listing.surfaceM2} m² · {listing.rooms ?? "?"} pièces
          </p>
        </div>
        <DealScoreBadge score={score.score} />
      </div>

      <p className="mt-3 text-sm text-neutral-700">{listing.description}</p>

      <h2 className="mt-6 text-sm font-semibold text-neutral-900">Analyse financière (estimations)</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {CONFIDENCE_LABELS[score.confidence]} — basée sur un échantillon de transactions DVF pour cette
        commune. Coûts travaux et prix de revente estimés à valider en visite et via un devis réel.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Prix affiché" value={formatEur(listing.priceEur)} />
        <Stat label="Prix au m²" value={formatEurPerM2(score.pricePerM2)} />
        <Stat label="Référence marché" value={formatEurPerM2(score.referencePricePerM2)} />
        <Stat
          label="Décote vs marché"
          value={formatPercent(score.discountRatio)}
          tone={score.discountRatio > 0 ? "positive" : "negative"}
        />
        <Stat label="Travaux estimés" value={formatEur(score.renovationCostEstimate)} />
        <Stat label="Coût total projet" value={formatEur(score.totalProjectCost)} />
        <Stat label="Valeur de revente estimée" value={formatEur(score.estimatedResaleValue)} />
        <Stat
          label="Marge projetée"
          value={formatEur(score.projectedMargin)}
          tone={score.projectedMargin > 0 ? "positive" : "negative"}
        />
        <Stat
          label="Marge / coût total"
          value={formatPercent(score.marginRatio)}
          tone={score.marginRatio > 0 ? "positive" : "negative"}
        />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-neutral-900">Contact agence</h2>
      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
        <p>{listing.contact.agencyName ?? "Agence inconnue"}</p>
        {listing.contact.email && <p className="text-neutral-500">{listing.contact.email}</p>}
        {listing.contact.phone && <p className="text-neutral-500">{listing.contact.phone}</p>}
        <a
          href={listing.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-brand-600 underline"
        >
          Voir l'annonce originale
        </a>
      </div>

      <Link
        to={`/contacts/nouveau?listingId=${listing.id}`}
        className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Préparer une prise de contact
      </Link>
    </div>
  );
}
