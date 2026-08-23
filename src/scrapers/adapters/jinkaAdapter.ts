/**
 * Adaptateur Jinka (jinka.fr) — agrégateur d'annonces immobilières.
 *
 * ⚠️ NON OFFICIEL. Jinka ne publie pas d'API publique pour les développeurs
 * tiers (vérifié : pas de documentation développeur trouvée sur jinka.fr ni
 * jinka.dev). Ce fichier s'appuie sur `https://api.jinka.fr/apiv2`, l'API
 * interne utilisée par leur propre appli web/mobile, dont le fonctionnement
 * a été déduit d'implémentations tierces publiques et non officielles
 * (ex. github.com/louistransfer/kajin) — pas d'une documentation Jinka.
 *
 * Conséquences à avoir en tête :
 *  - Cela viole très probablement les CGU de Jinka. Risque réel de
 *    suspension du compte utilisé.
 *  - Peut casser à tout moment sans préavis si Jinka fait évoluer son API
 *    ou ajoute une protection anti-bot (CAPTCHA, 2FA, rate-limit agressif).
 *  - Le mapping ci-dessous a été construit à partir d'exemples observés sur
 *    des ALERTES DE LOCATION. Le format exact pour des alertes ACHAT (champs
 *    prix vs loyer, valeurs de `type`/`buy_type`) n'a pas pu être vérifié
 *    faute d'accès à un vrai compte Jinka dans cette session — à valider
 *    au premier run réel (voir logs d'avertissement) et à ajuster si besoin.
 *  - Jinka n'expose pas, dans le flux observé, de contact agence (email/
 *    téléphone) : les annonces importées via cet adaptateur n'auront donc
 *    pas de contact_email, et l'agent de prise de contact automatique les
 *    ignorera tant que ce point n'est pas résolu (ex. en suivant le lien
 *    `webview_link` vers le site source pour en extraire le contact).
 *
 * Identifiants : à passer via createJinkaAdapter({ email, password }),
 * jamais en dur ici. Ne jamais exposer ce fichier ou ces identifiants côté
 * navigateur — utilisation prévue uniquement depuis scripts/ingest.ts (Node)
 * ou une Supabase Edge Function (Deno), toutes deux server-side.
 */
import type { PropertyType } from "@/types/listing";
import { sleep } from "../rateLimiter";
import type { ListingSourceAdapter, RawListingInput, SearchArea } from "../types";

const JINKA_API_BASE = "https://api.jinka.fr/apiv2";
const DELAY_BETWEEN_ALERTS_MS = 2000;
const DELAY_BETWEEN_PAGES_MS = 1000;

export interface JinkaCredentials {
  email: string;
  password: string;
}

interface JinkaAlert {
  id: string;
  name: string;
  user_name?: string;
  estimated_ads_per_day?: number;
}

interface JinkaDashboardResponse {
  pagination: { nbPages: number };
  ads: JinkaAd[];
}

/**
 * Champs observés sur des alertes de location dans des implémentations
 * tierces. Non garanti exhaustif ni identique pour des alertes d'achat.
 */
export interface JinkaAd {
  id: string | number;
  source: string;
  type?: string;
  buy_type?: string;
  search_type?: string;
  price?: number;
  rent?: number;
  rent_max?: number;
  area?: number;
  room?: number;
  floor?: number;
  city?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  description?: string;
  created_at?: string;
  webview_link?: string;
}

async function authenticate(credentials: JinkaCredentials): Promise<string> {
  const response = await fetch(`${JINKA_API_BASE}/user/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: credentials.email, password: credentials.password }),
  });

  if (!response.ok) {
    throw new Error(
      `Authentification Jinka échouée (HTTP ${response.status}). Identifiants invalides, ou Jinka a changé son API / ajouté une protection anti-bot.`,
    );
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Réponse d'authentification Jinka inattendue (pas de access_token) — l'API a probablement changé.");
  }
  return data.access_token;
}

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}`, Accept: "application/json" };
}

async function listAlerts(accessToken: string): Promise<JinkaAlert[]> {
  const response = await fetch(`${JINKA_API_BASE}/alert`, { headers: authHeaders(accessToken) });
  if (!response.ok) throw new Error(`Échec de récupération des alertes Jinka (HTTP ${response.status})`);
  return (await response.json()) as JinkaAlert[];
}

async function fetchAlertPage(
  accessToken: string,
  alertId: string,
  page: number,
): Promise<JinkaDashboardResponse> {
  const url = `${JINKA_API_BASE}/alert/${alertId}/dashboard?filter=all&page=${page}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  if (!response.ok) {
    throw new Error(`Échec de récupération des annonces (alerte ${alertId}, page ${page}) : HTTP ${response.status}`);
  }
  return (await response.json()) as JinkaDashboardResponse;
}

const PROPERTY_TYPE_MAP: Record<string, PropertyType> = {
  appartement: "appartement",
  flat: "appartement",
  apartment: "appartement",
  maison: "maison",
  house: "maison",
};

function resolvePropertyType(ad: JinkaAd): PropertyType {
  const raw = (ad.type ?? "").toLowerCase();
  const mapped = PROPERTY_TYPE_MAP[raw];
  if (!mapped) {
    console.warn(`[jinka] Valeur de type de bien inconnue "${ad.type}" (annonce ${ad.id}) — repli sur "appartement".`);
    return "appartement";
  }
  return mapped;
}

function resolvePriceEur(ad: JinkaAd): number | null {
  if (typeof ad.price === "number" && ad.price > 0) return ad.price;
  if (typeof ad.rent === "number" && ad.rent > 0) {
    console.warn(
      `[jinka] Annonce ${ad.id} : pas de champ "price", utilisation de "rent" (${ad.rent}) comme prix — à vérifier, ce champ est historiquement un loyer.`,
    );
    return ad.rent;
  }
  return null;
}

/** Conversion pure d'une annonce Jinka brute vers notre format interne. Retourne null si la donnée est insuffisante pour être scorée. */
export function mapJinkaAdToRawListing(ad: JinkaAd): RawListingInput | null {
  const priceEur = resolvePriceEur(ad);
  const surfaceM2 = ad.area;

  if (!priceEur || !surfaceM2 || surfaceM2 <= 0) {
    return null;
  }

  const commune = ad.city ?? "Commune inconnue";
  const rooms = ad.room ?? null;
  const title = `${rooms ? `${rooms} pièces ` : ""}${surfaceM2} m² à ${commune}`.trim();

  return {
    source: `jinka:${ad.source ?? "inconnu"}`,
    sourceUrl: ad.webview_link ?? "https://www.jinka.fr",
    title,
    commune,
    postalCode: ad.postal_code ?? "",
    propertyType: resolvePropertyType(ad),
    priceEur,
    surfaceM2,
    rooms,
    floor: ad.floor ?? null,
    description: ad.description ?? "",
    publishedAt: ad.created_at ?? null,
    latitude: ad.lat ?? null,
    longitude: ad.lng ?? null,
    // Pas de contact agence dans le flux Jinka observé — voir avertissement en tête de fichier.
    contact: {},
  };
}

export function createJinkaAdapter(credentials: JinkaCredentials): ListingSourceAdapter {
  return {
    name: "jinka",
    async fetchListings(_area: SearchArea): Promise<RawListingInput[]> {
      const accessToken = await authenticate(credentials);
      const alerts = await listAlerts(accessToken);

      if (alerts.length === 0) {
        console.warn(
          "[jinka] Aucune alerte configurée sur ce compte. Crée une alerte de recherche sur jinka.fr avant de lancer l'ingestion.",
        );
        return [];
      }

      const allListings: RawListingInput[] = [];

      for (let i = 0; i < alerts.length; i++) {
        if (i > 0) await sleep(DELAY_BETWEEN_ALERTS_MS);
        const alert = alerts[i];

        let page = 1;
        let totalPages = 1;
        do {
          if (page > 1) await sleep(DELAY_BETWEEN_PAGES_MS);
          const { pagination, ads } = await fetchAlertPage(accessToken, alert.id, page);
          totalPages = pagination?.nbPages || 1;
          for (const ad of ads) {
            const mapped = mapJinkaAdToRawListing(ad);
            if (mapped) allListings.push(mapped);
          }
          page++;
        } while (page <= totalPages);
      }

      return allListings;
    },
  };
}
