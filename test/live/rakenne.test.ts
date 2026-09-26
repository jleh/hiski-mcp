/**
 * Guards against changes in Hiski's pages: every fixture's request is made
 * again and the live page must still parse the same way as the saved one.
 * If this fails, Hiski has changed: refresh the fixtures with
 * `npm run tallenna-fixturet`, see what differs and fix the parser.
 */
import { setTimeout as odota } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { FIXTURET, type FixtureMaarittely } from "../../scripts/fixturet.js";
import {
  fixtureTekstina,
  lataaFixture,
  lataaSeurakuntaluettelo,
} from "../../scripts/hiski-lataus.js";
import { decodeLatin1 } from "../../src/encoding.js";
import { parseHakutulos } from "../../src/hakutulos.js";
import { parseSeurakuntaluettelo, SEURAKUNNAT } from "../../src/parishes.js";
import { parseSeurakuntasivu, parseSeurakuntatiedot } from "../../src/seurakuntasivu.js";
import { parseTapahtumasivu } from "../../src/tapahtumasivu.js";
import { lueFixture } from "../helpers.js";

/** What must stay the same between the saved and the live page. */
function rakenne(fixture: FixtureMaarittely, html: string): unknown {
  const tiedosto = fixture.tiedosto;
  if (tiedosto.startsWith("haku-")) {
    return parseHakutulos(html).lohkot.map((l) => `${l.seurakunta.koodi}/${l.kirja}`);
  }
  if (tiedosto.startsWith("tapahtuma-")) return parseTapahtumasivu(html).tila;
  if (tiedosto.startsWith("seurakuntatiedot-")) return parseSeurakuntatiedot(html).tila;
  if (tiedosto.startsWith("seurakunta-")) return parseSeurakuntasivu(html).tila;
  throw new Error(`Fixturen ${tiedosto} tyyppiä ei tunneta`);
}

describe.each(FIXTURET)("live: $tiedosto", (fixture) => {
  it("still has the content and structure of the saved page", async () => {
    await odota(300);
    const live = fixtureTekstina(fixture, await lataaFixture(fixture));
    for (const teksti of fixture.sisaltaa)
      expect(live, "npm run tallenna-fixturet").toContain(teksti);
    expect(rakenne(fixture, live)).toEqual(
      rakenne(fixture, lueFixture(fixture.tiedosto, fixture.merkisto)),
    );
  });
});

describe("live: parish list", () => {
  it("has the same parishes as src/data/seurakunnat.json", async () => {
    const { sivu } = await lataaSeurakuntaluettelo();
    const live = parseSeurakuntaluettelo(decodeLatin1(sivu))
      .map((s) => s.koodi)
      .sort();
    expect(live, "npm run paivita-seurakunnat").toEqual(SEURAKUNNAT.map((s) => s.koodi).sort());
  });
});
