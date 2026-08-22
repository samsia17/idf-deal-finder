export type PropertyType = "appartement" | "maison";

export type Condition =
  | "neuf"
  | "bon_etat"
  | "travaux_a_prevoir"
  | "a_renover"
  | "inconnu";

export interface ListingContact {
  agencyName: string | null;
  agentName: string | null;
  email: string | null;
  phone: string | null;
}

export interface Listing {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  commune: string;
  postalCode: string;
  inseeCode: string | null;
  propertyType: PropertyType;
  priceEur: number;
  surfaceM2: number;
  rooms: number | null;
  condition: Condition;
  constructionYear: number | null;
  floor: number | null;
  hasElevator: boolean | null;
  description: string;
  publishedAt: string;
  scrapedAt: string;
  latitude: number | null;
  longitude: number | null;
  contact: ListingContact;
}

/** Prix de référence marché pour une commune, issu des transactions DVF réelles. */
export interface ReferencePrice {
  inseeCode: string;
  commune: string;
  postalCode: string;
  propertyType: PropertyType;
  medianPricePerM2: number;
  sampleSize: number;
  periodStart: string;
  periodEnd: string;
  source: "dvf";
}

export interface DealScoreBreakdown {
  listingId: string;
  pricePerM2: number;
  referencePricePerM2: number;
  discountRatio: number;
  renovationCostEstimate: number;
  estimatedResaleValue: number;
  totalProjectCost: number;
  projectedMargin: number;
  marginRatio: number;
  confidence: "faible" | "moyenne" | "haute";
  score: number;
}
