import { Link } from "react-router-dom";
import { DealScoreBadge } from "./DealScoreBadge";
import { CONDITION_LABELS, formatEur, formatEurPerM2, formatPercent } from "@/lib/format";
import type { RankedListing } from "@/lib/rankedListings";

export function ListingCard({ listing, score }: RankedListing) {
  return (
    <Link
      to={`/annonces/${listing.id}`}
      className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-brand-500 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900">{listing.title}</h3>
          <p className="text-sm text-neutral-500">
            {listing.commune} ({listing.postalCode}) · {CONDITION_LABELS[listing.condition]}
          </p>
        </div>
        <DealScoreBadge score={score.score} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-neutral-400">Prix</div>
          <div className="font-medium">{formatEur(listing.priceEur)}</div>
        </div>
        <div>
          <div className="text-neutral-400">Prix/m² vs marché</div>
          <div className="font-medium">
            {formatEurPerM2(score.pricePerM2)}{" "}
            <span className={score.discountRatio > 0 ? "text-brand-600" : "text-neutral-500"}>
              ({formatPercent(score.discountRatio)})
            </span>
          </div>
        </div>
        <div>
          <div className="text-neutral-400">Marge estimée</div>
          <div className={`font-medium ${score.projectedMargin > 0 ? "text-brand-600" : "text-red-600"}`}>
            {formatEur(score.projectedMargin)}
          </div>
        </div>
      </div>
    </Link>
  );
}
