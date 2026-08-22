import type { Condition, DealScoreBreakdown, Listing, ReferencePrice } from "@/types/listing";

/**
 * Hypothèses de marché (ordres de grandeur France/IDF, ancien).
 * Ce sont des estimations génériques à ajuster selon ta connaissance terrain —
 * pas des données garanties. Le coût travaux réel dépend fortement de l'état
 * réel du bien, à valider en visite.
 */
export const DEFAULT_ASSUMPTIONS = {
  /** Coût de travaux estimé en €/m² selon l'état déclaré de l'annonce. */
  renovationCostPerM2: {
    neuf: 0,
    bon_etat: 150,
    travaux_a_prevoir: 600,
    a_renover: 1300,
    inconnu: 500,
  } satisfies Record<Condition, number>,
  /** Frais de notaire à l'achat (ancien). */
  notaryFeeRate: 0.075,
  /** Frais d'agence estimés à la revente. */
  resaleAgencyFeeRate: 0.04,
  /** Coût de portage (intérêts, charges) pendant la durée du projet. */
  holdingCostRate: 0.015,
  /** Seuils d'écart de prix (vs référence marché) utilisés pour noter la décote. */
  discountRatioForMaxScore: 0.3,
  /** Seuil de marge (vs coût total du projet) utilisé pour noter la marge. */
  marginRatioForMaxScore: 0.25,
};

export function pricePerM2(listing: Pick<Listing, "priceEur" | "surfaceM2">): number {
  if (listing.surfaceM2 <= 0) {
    throw new Error("surfaceM2 doit être positif pour calculer le prix au m²");
  }
  return listing.priceEur / listing.surfaceM2;
}

function confidenceFromSampleSize(sampleSize: number): DealScoreBreakdown["confidence"] {
  if (sampleSize >= 20) return "haute";
  if (sampleSize >= 5) return "moyenne";
  return "faible";
}

/**
 * Calcule le score de décote/marge d'une annonce par rapport à un prix de
 * référence marché (DVF) pour sa commune et son type de bien.
 */
export function scoreListing(
  listing: Listing,
  reference: ReferencePrice,
  assumptions = DEFAULT_ASSUMPTIONS,
): DealScoreBreakdown {
  const listingPricePerM2 = pricePerM2(listing);
  const referencePricePerM2 = reference.medianPricePerM2;

  const discountRatio = (referencePricePerM2 - listingPricePerM2) / referencePricePerM2;

  const renovationCostPerM2 = assumptions.renovationCostPerM2[listing.condition];
  const renovationCostEstimate = renovationCostPerM2 * listing.surfaceM2;

  const notaryFees = listing.priceEur * assumptions.notaryFeeRate;
  const holdingCosts = listing.priceEur * assumptions.holdingCostRate;
  const totalProjectCost = listing.priceEur + notaryFees + renovationCostEstimate + holdingCosts;

  // Hypothèse : après travaux, le bien se revend au prix médian marché de la
  // commune (le bien est remis "à niveau", sans supposer de prime au-delà du marché).
  const estimatedResaleValue = referencePricePerM2 * listing.surfaceM2;
  const netResaleProceeds = estimatedResaleValue * (1 - assumptions.resaleAgencyFeeRate);

  const projectedMargin = netResaleProceeds - totalProjectCost;
  const marginRatio = projectedMargin / totalProjectCost;

  const discountScore =
    40 * Math.max(0, Math.min(1, discountRatio / assumptions.discountRatioForMaxScore));
  const marginScore =
    45 * Math.max(0, Math.min(1, marginRatio / assumptions.marginRatioForMaxScore));
  const liquidityScore = 15 * Math.max(0, Math.min(1, reference.sampleSize / 20));

  const score = Math.round(Math.max(0, Math.min(100, discountScore + marginScore + liquidityScore)));

  return {
    listingId: listing.id,
    pricePerM2: listingPricePerM2,
    referencePricePerM2,
    discountRatio,
    renovationCostEstimate,
    estimatedResaleValue,
    totalProjectCost,
    projectedMargin,
    marginRatio,
    confidence: confidenceFromSampleSize(reference.sampleSize),
    score,
  };
}

/** Classe une liste d'annonces (déjà appariées à leur référence marché) par score décroissant. */
export function rankListings(
  pairs: Array<{ listing: Listing; reference: ReferencePrice }>,
  assumptions = DEFAULT_ASSUMPTIONS,
): DealScoreBreakdown[] {
  return pairs
    .map(({ listing, reference }) => scoreListing(listing, reference, assumptions))
    .sort((a, b) => b.score - a.score);
}
