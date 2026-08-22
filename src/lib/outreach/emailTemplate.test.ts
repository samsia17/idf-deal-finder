import { describe, expect, it } from "vitest";
import { generateOutreachEmail } from "./emailTemplate";
import type { Listing } from "@/types/listing";

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
    constructionYear: null,
    floor: null,
    hasElevator: null,
    description: "",
    publishedAt: "2026-08-01T00:00:00Z",
    scrapedAt: "2026-08-01T00:00:00Z",
    latitude: null,
    longitude: null,
    contact: { agencyName: "Agence X", agentName: null, email: "contact@agencex.fr", phone: null },
    ...overrides,
  };
}

describe("generateOutreachEmail", () => {
  it("inclut le titre, la commune, le prix et le lien de l'annonce", () => {
    const email = generateOutreachEmail(makeListing(), [], { name: "Sam" });
    expect(email.subject).toContain("Saint-Denis");
    expect(email.body).toContain("Appartement 3 pièces");
    expect(email.body).toContain(new Intl.NumberFormat("fr-FR").format(200_000));
    expect(email.body).toContain("https://example.com/l1");
  });

  it("liste les créneaux proposés", () => {
    const email = generateOutreachEmail(
      makeListing(),
      [{ startsAt: "2026-09-01T14:00:00Z", endsAt: "2026-09-01T15:00:00Z" }],
      { name: "Sam" },
    );
    expect(email.body).toContain("-");
  });

  it("se présente explicitement comme un message automatisé au nom de l'expéditeur", () => {
    const email = generateOutreachEmail(makeListing(), [], { name: "Sam Abdellaoui" });
    expect(email.body).toContain("assistant automatisé");
    expect(email.body).toContain("Sam Abdellaoui");
  });

  it("gère l'absence de créneaux sans planter", () => {
    const email = generateOutreachEmail(makeListing(), [], { name: "Sam" });
    expect(email.body).toContain("à préciser selon vos disponibilités");
  });
});
