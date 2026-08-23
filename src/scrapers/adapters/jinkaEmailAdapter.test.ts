import { describe, expect, it } from "vitest";
import { parseJinkaAlertEmail } from "./jinkaEmailAdapter";

describe("parseJinkaAlertEmail", () => {
  it("ne plante pas sur du HTML quelconque (parsing pas encore implémenté)", () => {
    expect(() => parseJinkaAlertEmail("<html><body>Test</body></html>")).not.toThrow();
  });

  it("retourne un tableau vide tant que le parsing réel n'est pas implémenté", () => {
    // Ce test documente l'état actuel — à remplacer par de vraies assertions
    // une fois parseJinkaAlertEmail implémenté à partir d'un exemple réel.
    expect(parseJinkaAlertEmail("<html><body>Annonce fictive</body></html>")).toEqual([]);
  });
});
