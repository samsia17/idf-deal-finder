import { describe, expect, it } from "vitest";
import { aggregateReferencePrices, type DvfTransaction } from "./aggregate";

function makeTx(overrides: Partial<DvfTransaction> = {}): DvfTransaction {
  return {
    codeCommune: "93066",
    commune: "Saint-Denis",
    codePostal: "93200",
    typeLocal: "Appartement",
    valeurFonciere: 270_000,
    surfaceReelleBati: 60,
    natureMutation: "Vente",
    nombreLots: 1,
    ...overrides,
  };
}

describe("aggregateReferencePrices", () => {
  const options = { periodStart: "2025-01-01", periodEnd: "2026-01-01" };

  it("calcule le prix médian par commune et type de bien", () => {
    const transactions = [
      makeTx({ valeurFonciere: 240_000, surfaceReelleBati: 60 }), // 4000/m²
      makeTx({ valeurFonciere: 300_000, surfaceReelleBati: 60 }), // 5000/m²
      makeTx({ valeurFonciere: 270_000, surfaceReelleBati: 60 }), // 4500/m²
    ];

    const [result] = aggregateReferencePrices(transactions, options);

    expect(result.inseeCode).toBe("93066");
    expect(result.medianPricePerM2).toBe(4500);
    expect(result.sampleSize).toBe(3);
  });

  it("ignore les mutations qui ne sont pas des ventes", () => {
    const transactions = [makeTx({ natureMutation: "Échange" })];
    expect(aggregateReferencePrices(transactions, options)).toHaveLength(0);
  });

  it("ignore les mutations à plusieurs lots (biens composites)", () => {
    const transactions = [makeTx({ nombreLots: 2 })];
    expect(aggregateReferencePrices(transactions, options)).toHaveLength(0);
  });

  it("ignore les types de bien hors appartement/maison", () => {
    const transactions = [makeTx({ typeLocal: "Local industriel. commercial ou assimilé" })];
    expect(aggregateReferencePrices(transactions, options)).toHaveLength(0);
  });

  it("filtre les prix au m² aberrants", () => {
    const transactions = [
      makeTx({ valeurFonciere: 1_000, surfaceReelleBati: 60 }), // ~16€/m², erreur de saisie
      makeTx({ valeurFonciere: 6_000_000, surfaceReelleBati: 60 }), // 100k€/m², erreur de saisie
      makeTx({ valeurFonciere: 270_000, surfaceReelleBati: 60 }), // valide
    ];

    const [result] = aggregateReferencePrices(transactions, options);
    expect(result.sampleSize).toBe(1);
  });

  it("sépare appartements et maisons dans la même commune", () => {
    const transactions = [
      makeTx({ typeLocal: "Appartement", valeurFonciere: 270_000, surfaceReelleBati: 60 }),
      makeTx({ typeLocal: "Maison", valeurFonciere: 450_000, surfaceReelleBati: 90 }),
    ];

    const results = aggregateReferencePrices(transactions, options);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.propertyType).sort()).toEqual(["appartement", "maison"]);
  });
});
