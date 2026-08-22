import type { Listing } from "@/types/listing";
import { inferConditionFromText } from "./condition";
import type { RawListingInput } from "./types";

export function normalizeListing(raw: RawListingInput, now: Date = new Date()): Listing {
  return {
    id: crypto.randomUUID(),
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    title: raw.title.trim(),
    commune: raw.commune.trim(),
    postalCode: raw.postalCode.trim(),
    inseeCode: raw.inseeCode ?? null,
    propertyType: raw.propertyType,
    priceEur: raw.priceEur,
    surfaceM2: raw.surfaceM2,
    rooms: raw.rooms ?? null,
    condition: raw.condition ?? inferConditionFromText(raw.description ?? ""),
    constructionYear: raw.constructionYear ?? null,
    floor: raw.floor ?? null,
    hasElevator: raw.hasElevator ?? null,
    description: raw.description ?? "",
    publishedAt: raw.publishedAt ?? now.toISOString(),
    scrapedAt: now.toISOString(),
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    contact: {
      agencyName: raw.contact?.agencyName ?? null,
      agentName: raw.contact?.agentName ?? null,
      email: raw.contact?.email ?? null,
      phone: raw.contact?.phone ?? null,
    },
  };
}
