import type { Condition, PropertyType } from "@/types/listing";

/** Champs qu'un adaptateur de source doit produire, avant normalisation. */
export interface RawListingInput {
  source: string;
  sourceUrl: string;
  title: string;
  commune: string;
  postalCode: string;
  inseeCode?: string | null;
  propertyType: PropertyType;
  priceEur: number;
  surfaceM2: number;
  rooms?: number | null;
  /** Texte libre (description) utilisé pour déduire l'état du bien si `condition` n'est pas fourni. */
  description?: string;
  condition?: Condition;
  constructionYear?: number | null;
  floor?: number | null;
  hasElevator?: boolean | null;
  publishedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact?: {
    agencyName?: string | null;
    agentName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

export interface SearchArea {
  /** Codes départementaux Île-de-France ciblés, ex: ["75", "92", "93"]. */
  departements: string[];
  maxPriceEur?: number;
  propertyTypes?: PropertyType[];
}

/**
 * Interface commune à toute source d'annonces (scraping best-effort, API
 * partenaire, ou import manuel). Chaque adaptateur est responsable de
 * respecter le robots.txt et les CGU du site qu'il interroge — voir
 * src/scrapers/README.md.
 */
export interface ListingSourceAdapter {
  name: string;
  fetchListings(area: SearchArea): Promise<RawListingInput[]>;
}
