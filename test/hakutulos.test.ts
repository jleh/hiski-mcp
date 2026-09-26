import { describe, expect, it } from "vitest";
import { FIXTURET } from "../scripts/fixturet.js";
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

/** The counts Hiski prints after each table, in page order. */
function ilmoitetutMaarat(html: string): number[] {
  const maarat = html.matchAll(
    /(\d+) tapahtumaa löytyi\.|Näytettiin (\d+) tapahtumaa|yli maksimimäärän \((\d+) tapahtumaa\)|ei löytynyt yhtään/g,
  );
  return [...maarat].map((m) => Number(m[1] ?? m[2] ?? m[3] ?? 0));
}

describe.each(FIXTURET.filter((f) => f.tiedosto.startsWith("haku-")))(
  "parseHakutulos: $tiedosto",
  ({ tiedosto }) => {
    it("finds as many events as Hiski reports", () => {
      const html = lueFixture(tiedosto);
      const { lohkot } = parseHakutulos(html);
      expect(lohkot.map((l) => l.tapahtumat.length)).toEqual(ilmoitetutMaarat(html));
    });
  },
);

describe("parseHakutulos: kastetut", () => {
  it("parses the columns of a baptism", () => {
    const [lohko] = jasenna("haku-kastetut-perus.html").lohkot;
    expect(lohko!.tapahtumat[0]).toEqual({
      kirja: "kastetut",
      numero: 18795,
      url: "https://hiski.genealogia.fi/hiski?fi+0366+kastetut+18795",
      syntynyt: "21.9.1834",
      kastettu: "22.9.1834",
      kyla: "Njemis",
      talo: "Bärnilä",
      isa: "B. Johan Hansson",
      aiti: "Otteliana Andersdotter",
      lapsi: "Maria Sofia",
    });
    expect(lohko!.tapahtumat[2]).toMatchObject({ aiti: "Otteliana Andersdotter", aidin_ika: "22" });
  });

  const kommentit = jasenna("haku-kastetut-kommentit.html").lohkot[0]!.tapahtumat;
  const numerolla = (numero: number) => kommentit.find((t) => t.numero === numero);

  it("separates field comments and leaves empty fields out", () => {
    const tapahtuma = numerolla(22282);
    expect(tapahtuma).toMatchObject({
      lapsi: "Theda Aurora",
      aiti: "Inh. Anna Stina Lenasdr.",
      aidin_ika: "24",
      kenttakommentit: { lapsi: ["oägta"] },
    });
    expect(tapahtuma).not.toHaveProperty("isa");
    expect(tapahtuma).not.toHaveProperty("talo");
  });

  it("finds the mother's age after a field comment", () => {
    expect(numerolla(22288)).toMatchObject({
      aiti: "Catharina",
      aidin_ika: "28",
      kenttakommentit: { aiti: ["ei patronyymiä"] },
    });
  });

  it("finds the mother's age without a separating non-breaking space", () => {
    expect(numerolla(22287)).toMatchObject({ aiti: "Pig. Anna Lovisa Pehrman", aidin_ika: "29" });
  });

  it("attaches comment rows to the preceding event", () => {
    expect(numerolla(22287)!.kommentit).toEqual([
      { tyyppi: "alkup", alikentta: "ALKUPKOMM", teksti: "Död 19.1.1850" },
    ]);
    expect(numerolla(22286)).not.toHaveProperty("kommentit");
  });
});
