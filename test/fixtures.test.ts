import { existsSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FIXTURET } from "../scripts/fixturet.js";
import { FIXTURE_KANSIO, lueFixture } from "./helpers.js";

/** Maintained by scripts/paivita-seurakunnat.ts instead of the manifest. */
const MUUT_FIXTURET = ["seurakuntaluettelo.html"];

describe.each(FIXTURET)("fixture $tiedosto", ({ tiedosto, merkisto, sisaltaa }) => {
  it("is saved", () => {
    expect(existsSync(FIXTURE_KANSIO + tiedosto)).toBe(true);
  });

  it("has no Cloudflare script", () => {
    expect(lueFixture(tiedosto, merkisto)).not.toContain("__CF$cv$params");
  });

  it.each(sisaltaa)("contains %j", (teksti) => {
    expect(lueFixture(tiedosto, merkisto)).toContain(teksti);
  });
});

describe("fixture directory", () => {
  it("contains only known fixtures", () => {
    const tunnetut = new Set([...FIXTURET.map((f) => f.tiedosto), ...MUUT_FIXTURET]);
    expect(readdirSync(FIXTURE_KANSIO).filter((f) => !tunnetut.has(f))).toEqual([]);
  });

  it("has unique file names in the manifest", () => {
    const nimet = FIXTURET.map((f) => f.tiedosto);
    expect(new Set(nimet).size).toBe(nimet.length);
  });
});
