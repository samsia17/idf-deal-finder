/**
 * Adaptateur Jinka via emails d'alerte (au lieu de l'API — voir
 * jinkaAdapter.ts pour le contexte). Utilisé quand le compte Jinka n'a pas
 * de mot de passe fixe (connexion par code envoyé par email à chaque fois),
 * ce qui rend l'authentification API impossible.
 *
 * Principe : Jinka envoie déjà un email à chaque nouvelle annonce
 * correspondant à une alerte configurée. On lit ces emails via IMAP (lecture
 * seule) et on en extrait les annonces.
 *
 * ⚠️ ÉTAT ACTUEL : `parseJinkaAlertEmail` n'est PAS implémenté — je n'ai pas
 * encore vu la structure HTML réelle d'un email d'alerte Jinka. Il retourne
 * volontairement un tableau vide avec un avertissement plutôt que de deviner
 * un format et risquer de mal extraire les données. Fournis un exemple réel
 * (voir README) pour compléter le parsing.
 */
import * as cheerio from "cheerio";
import { fetchEmails, type ImapCredentials } from "../email/imapClient";
import type { ListingSourceAdapter, RawListingInput, SearchArea } from "../types";

const JINKA_SENDER_FILTER = "jinka.fr";
const DEFAULT_LOOKBACK_DAYS = 7;

/**
 * Extrait les annonces d'un email d'alerte Jinka.
 *
 * TODO (bloqué sur un exemple réel) : implémenter une fois qu'on a la vraie
 * structure HTML. En pratique, il faudra identifier dans le HTML de l'email :
 *  - un conteneur répété par annonce
 *  - titre / commune / code postal
 *  - prix et surface (pour calculer le prix/m²)
 *  - le lien vers l'annonce (probablement un lien de tracking Jinka qui
 *    redirige vers le site source — sourceUrl sera ce lien, pas l'URL finale)
 *  - éventuellement une info d'état du bien dans la description, sinon
 *    laisser `description` vide et laisser inferConditionFromText s'en charger
 *    en aval (voir normalize.ts)
 */
export function parseJinkaAlertEmail(html: string): RawListingInput[] {
  const $ = cheerio.load(html);
  void $; // évite un import inutilisé tant que le parsing n'est pas écrit

  console.warn(
    "[jinka-email] parseJinkaAlertEmail n'est pas encore implémenté (pas d'exemple réel disponible) — email ignoré.",
  );
  return [];
}

export function createJinkaEmailAdapter(
  credentials: ImapCredentials,
  options: { lookbackDays?: number } = {},
): ListingSourceAdapter {
  return {
    name: "jinka-email",
    async fetchListings(_area: SearchArea): Promise<RawListingInput[]> {
      const emails = await fetchEmails(credentials, {
        fromContains: JINKA_SENDER_FILTER,
        sinceDays: options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS,
      });

      console.log(`[jinka-email] ${emails.length} email(s) Jinka trouvé(s) sur les ${options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS} derniers jours.`);

      const listings: RawListingInput[] = [];
      for (const email of emails) {
        if (!email.html) continue;
        listings.push(...parseJinkaAlertEmail(email.html));
      }
      return listings;
    },
  };
}
