import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { PropertyType, ReferencePrice } from "@/types/listing";

function toReferencePrice(row: Database["public"]["Tables"]["reference_prices"]["Row"]): ReferencePrice {
  return {
    inseeCode: row.insee_code,
    commune: row.commune,
    postalCode: row.postal_code,
    propertyType: row.property_type,
    medianPricePerM2: row.median_price_m2,
    sampleSize: row.sample_size,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    source: "dvf",
  };
}

export interface ReferencePriceQuery {
  inseeCode?: string | null;
  commune: string;
  propertyType: PropertyType;
}

/**
 * Cherche le prix de référence marché le plus récent pour une commune et un
 * type de bien. Priorité au code INSEE (fiable) ; à défaut, correspondance
 * approximative par nom de commune (moins fiable — deux communes homonymes
 * dans des départements différents pourraient se confondre).
 */
export async function getReferencePrice(
  client: SupabaseClient<Database>,
  query: ReferencePriceQuery,
): Promise<ReferencePrice | null> {
  if (query.inseeCode) {
    const { data, error } = await client
      .from("reference_prices")
      .select("*")
      .eq("insee_code", query.inseeCode)
      .eq("property_type", query.propertyType)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return toReferencePrice(data);
  }

  const { data, error } = await client
    .from("reference_prices")
    .select("*")
    .ilike("commune", query.commune)
    .eq("property_type", query.propertyType)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toReferencePrice(data) : null;
}
