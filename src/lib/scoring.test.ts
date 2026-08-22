import { describe, expect, it } from "vitest";
import { pricePerM2, rankListings, scoreListing } from "./scoring";
import type { Listing, ReferencePrice } from "@/types/listing";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "l1",
    source: "demo",
    sourceUrl: "https://example.com/l1",
    title: "Appartement 3 pièces",
    commune: "Saint-Denis",
    postalCode: "93200",
    inseeCode: "93066",
    propertyType: "appartement",
    priceEur: 200_000,
    surfaceM2: 60,
    rooms: 3,
    condition: "travaux_a_prevoir",
    constructionYear: 1970,
    floor: 2,
    hasElevator: false,
    description: "",
    publishedAt: "2026-08-01T00:00:00Z",
    scrapedAt: "2026-08-01T00:00:00Z",
    latitude: 48.9362,
    longitude: 2.3574,
    contact: { agencyName: "Agence X", agentName: null, email: "contact@agencex.fr", phone: null },
    ...overrides,
  };
}

function makeReference(overrides: Partial<ReferencePrice> = {}): ReferencePrice {
  return {
    inseeCode: "93066",
    commune: "Saint-Denis",
    postalCode: "93200",
    propertyType: "appartement",
    medianPricePerM2: 4500,
    sampleSize: 25,
    periodStart: "2025-01-01",
    periodEnd: "2026-01-01",
    source: "dvf",
    ...overrides,
  };
}

describe("pricePerM2", () => {
  it("calcule le prix au m²", () => {
    expect(pricePerM2({ priceEur: 300_000, surfaceM2: 60 })).toBe(5000);
  });

  it("rejette une surface nulle ou négative", () => {
    expect(() => pricePerM2({ priceEur: 100_000, surfaceM2: 0 })).toThrow();
  });
});

describe("scoreListing", () => {
  it("donne un score élevé à une annonce nettement sous le marché avec forte marge", () => {
    const listing = makeListing({ priceEur: 200_000, surfaceM2: 60, condition: "travaux_a_prevoir" });
    const reference = makeReference({ medianPricePerM2: 5500, sampleSize: 30 });

    const result = scoreListing(listing, reference);

    expect(result.pricePerM2).toBeCloseTo(3333.33, 1);
    expect(result.discountRatio).toBeGreaterThan(0.3);
    expect(result.projectedMargin).toBeGreaterThan(0);
    expect(result.confidence).toBe("haute");
    expect(result.score).toBeGreaterThan(80);
  });

  it("donne un score bas à une annonce au-dessus du marché", () => {
    const listing = makeListing({ priceEur: 400_000, surfaceM2: 60, condition: "bon_etat" });
    const reference = makeReference({ medianPricePerM2: 4500, sampleSize: 25 });

    const result = scoreListing(listing, reference);

    expect(result.discountRatio).toBeLessThan(0);
    expect(result.projectedMargin).toBeLessThan(0);
    expect(result.score).toBeLessThan(20);
  });

  it("réduit la confiance quand l'échantillon de référence est petit", () => {
    const listing = makeListing();
    const reference = makeReference({ sampleSize: 3 });

    const result = scoreListing(listing, reference);

    expect(result.confidence).toBe("faible");
  });

  it("plafonne le score à 100", () => {
    const listing = makeListing({ priceEur: 50_000, surfaceM2: 60, condition: "neuf" });
    const reference = makeReference({ medianPricePerM2: 10_000, sampleSize: 100 });

    const result = scoreListing(listing, reference);

    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("rankListings", () => {
  it("trie du meilleur au moins bon score", () => {
    const reference = makeReference({ medianPricePerM2: 5000, sampleSize: 25 });
    const goodDeal = makeListing({ id: "good", priceEur: 180_000, surfaceM2: 60 });
    const badDeal = makeListing({ id: "bad", priceEur: 350_000, surfaceM2: 60 });

    const ranked = rankListings([
      { listing: badDeal, reference },
      { listing: goodDeal, reference },
    ]);

    expect(ranked[0].listingId).toBe("good");
    expect(ranked[1].listingId).toBe("bad");
  });
});
