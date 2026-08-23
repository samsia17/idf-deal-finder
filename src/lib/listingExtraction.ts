import * as cheerio from "cheerio";
import type { PropertyType } from "@/types/listing";

export interface ExtractedListingFields {
  title: string | null;
  description: string | null;
  priceEur: number | null;
  surfaceM2: number | null;
  rooms: number | null;
  commune: string | null;
  postalCode: string | null;
  propertyType: PropertyType | null;
  contactEmail: string | null;
  contactPhone: string | null;
  agencyName: string | null;
}

const EMPTY_RESULT: ExtractedListingFields = {
  title: null,
  description: null,
  priceEur: null,
  surfaceM2: null,
  rooms: null,
  commune: null,
  postalCode: null,
  propertyType: null,
  contactEmail: null,
  contactPhone: null,
  agencyName: null,
};

/** "350 000 €", "350.000€", "350000 EUR" → 350000. Rejette les valeurs non plausibles pour un bien IDF. */
export function parseFrenchPrice(text: string): number | null {
  const cleaned = text.replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
  const match = cleaned.match(/(\d{4,9})\s?(€|eur)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 10_000 && value <= 50_000_000 ? value : null;
}

/** "61 m²", "61m2", "61 m2" → 61. */
export function parseSurface(text: string): number | null {
  const match = text.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s?m[²2]/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return value > 0 && value < 2000 ? value : null;
}

const IDF_POSTAL_CODE_RE = /\b(75\d{3}|77\d{3}|78\d{3}|9[1-5]\d{3})\b/;

function guessPropertyType(text: string): PropertyType | null {
  const lower = text.toLowerCase();
  if (/\bmaison\b/.test(lower)) return "maison";
  if (/\bappartement\b/.test(lower)) return "appartement";
  return null;
}

/** Cherche récursivement une valeur par nom de clé dans un objet JSON-LD (structure très variable selon les sites). */
function findInJsonLd(node: unknown, keys: string[]): unknown {
  if (node == null || typeof node !== "object") return undefined;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (keys.some((k) => k.toLowerCase() === key.toLowerCase())) return value;
  }
  for (const value of Object.values(node as Record<string, unknown>)) {
    if (typeof value === "object") {
      const found = findInJsonLd(value, keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Extrait le maximum d'informations d'une page d'annonce à partir de son
 * HTML : données structurées JSON-LD (schema.org), balises Open Graph, puis
 * repli par expressions régulières sur le texte brut. Best-effort : les
 * champs non trouvés restent `null`, à compléter manuellement.
 */
export function extractListingFromHtml(html: string): ExtractedListingFields {
  const $ = cheerio.load(html);
  const result: ExtractedListingFields = { ...EMPTY_RESULT };

  // 1. JSON-LD (schema.org) — la source la plus fiable quand disponible.
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const graph = (candidate as { "@graph"?: unknown[] })["@graph"];
        const nodes = Array.isArray(graph) ? graph : [candidate];
        for (const node of nodes) {
          result.title ??= toText(findInJsonLd(node, ["name", "headline"]));
          result.description ??= toText(findInJsonLd(node, ["description"]));
          result.priceEur ??= toNumber(findInJsonLd(node, ["price", "lowPrice"]));
          result.surfaceM2 ??= toNumber(findInJsonLd(node, ["floorSize", "value"]));
          result.rooms ??= toNumber(findInJsonLd(node, ["numberOfRooms", "numberOfRoomsTotal"]));
          result.commune ??= toText(findInJsonLd(node, ["addressLocality"]));
          result.postalCode ??= toText(findInJsonLd(node, ["postalCode"]));
          result.contactEmail ??= toText(findInJsonLd(node, ["email"]));
          result.contactPhone ??= toText(findInJsonLd(node, ["telephone", "phone"]));
        }
      }
    } catch {
      // JSON-LD malformé sur cette page — on ignore ce bloc et on continue avec les autres sources.
    }
  });

  // 2. Open Graph.
  result.title ??= toText($('meta[property="og:title"]').attr("content"));
  result.description ??= toText($('meta[property="og:description"]').attr("content"));
  result.agencyName ??= toText($('meta[property="og:site_name"]').attr("content"));

  // 3. Repli texte brut (titre + description + corps de page).
  const fallbackText = [result.title, result.description, $("body").text()].filter(Boolean).join(" ");
  result.priceEur ??= parseFrenchPrice(fallbackText);
  result.surfaceM2 ??= parseSurface(fallbackText);
  result.postalCode ??= fallbackText.match(IDF_POSTAL_CODE_RE)?.[1] ?? null;
  result.propertyType = guessPropertyType(fallbackText);

  const mailtoHref = $('a[href^="mailto:"]').first().attr("href");
  result.contactEmail ??= mailtoHref ? mailtoHref.replace(/^mailto:/i, "").split("?")[0] : null;

  return result;
}
