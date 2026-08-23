import { describe, expect, it } from "vitest";
import { extractListingFromHtml, parseFrenchPrice, parseSurface } from "./listingExtraction";

describe("parseFrenchPrice", () => {
  it("parse un prix avec espaces classiques", () => {
    expect(parseFrenchPrice("Prix : 350 000 €")).toBe(350_000);
  });

  it("parse un prix avec espaces insécables", () => {
    expect(parseFrenchPrice("350 000 €")).toBe(350_000);
  });

  it("parse un prix sans séparateur", () => {
    expect(parseFrenchPrice("350000€")).toBe(350_000);
  });

  it("ignore un nombre trop petit pour être un prix immobilier", () => {
    expect(parseFrenchPrice("3 €")).toBeNull();
  });

  it("retourne null si aucun prix n'est présent", () => {
    expect(parseFrenchPrice("Aucun prix ici")).toBeNull();
  });
});

describe("parseSurface", () => {
  it("parse une surface avec m²", () => {
    expect(parseSurface("Surface de 61 m²")).toBe(61);
  });

  it("parse une surface avec m2", () => {
    expect(parseSurface("61 m2")).toBe(61);
  });

  it("parse une surface décimale", () => {
    expect(parseSurface("61,5 m²")).toBe(61.5);
  });

  it("retourne null si aucune surface n'est présente", () => {
    expect(parseSurface("pas de surface ici")).toBeNull();
  });
});

describe("extractListingFromHtml", () => {
  it("extrait les champs depuis un bloc JSON-LD schema.org", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Bel appartement à Montreuil",
          "description": "Appartement rénové, aucun travaux à prévoir.",
          "offers": { "@type": "Offer", "price": "257847", "priceCurrency": "EUR" },
          "address": { "addressLocality": "Montreuil", "postalCode": "93100" }
        }
      </script>
    </head><body></body></html>`;

    const result = extractListingFromHtml(html);
    expect(result.title).toBe("Bel appartement à Montreuil");
    expect(result.priceEur).toBe(257847);
    expect(result.commune).toBe("Montreuil");
    expect(result.postalCode).toBe("93100");
  });

  it("retombe sur Open Graph si pas de JSON-LD", () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="3 pièces 70 m² à Argenteuil" />
      <meta property="og:description" content="Maison à rénover, 350 000 €" />
    </head><body></body></html>`;

    const result = extractListingFromHtml(html);
    expect(result.title).toBe("3 pièces 70 m² à Argenteuil");
    expect(result.priceEur).toBe(350_000);
    expect(result.surfaceM2).toBe(70);
    expect(result.propertyType).toBe("maison");
  });

  it("retombe sur une extraction par regex dans le texte brut en dernier recours", () => {
    const html = `<!doctype html><html><body>
      <h1>Appartement 2 pièces</h1>
      <p>Situé à Saint-Denis (93200), ce bien de 45 m² est proposé à 210 000 €.</p>
    </body></html>`;

    const result = extractListingFromHtml(html);
    expect(result.priceEur).toBe(210_000);
    expect(result.surfaceM2).toBe(45);
    expect(result.postalCode).toBe("93200");
    expect(result.propertyType).toBe("appartement");
  });

  it("extrait un email de contact depuis un lien mailto", () => {
    const html = `<!doctype html><html><body>
      <a href="mailto:contact@agence-exemple.fr">Contacter l'agence</a>
    </body></html>`;

    const result = extractListingFromHtml(html);
    expect(result.contactEmail).toBe("contact@agence-exemple.fr");
  });

  it("ne plante pas sur du JSON-LD malformé et continue avec les autres sources", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">{ invalide </script>
      <meta property="og:title" content="Titre de secours" />
    </head><body></body></html>`;

    expect(() => extractListingFromHtml(html)).not.toThrow();
    expect(extractListingFromHtml(html).title).toBe("Titre de secours");
  });

  it("retourne des champs null quand rien n'est trouvable", () => {
    const html = `<!doctype html><html><body><p>Page vide</p></body></html>`;
    const result = extractListingFromHtml(html);
    expect(result.priceEur).toBeNull();
    expect(result.surfaceM2).toBeNull();
    expect(result.propertyType).toBeNull();
  });
});
