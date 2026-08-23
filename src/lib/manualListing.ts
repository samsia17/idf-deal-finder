import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { normalizeListing } from "@/scrapers/normalize";
import type { RawListingInput } from "@/scrapers/types";
import { scoreListing } from "@/lib/scoring";
import { getReferencePrice } from "@/lib/referencePrices";

export interface AddManualListingResult {
  listingId: string;
  scored: boolean;
}

/**
 * Enregistre une annonce saisie manuellement (URL trouvée par l'utilisateur
 * sur un site qu'on ne peut pas scraper automatiquement), calcule son score
 * si un prix de référence existe pour sa commune.
 */
export async function addManualListing(
  supabase: SupabaseClient<Database>,
  userId: string,
  raw: RawListingInput,
): Promise<AddManualListingResult> {
  const listing = normalizeListing(raw);

  const { data: upserted, error: upsertError } = await supabase
    .from("listings")
    .upsert(
      {
        id: listing.id,
        user_id: userId,
        source: listing.source,
        source_url: listing.sourceUrl,
        title: listing.title,
        commune: listing.commune,
        postal_code: listing.postalCode,
        insee_code: listing.inseeCode,
        property_type: listing.propertyType,
        price_eur: listing.priceEur,
        surface_m2: listing.surfaceM2,
        rooms: listing.rooms,
        condition: listing.condition,
        construction_year: listing.constructionYear,
        floor: listing.floor,
        has_elevator: listing.hasElevator,
        description: listing.description,
        published_at: listing.publishedAt,
        scraped_at: listing.scrapedAt,
        latitude: listing.latitude,
        longitude: listing.longitude,
        contact_agency_name: listing.contact.agencyName,
        contact_agent_name: listing.contact.agentName,
        contact_email: listing.contact.email,
        contact_phone: listing.contact.phone,
        status: "new",
      },
      { onConflict: "user_id,source_url" },
    )
    .select("id")
    .single();

  if (upsertError || !upserted) {
    throw upsertError ?? new Error("Échec de l'enregistrement de l'annonce");
  }

  const reference = await getReferencePrice(supabase, {
    inseeCode: listing.inseeCode,
    commune: listing.commune,
    propertyType: listing.propertyType,
  });

  if (!reference) {
    return { listingId: upserted.id, scored: false };
  }

  const breakdown = scoreListing({ ...listing, id: upserted.id }, reference);
  const { error: scoreError } = await supabase.from("deal_scores").upsert(
    {
      listing_id: upserted.id,
      price_per_m2: breakdown.pricePerM2,
      reference_price_per_m2: breakdown.referencePricePerM2,
      discount_ratio: breakdown.discountRatio,
      renovation_cost_estimate: breakdown.renovationCostEstimate,
      estimated_resale_value: breakdown.estimatedResaleValue,
      total_project_cost: breakdown.totalProjectCost,
      projected_margin: breakdown.projectedMargin,
      margin_ratio: breakdown.marginRatio,
      confidence: breakdown.confidence,
      score: breakdown.score,
    },
    { onConflict: "listing_id" },
  );

  if (scoreError) throw scoreError;

  return { listingId: upserted.id, scored: true };
}
