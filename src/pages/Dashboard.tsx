import { useMemo, useState } from "react";
import { useRankedListings } from "@/lib/RankedListingsContext";
import { ListingCard } from "@/components/ListingCard";

const MIN_SCORE_OPTIONS = [
  { value: 0, label: "Tous les scores" },
  { value: 40, label: "Score ≥ 40 (à creuser)" },
  { value: 70, label: "Score ≥ 70 (bonnes affaires)" },
];

export function Dashboard() {
  const { loading, error, result, refetch } = useRankedListings();
  const [communeFilter, setCommuneFilter] = useState("");
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => {
    if (!result) return [];
    return result.items.filter((item) => {
      if (item.score.score < minScore) return false;
      if (communeFilter && !item.listing.commune.toLowerCase().includes(communeFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [result, communeFilter, minScore]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Annonces classées</h1>
          <p className="text-sm text-neutral-500">
            Triées par potentiel de décote et de marge après travaux, par rapport au prix médian marché
            (données DVF) de chaque commune.
          </p>
        </div>
        {result && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              result.mode === "demo" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-700"
            }`}
          >
            {result.mode === "demo" ? "Mode démonstration" : "Connecté à Supabase"}
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filtrer par commune..."
          value={communeFilter}
          onChange={(e) => setCommuneFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        >
          {MIN_SCORE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={refetch}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100"
        >
          Rafraîchir
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500">Chargement...</p>}
      {error && <p className="text-sm text-red-600">Erreur : {error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-neutral-500">Aucune annonce ne correspond aux filtres.</p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <ListingCard key={item.listing.id} listing={item.listing} score={item.score} />
        ))}
      </div>
    </div>
  );
}
