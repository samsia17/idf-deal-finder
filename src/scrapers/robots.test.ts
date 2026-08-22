import { describe, expect, it } from "vitest";
import { isPathAllowed, parseRobotsTxt } from "./robots";

describe("parseRobotsTxt", () => {
  it("applique les règles du groupe générique *", () => {
    const content = `User-agent: *\nDisallow: /admin\nAllow: /admin/public`;
    const rules = parseRobotsTxt(content, "idf-deal-finder-bot");
    expect(isPathAllowed(rules, "/admin/secret")).toBe(false);
    expect(isPathAllowed(rules, "/admin/public")).toBe(true);
    expect(isPathAllowed(rules, "/annonces")).toBe(true);
  });

  it("préfère un groupe nommément ciblé au groupe générique", () => {
    const content = [
      "User-agent: *",
      "Disallow: /",
      "",
      "User-agent: idf-deal-finder-bot",
      "Allow: /annonces",
    ].join("\n");
    const rules = parseRobotsTxt(content, "idf-deal-finder-bot");
    // Les deux groupes sont retenus ; la règle la plus spécifique gagne.
    expect(isPathAllowed(rules, "/annonces")).toBe(true);
    expect(isPathAllowed(rules, "/autre")).toBe(false);
  });

  it("la règle la plus spécifique (chemin le plus long) l'emporte", () => {
    const content = `User-agent: *\nDisallow: /annonces\nAllow: /annonces/paris`;
    const rules = parseRobotsTxt(content, "bot");
    expect(isPathAllowed(rules, "/annonces/lyon")).toBe(false);
    expect(isPathAllowed(rules, "/annonces/paris")).toBe(true);
  });

  it("autorise tout par défaut en l'absence de règle correspondante", () => {
    const rules = parseRobotsTxt("", "bot");
    expect(isPathAllowed(rules, "/quoi-que-ce-soit")).toBe(true);
  });
});
