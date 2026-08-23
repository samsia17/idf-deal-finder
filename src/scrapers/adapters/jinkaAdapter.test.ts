import { describe, expect, it } from "vitest";
import { mapJinkaAdToRawListing, type JinkaAd } from "./jinkaAdapter";

function makeAd(overrides: Partial<JinkaAd> = {}): JinkaAd {
  return {
    id: 1,
    source: "seloger",
    type: "appartement",
    price: 250_000,
    area: 55,
    room: 3,
    floor: 2,
    city: "Montreuil",
    postal_code: "93100",
    lat: 48.86,
    lng: 2.44,
    description: "Bel appartement lumineux",
    created_at: "2026-08-01T00:00:00Z",
    webview_link: "https://api.jinka.fr/redirect/123",
    ...overrides,
  };
}

describe("mapJinkaAdToRawListing", () => {
  it("mappe une annonce valide", () => {
    const result = mapJinkaAdToRawListing(makeAd());
    expect(result).not.toBeNull();
    expect(result?.commune).toBe("Montreuil");
    expect(result?.priceEur).toBe(250_000);
    expect(result?.surfaceM2).toBe(55);
    expect(result?.propertyType).toBe("appartement");
    expect(result?.source).toBe("jinka:seloger");
    expect(result?.title).toContain("Montreuil");
  });

  it("retourne null si le prix est absent", () => {
    const result = mapJinkaAdToRawListing(makeAd({ price: undefined, rent: undefined }));
    expect(result).toBeNull();
  });

  it("retourne null si la surface est absente ou nulle", () => {
    expect(mapJinkaAdToRawListing(makeAd({ area: undefined }))).toBeNull();
    expect(mapJinkaAdToRawListing(makeAd({ area: 0 }))).toBeNull();
  });

  it("utilise rent en repli si price est absent", () => {
    const result = mapJinkaAdToRawListing(makeAd({ price: undefined, rent: 900 }));
    expect(result?.priceEur).toBe(900);
  });

  it("retombe sur appartement pour un type de bien inconnu", () => {
    const result = mapJinkaAdToRawListing(makeAd({ type: "loft" }));
    expect(result?.propertyType).toBe("appartement");
  });

  it("laisse le contact vide (non fourni par Jinka)", () => {
    const result = mapJinkaAdToRawListing(makeAd());
    expect(result?.contact).toEqual({});
  });
});
