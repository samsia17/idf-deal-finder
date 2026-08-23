// Supabase Edge Function : récupère une page d'annonce à l'URL fournie et en
// extrait le maximum d'informations (données structurées JSON-LD/schema.org,
// Open Graph, repli par regex), pour préremplir le formulaire d'ajout manuel
// côté client.
//
// Volontairement server-side : la plupart des navigateurs bloqueraient un
// fetch cross-origin direct vers ces sites (CORS), et ça évite d'exposer
// l'origine réelle des requêtes. Reste soumis aux mêmes protections anti-bot
// que n'importe quelle requête HTTP simple — une page fortement protégée
// (Cloudflare, DataDome) peut échouer ; dans ce cas les champs reviennent à
// null et l'utilisateur complète à la main.
//
// La logique d'extraction est dupliquée depuis src/lib/listingExtraction.ts
// (types de runtime différents — Deno ici, Node/navigateur côté app) : garde
// les deux synchronisées si tu modifies l'une des deux.
import * as cheerio from "npm:cheerio@1.2.0";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

interface ExtractedListingFields {
  title: string | null;
  description: string | null;
  priceEur: number | null;
  surfaceM2: number | null;
  rooms: number | null;
  commune: string | null;
  postalCode: string | null;
  propertyType: "appartement" | "maison" | null;
  contactEmail: string | null;
  contactPhone: string | null;
  agencyName: string | null;
}

function parseFrenchPrice(text: string): number | null {
  const cleaned = text.replace(/\s/g, "").replace(/[.,](?=\d{3}\b)/g, "");
  const match = cleaned.match(/(\d{4,9})\s?(€|eur)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 10_000 && value <= 50_000_000 ? value : null;
}

function parseSurface(text: string): number | null {
  const match = text.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s?m[²2]/i);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return value > 0 && value < 2000 ? value : null;
}

const IDF_POSTAL_CODE_RE = /\b(75\d{3}|77\d{3}|78\d{3}|9[1-5]\d{3})\b/;

function guessPropertyType(text: string): "appartement" | "maison" | null {
  const lower = text.toLowerCase();
  if (/\bmaison\b/.test(lower)) return "maison";
  if (/\bappartement\b/.test(lower)) return "appartement";
  return null;
}

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

function extractListingFromHtml(html: string): ExtractedListingFields {
  const $ = cheerio.load(html);
  const result: ExtractedListingFields = {
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

  $('script[type="application/ld+json"]').each((_i: number, el: unknown) => {
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
      // JSON-LD malformé — on ignore ce bloc.
    }
  });

  result.title ??= toText($('meta[property="og:title"]').attr("content"));
  result.description ??= toText($('meta[property="og:description"]').attr("content"));
  result.agencyName ??= toText($('meta[property="og:site_name"]').attr("content"));

  const fallbackText = [result.title, result.description, $("body").text()].filter(Boolean).join(" ");
  result.priceEur ??= parseFrenchPrice(fallbackText);
  result.surfaceM2 ??= parseSurface(fallbackText);
  result.postalCode ??= fallbackText.match(IDF_POSTAL_CODE_RE)?.[1] ?? null;
  result.propertyType = guessPropertyType(fallbackText);

  const mailtoHref = $('a[href^="mailto:"]').first().attr("href");
  result.contactEmail ??= mailtoHref ? mailtoHref.replace(/^mailto:/i, "").split("?")[0] : null;

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "url requis" }), { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Impossible de récupérer la page : ${error instanceof Error ? error.message : error}` }),
      { status: 502 },
    );
  }

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: `La page a répondu ${response.status} — probablement bloquée (anti-bot) ou lien invalide.` }),
      { status: 502 },
    );
  }

  const html = await response.text();
  const fields = extractListingFromHtml(html);

  const lowerHtml = html.toLowerCase();
  const blocked = ["cloudflare", "captcha", "datadome", "checking your browser", "just a moment"].some((p) =>
    lowerHtml.includes(p),
  );

  return new Response(JSON.stringify({ fields, blocked }), {
    headers: { "Content-Type": "application/json" },
  });
});
