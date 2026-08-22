import { describe, expect, it } from "vitest";
import { median } from "./median";

describe("median", () => {
  it("calcule la médiane pour un nombre impair de valeurs", () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it("calcule la médiane pour un nombre pair de valeurs", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("rejette un tableau vide", () => {
    expect(() => median([])).toThrow();
  });
});
