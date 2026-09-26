import { describe, expect, it } from "vitest";
import { siisti } from "../src/teksti.js";

describe("siisti", () => {
  it("turns non-breaking spaces into spaces and collapses whitespace", () => {
    expect(siisti("  B. Johan  Hansson   ")).toBe("B. Johan Hansson");
  });

  it("returns undefined for empty or blank text", () => {
    expect(siisti("")).toBeUndefined();
    expect(siisti("   ")).toBeUndefined();
    expect(siisti(undefined)).toBeUndefined();
  });
});
