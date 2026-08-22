import { demoAdapter } from "@/scrapers/adapters/demoAdapter";
import { DEMO_REFERENCE_PRICES } from "@/scrapers/adapters/demoReferencePrices";
import { normalizeListing } from "@/scrapers/normalize";
import { scoreListing } from "@/lib/scoring";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { DealScoreBreakdown, Listing } from "@/types/listing";
import { IDF_DEPARTEMENTS } from "@/lib/idf";

export interface RankedListing {
  listing: Listing;
  score: DealScoreBreakdown;
}

export type DataMode = "live" | "demo";

export interface RankedListingsResult {
  mode: DataMode;
  items: RankedListing[];
}

function dbRowToListing(row: Database["public"]["Tables"]["listings"]["Row"]): Listing {
  return {
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    title: row.title,
    commune: row.commune,
    postalCode: row.postal_code,
    inseeCode: row.insee_code,
    propertyType: row.property_type,
    priceEur: row.price_eur,
    surfaceM2: row.surface_m2,
    rooms: row.rooms,
    condition: row.condition,
    constructionYear: row.construction_year,
    floor: row.floor,
    hasElevator: row.has_elevator,
    description: row.description,
    publishedAt: row.published_at ?? row.scraped_at,
    scrapedAt: row.scraped_at,
    latitude: row.latitude,
    longitude: row.longitude,
    contact: {
      agencyName: row.contact_agency_name,
      agentName: row.contact_agent_name,
      email: row.contact_email,
      phone: row.contact_phone,
    },
  };
}

function dbRowToScore(row: Database["public"]["Tables"]["deal_scores"]["Row"]): DealScoreBreakdown {
  return {
    listingId: row.listing_id,
    pricePerM2: row.price_per_m2,
    referencePricePerM2: row.reference_price_per_m2,
    discountRatio: row.discount_ratio,
    renovationCostEstimate: row.renovation_cost_estimate,
    estimatedResaleValue: row.estimated_resale_value,
    totalProjectCost: row.total_project_cost,
    projectedMargin: row.projected_margin,
    marginRatio: row.margin_ratio,
    confidence: row.confidence,
    score: row.score,
  };
}

async function getLiveRankedListings(): Promise<RankedListing[]> {
  if (!supabase) throw new Error("Supabase non configuré");

  const [{ data: listingRows, error: listingsError }, { data: scoreRows, error: scoresError }] =
    await Promise.all([
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
      supabase.from("deal_scores").select("*"),
    ]);

  if (listingsError) throw listingsError;
  if (scoresError) throw scoresError;

  const scoresByListingId = new Map((scoreRows ?? []).map((row) => [row.listing_id, row]));

  const items: RankedListing[] = [];
  for (const row of listingRows ?? []) {
    const scoreRow = scoresByListingId.get(row.id);
    if (!scoreRow) continue; // pas encore de prix de référence disponible pour cette commune
    items.push({ listing: dbRowToListing(row), score: dbRowToScore(scoreRow) });
  }

  return items.sort((a, b) => b.score.score - a.score.score);
}

async function getDemoRankedListings(): Promise<RankedListing[]> {
  const raw = await demoAdapter.fetchListings({ departements: [...IDF_DEPARTEMENTS] });
  const items: RankedListing[] = [];

  for (const rawListing of raw) {
    const listing = normalizeListing(rawListing);
    const reference = DEMO_REFERENCE_PRICES.find(
      (r) => r.inseeCode === listing.inseeCode && r.propertyType === listing.propertyType,
    );
    if (!reference) continue;
    items.push({ listing, score: scoreListing(listing, reference) });
  }

  return items.sort((a, b) => b.score.score - a.score.score);
}

/**
 * Charge les annonces classées par score de décote/marge. Utilise Supabase
 * si configuré (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY), sinon bascule en
 * mode démonstration (données générées localement, aucun réseau).
 */
export async function getRankedListings(): Promise<RankedListingsResult> {
  if (supabase) {
    try {
      return { mode: "live", items: await getLiveRankedListings() };
    } catch (error) {
      console.error("Échec du chargement depuis Supabase, repli en mode démonstration.", error);
    }
  }
  return { mode: "demo", items: await getDemoRankedListings() };
}
