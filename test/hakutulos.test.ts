import { describe, expect, it } from "vitest";
import { parseHakutulos } from "../src/hakutulos.js";
import { lueFixture } from "./helpers.js";

const jasenna = (fixture: string) => parseHakutulos(lueFixture(fixture));

describe("parseHakutulos: blocks", () => {
  it("parses a single-parish block with its search terms", () => {
    const { lohkot, yhteensa } = jasenna("haku-kastetut-perus.html");
    expect(yhteensa).toBeUndefined();
    expect(lohkot).toHaveLength(1);
    const [lohko] = lohkot;
    expect(lohko).toMatchObject({
      seurakunta: { koodi: "0366", nimi: "Orimattila" },
      kirja: "kastetut",
      katkaistu: false,
    });
    expect(lohko!.tapahtumat).toHaveLength(9);
    expect(lohko!.hakutermit).toEqual([
      { kentta: "Isän etunimi", haku: "JOHAN", muodot: ["Johan", "Johannes", "Johanss."] },
      {
        kentta: "Isän patronyymi",
        haku: "HANS",
        muodot: ["Hans", "Hansintytär", "Hansinp.", "Hansentytär", "Hansenp.", "Hansdott."],
      },
      { kentta: "Äidin etunimi", haku: "OTTILIA", muodot: ["Otilia"] },
      {
        kentta: "Äidin patronyymi",
        haku: "ANDERS",
        muodot: [
          "Anders",
          "Andersdot.",
          "Andersd:dr",
          "Andersgr.",
          "Andersdotters",
          "Anders Wilh.ss.",
        ],
      },
    ]);
    expect(lohko!.huomautukset).toBeUndefined();
  });

  it("reports a truncated single-parish result with its continuation point", () => {
    const [lohko] = jasenna("haku-kastetut-katkaistu.html").lohkot;
    expect(lohko).toMatchObject({ katkaistu: true, loytyi_noin: 416, jatkokohta: "17681" });
    expect(lohko!.tapahtumat).toHaveLength(15);
    expect(lohko!.huomautukset).toEqual(["Haetaan vuodet 1830 - 1840"]);
  });

  it("splits a multi-parish result into blocks with their own continuation points", () => {
    const { lohkot, yhteensa } = jasenna("haku-kastetut-katkaistu-monta.html");
    expect(yhteensa).toBe(565);
    expect(lohkot.map((l) => [l.seurakunta.koodi, l.seurakunta.nimi, l.jatkokohta])).toEqual([
      ["0015", "Artjärvi - Artsjö", "8154"],
      ["0366", "Orimattila", "17681"],
    ]);
    for (const lohko of lohkot) {
      expect(lohko.katkaistu).toBe(true);
      expect(lohko.loytyi_noin).toBeUndefined();
      expect(lohko.tapahtumat).toHaveLength(15);
    }
  });

  it("parses a continued search", () => {
    const [lohko] = jasenna("haku-kastetut-jatko.html").lohkot;
    expect(lohko!.huomautukset).toEqual([
      "Jatketaan edellistä tulostusta",
      "Haetaan vuodet 1830 - 1840",
    ]);
    expect(lohko!.tapahtumat[0]!.numero).toBe(17685);
  });

  it("flags search terms that are not in the database", () => {
    const [lohko] = jasenna("haku-kastetut-tyhja.html").lohkot;
    expect(lohko!.tapahtumat).toEqual([]);
    expect(lohko!.katkaistu).toBe(false);
    expect(lohko!.hakutermit).toEqual([
      { kentta: "Lapsen etunimi", haku: "XYZZYQ", ei_tietokannassa: true },
    ]);
  });

  it("returns no blocks for a page without results", () => {
    expect(jasenna("haku-ei-lohkoja.html")).toEqual({ lohkot: [] });
  });
});
