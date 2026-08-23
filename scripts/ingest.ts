/**
 * Récupère les annonces via les adaptateurs configurés, calcule leur score de
 * décote/marge par rapport aux prix de référence DVF déjà importés, et
 * enregistre le tout en base.
 *
 * Usage : npm run ingest
 */
import { demoAdapter } from "../src/scrapers/adapters/demoAdapter";
import { createJinkaAdapter } from "../src/scrapers/adapters/jinkaAdapter";
import { normalizeListing } from "../src/scrapers/normalize";
import type { ListingSourceAdapter } from "../src/scrapers/types";
import { scoreListing } from "../src/lib/scoring";
import { getReferencePrice } from "../src/lib/referencePrices";
import { IDF_DEPARTEMENTS } from "../src/lib/idf";
import { createAdminClient } from "./supabaseAdmin";

// Ajoute ici tes adaptateurs réels une fois implémentés (voir
// src/scrapers/adapters/siteAdapter.template.ts).
function buildAdapters(): ListingSourceAdapter[] {
  const adapters: ListingSourceAdapter[] = [];

  const jinkaEmail = process.env.JINKA_EMAIL;
  const jinkaPassword = process.env.JINKA_PASSWORD;
  if (jinkaEmail && jinkaPassword) {
    adapters.push(createJinkaAdapter({ email: jinkaEmail, password: jinkaPassword }));
  } else {
    console.log("Jinka non configuré (JINKA_EMAIL/JINKA_PASSWORD absents) — source ignorée.");
  }

  // L'adaptateur de démo (données factices) ne tourne que s'il n'y a aucune
  // vraie source configurée, pour ne pas polluer une base réelle.
  if (adapters.length === 0) {
    adapters.push(demoAdapter);
  }

  return adapters;
}

function getOwnerUserId(): string {
  const userId = process.env.APP_OWNER_USER_ID;
  if (!userId) {
    throw new Error(
      "APP_OWNER_USER_ID doit être défini (identifiant Supabase Auth du propriétaire des annonces — voir .env.example).",
    );
  }
  return userId;
}

async function main() {
  const admin = createAdminClient();
  const ownerUserId = getOwnerUserId();
  const area = { departements: [...IDF_DEPARTEMENTS] };
  const ADAPTERS = buildAdapters();

  let inserted = 0;
  let scored = 0;
  let unmatched = 0;

  for (const adapter of ADAPTERS) {
    console.log(`Source "${adapter.name}"...`);
    const raw = await adapter.fetchListings(area);
    console.log(`  ${raw.length} annonces récupérées`);

    for (const rawListing of raw) {
      const listing = normalizeListing(rawListing);

      const { data: upserted, error: upsertError } = await admin
        .from("listings")
        .upsert(
          {
            user_id: ownerUserId,
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
        console.warn(`  Échec insertion "${listing.title}": ${upsertError?.message}`);
        continue;
      }
      inserted++;

      const reference = await getReferencePrice(admin, {
        inseeCode: listing.inseeCode,
        commune: listing.commune,
        propertyType: listing.propertyType,
      });

      if (!reference) {
        unmatched++;
        continue;
      }

      const breakdown = scoreListing({ ...listing, id: upserted.id }, reference);
      const { error: scoreError } = await admin.from("deal_scores").upsert(
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
      if (scoreError) {
        console.warn(`  Échec calcul score "${listing.title}": ${scoreError.message}`);
        continue;
      }
      scored++;
    }
  }

  console.log(`Terminé : ${inserted} annonces enregistrées, ${scored} scorées, ${unmatched} sans prix de référence (commune absente de reference_prices — lance d'abord npm run import:dvf).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
