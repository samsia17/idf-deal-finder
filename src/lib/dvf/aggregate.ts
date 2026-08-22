import { median } from "@/lib/median";
import type { PropertyType, ReferencePrice } from "@/types/listing";

/** Une ligne de transaction DVF déjà filtrée sur les colonnes utiles. */
export interface DvfTransaction {
  codeCommune: string;
  commune: string;
  codePostal: string;
  typeLocal: string;
  valeurFonciere: number;
  surfaceReelleBati: number;
  natureMutation: string;
  nombreLots: number;
}

const TYPE_LOCAL_TO_PROPERTY_TYPE: Record<string, PropertyType> = {
  Appartement: "appartement",
  Maison: "maison",
};

export interface AggregateOptions {
  periodStart: string;
  periodEnd: string;
  /** Filtre les erreurs de saisie DVF (prix/m² aberrants). */
  minPricePerM2?: number;
  maxPricePerM2?: number;
}

/**
 * Agrège des transactions DVF brutes en prix médian €/m² par commune et type
 * de bien. Ne garde que les ventes simples (un seul lot) d'appartements ou
 * maisons, pour éviter de mélanger un bien avec une dépendance/parking vendue
 * dans la même mutation.
 */
export function aggregateReferencePrices(
  transactions: DvfTransaction[],
  options: AggregateOptions,
): Array<Omit<ReferencePrice, "source">> {
  const { periodStart, periodEnd, minPricePerM2 = 500, maxPricePerM2 = 20_000 } = options;

  const groups = new Map<
    string,
    { commune: string; postalCode: string; propertyType: PropertyType; pricesPerM2: number[] }
  >();

  for (const tx of transactions) {
    if (tx.natureMutation !== "Vente") continue;
    if (tx.nombreLots > 1) continue;
    const propertyType = TYPE_LOCAL_TO_PROPERTY_TYPE[tx.typeLocal];
    if (!propertyType) continue;
    if (tx.surfaceReelleBati <= 0 || tx.valeurFonciere <= 0) continue;

    const pricePerM2 = tx.valeurFonciere / tx.surfaceReelleBati;
    if (pricePerM2 < minPricePerM2 || pricePerM2 > maxPricePerM2) continue;

    const key = `${tx.codeCommune}|${propertyType}`;
    const existing = groups.get(key);
    if (existing) {
      existing.pricesPerM2.push(pricePerM2);
    } else {
      groups.set(key, {
        commune: tx.commune,
        postalCode: tx.codePostal,
        propertyType,
        pricesPerM2: [pricePerM2],
      });
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const [inseeCode] = key.split("|");
    return {
      inseeCode,
      commune: group.commune,
      postalCode: group.postalCode,
      propertyType: group.propertyType,
      medianPricePerM2: Math.round(median(group.pricesPerM2)),
      sampleSize: group.pricesPerM2.length,
      periodStart,
      periodEnd,
    };
  });
}
