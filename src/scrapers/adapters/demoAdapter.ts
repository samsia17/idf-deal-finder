import type { ListingSourceAdapter, RawListingInput, SearchArea } from "../types";

interface DemoTown {
  commune: string;
  postalCode: string;
  inseeCode: string;
  basePricePerM2: number;
}

// Prix indicatifs très approximatifs, uniquement pour peupler la démo — pas
// une source fiable. Les vrais prix de référence viennent de reference_prices
// (import DVF officiel).
const DEMO_TOWNS: DemoTown[] = [
  { commune: "Saint-Denis", postalCode: "93200", inseeCode: "93066", basePricePerM2: 4200 },
  { commune: "Aubervilliers", postalCode: "93300", inseeCode: "93001", basePricePerM2: 4400 },
  { commune: "Ivry-sur-Seine", postalCode: "94200", inseeCode: "94041", basePricePerM2: 5600 },
  { commune: "Montreuil", postalCode: "93100", inseeCode: "93048", basePricePerM2: 5900 },
  { commune: "Argenteuil", postalCode: "95100", inseeCode: "95018", basePricePerM2: 3600 },
  { commune: "Évry-Courcouronnes", postalCode: "91000", inseeCode: "91228", basePricePerM2: 2900 },
];

const CONDITIONS: RawListingInput["condition"][] = [
  "a_renover",
  "travaux_a_prevoir",
  "bon_etat",
  "inconnu",
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Adaptateur de démonstration : génère des annonces IDF réalistes de façon
 * déterministe (aucun appel réseau), pour faire tourner le pipeline complet
 * (scoring, dashboard, agent de contact) sans dépendre d'un vrai scraper.
 */
export const demoAdapter: ListingSourceAdapter = {
  name: "demo",
  async fetchListings(area: SearchArea): Promise<RawListingInput[]> {
    const rand = mulberry32(42);
    const listings: RawListingInput[] = [];

    for (let i = 0; i < 40; i++) {
      const town = DEMO_TOWNS[Math.floor(rand() * DEMO_TOWNS.length)];
      const surfaceM2 = Math.round(25 + rand() * 80);
      // Décote volontairement variée : de -10% (au-dessus du marché) à +35% (belle affaire).
      const discount = -0.1 + rand() * 0.45;
      const pricePerM2 = Math.round(town.basePricePerM2 * (1 - discount));
      const priceEur = pricePerM2 * surfaceM2;
      const condition = CONDITIONS[Math.floor(rand() * CONDITIONS.length)];
      const rooms = Math.max(1, Math.round(surfaceM2 / 25));

      listings.push({
        source: "demo",
        sourceUrl: `https://example-annonces.fr/biens/demo-${i}`,
        title: `${rooms} pièces ${surfaceM2} m² à ${town.commune}`,
        commune: town.commune,
        postalCode: town.postalCode,
        inseeCode: town.inseeCode,
        propertyType: "appartement",
        priceEur,
        surfaceM2,
        rooms,
        condition,
        description:
          condition === "a_renover"
            ? "Appartement à rénover, gros travaux à prévoir, beau potentiel."
            : condition === "travaux_a_prevoir"
              ? "Quelques travaux à prévoir, bonne opportunité."
              : condition === "bon_etat"
                ? "Appartement rénové, aucun travaux à prévoir."
                : "Appartement lumineux, proche commerces et transports.",
        latitude: null,
        longitude: null,
        contact: {
          agencyName: "Agence Démo Immobilier",
          agentName: null,
          email: "contact@agence-demo.example",
          phone: "01 23 45 67 89",
        },
      });
    }

    const maxPrice = area.maxPriceEur;
    return maxPrice ? listings.filter((l) => l.priceEur <= maxPrice) : listings;
  },
};
