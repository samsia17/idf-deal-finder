import type { ReferencePrice } from "@/types/listing";

/**
 * Prix de référence factices, alignés avec les communes de demoAdapter.ts,
 * pour que le mode démonstration puisse calculer des scores sans base de
 * données. En usage réel, ces valeurs viennent de reference_prices (DVF).
 */
export const DEMO_REFERENCE_PRICES: ReferencePrice[] = [
  { inseeCode: "93066", commune: "Saint-Denis", postalCode: "93200", propertyType: "appartement", medianPricePerM2: 4200, sampleSize: 34, periodStart: "2025-01-01", periodEnd: "2026-01-01", source: "dvf" },
  { inseeCode: "93001", commune: "Aubervilliers", postalCode: "93300", propertyType: "appartement", medianPricePerM2: 4400, sampleSize: 28, periodStart: "2025-01-01", periodEnd: "2026-01-01", source: "dvf" },
  { inseeCode: "94041", commune: "Ivry-sur-Seine", postalCode: "94200", propertyType: "appartement", medianPricePerM2: 5600, sampleSize: 22, periodStart: "2025-01-01", periodEnd: "2026-01-01", source: "dvf" },
  { inseeCode: "93048", commune: "Montreuil", postalCode: "93100", propertyType: "appartement", medianPricePerM2: 5900, sampleSize: 41, periodStart: "2025-01-01", periodEnd: "2026-01-01", source: "dvf" },
  { inseeCode: "95018", commune: "Argenteuil", postalCode: "95100", propertyType: "appartement", medianPricePerM2: 3600, sampleSize: 19, periodStart: "2025-01-01", periodEnd: "2026-01-01", source: "dvf" },
  { inseeCode: "91228", commune: "Évry-Courcouronnes", postalCode: "91000", propertyType: "appartement", medianPricePerM2: 2900, sampleSize: 4, periodStart: "2025-01-01", periodEnd: "2026-01-01", source: "dvf" },
];
