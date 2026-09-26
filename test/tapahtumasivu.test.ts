import { describe, expect, it } from "vitest";
import { parseTapahtumasivu, type TapahtumanTiedot } from "../src/tapahtumasivu.js";
import { lueFixture } from "./helpers.js";

/** Parses a fixture that must be a successfully loaded event page. */
function tapahtuma(fixture: string): TapahtumanTiedot {
  const sivu = parseTapahtumasivu(lueFixture(fixture));
  if (sivu.tila !== "ok") throw new Error(`${fixture}: ${sivu.tila}`);
  return sivu.tapahtuma;
}

describe("parseTapahtumasivu: page states", () => {
  it("recognizes Hiski's error page", () => {
    expect(parseTapahtumasivu(lueFixture("tapahtuma-virhe.html"))).toEqual({ tila: "virhe" });
  });

  it("recognizes a page without an event", () => {
    expect(parseTapahtumasivu(lueFixture("tapahtuma-olematon.html"))).toEqual({
      tila: "ei_loytynyt",
    });
  });
});

describe("parseTapahtumasivu: common fields", () => {
  it("reads the parish, book, permanent link and source links", () => {
    expect(tapahtuma("tapahtuma-kastetut.html")).toMatchObject({
      seurakunta: { koodi: "0366", nimi: "Orimattila" },
      kirja: "kastetut",
      pysyva_linkki: "https://hiski.genealogia.fi/hiski?fi+t10320690",
      linkit: [
        {
          teksti: "SSHY - Digiarkisto",
          url: "http://www.sukuhistoria.fi/sshy/sivut/HisKi-digiarkisto.php?plid=0366&year=1834",
        },
      ],
    });
  });

  it("leaves out empty comment rows", () => {
    expect(tapahtuma("tapahtuma-kastetut.html")).not.toHaveProperty("kommentit");
  });

  it("keeps a parish name that contains a separator", () => {
    expect(tapahtuma("tapahtuma-haudatut.html").seurakunta).toEqual({
      koodi: "0015",
      nimi: "Artjärvi - Artsjö",
    });
  });
});
