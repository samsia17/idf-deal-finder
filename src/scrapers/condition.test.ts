import { describe, expect, it } from "vitest";
import { inferConditionFromText } from "./condition";

describe("inferConditionFromText", () => {
  it("détecte un bien à rénover", () => {
    expect(inferConditionFromText("Appartement à rénover entièrement, gros travaux à prévoir")).toBe(
      "a_renover",
    );
  });

  it("détecte des travaux à prévoir plus légers", () => {
    expect(inferConditionFromText("Bel appartement, quelques travaux à prévoir")).toBe(
      "travaux_a_prevoir",
    );
  });

  it("détecte un bien neuf", () => {
    expect(inferConditionFromText("Programme neuf, livraison 2027")).toBe("neuf");
  });

  it("détecte un bien rénové / bon état", () => {
    expect(inferConditionFromText("Appartement entièrement rénové, aucun travaux à prévoir")).toBe(
      "bon_etat",
    );
  });

  it("retourne inconnu si aucun signal n'est présent", () => {
    expect(inferConditionFromText("Bel appartement lumineux proche métro")).toBe("inconnu");
  });
});
