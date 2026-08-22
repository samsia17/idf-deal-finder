/**
 * GABARIT pour ajouter un vrai adaptateur de scraping best-effort.
 *
 * ⚠️ Ce fichier n'est PAS un adaptateur fonctionnel. Il n'a pas été vérifié
 * contre un site réel dans cette session (structure HTML non inspectée en
 * conditions réelles). Avant de l'activer :
 *
 *  1. Lis les CGU du site cible et son /robots.txt. N'ignore pas un
 *     Disallow — vise les pages/API que le site autorise explicitement,
 *     ou renonce à cette source.
 *  2. Vérifie s'il existe une API officielle/partenaire (beaucoup de portails
 *     immobiliers en proposent à des professionnels ou via des agrégateurs
 *     comme SeLoger Pro, Bien'ici, LFI/Immoprocess) — plus robuste et plus
 *     sûr légalement qu'un scraping HTML.
 *  3. Inspecte la page réelle (DevTools) pour identifier les vrais sélecteurs
 *     ou, mieux, un endpoint JSON interne déjà utilisé par le site.
 *  4. Reste discret : un seul User-Agent identifiable, un délai raisonnable
 *     entre requêtes (voir rateLimiter.ts), pas de parallélisme agressif.
 *  5. Prévois que ça casse : les sites changent leur structure sans préavis.
 *     Fais échouer proprement (log + skip) plutôt que planter tout l'import.
 */
import { fetchRobotsRules, isPathAllowed } from "../robots";
import { runWithDelay } from "../rateLimiter";
import type { ListingSourceAdapter, RawListingInput, SearchArea } from "../types";

const USER_AGENT = "idf-deal-finder-bot/0.1 (+contact: ton-email@example.com)";
const BASE_URL = "https://exemple-portail-immobilier.fr";
const DELAY_BETWEEN_REQUESTS_MS = 3000;

export const siteAdapterTemplate: ListingSourceAdapter = {
  name: "site-template",
  async fetchListings(area: SearchArea): Promise<RawListingInput[]> {
    const robotsRules = await fetchRobotsRules(BASE_URL, USER_AGENT);

    const searchPaths = area.departements.map((dept) => `/recherche?departement=${dept}`);
    const allowedPaths = searchPaths.filter((path) => isPathAllowed(robotsRules, path));
    if (allowedPaths.length < searchPaths.length) {
      console.warn(
        `[${BASE_URL}] robots.txt interdit ${searchPaths.length - allowedPaths.length} chemin(s) demandé(s) — ignorés.`,
      );
    }

    const pages = await runWithDelay(allowedPaths, DELAY_BETWEEN_REQUESTS_MS, async (path) => {
      const response = await fetch(new URL(path, BASE_URL), {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) {
        console.warn(`[${BASE_URL}] échec ${response.status} pour ${path}, page ignorée.`);
        return [] as RawListingInput[];
      }
      const html = await response.text();
      return parseListingsFromHtml(html);
    });

    return pages.flat();
  },
};

/**
 * TODO : implémenter le parsing réel une fois les sélecteurs vérifiés contre
 * le HTML effectivement renvoyé par le site cible. Retourne [] par défaut
 * pour que cet adaptateur ne casse rien tant qu'il n'est pas complété.
 */
// Astuce : si le site ne fournit pas de champ "état" structuré, utilise
// inferConditionFromText(descriptionText) (voir ../condition.ts) sur le texte
// de description pour déduire une valeur par défaut raisonnable.
function parseListingsFromHtml(_html: string): RawListingInput[] {
  return [];
}
