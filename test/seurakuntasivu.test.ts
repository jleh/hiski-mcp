import { describe, expect, it } from "vitest";
import { parseSeurakuntasivu } from "../src/seurakuntasivu.js";
import { lueFixture } from "./helpers.js";

const sivu = (fixture: string) => parseSeurakuntasivu(lueFixture(fixture));

describe("parseSeurakuntasivu", () => {
  it("reads the books with their years, the neighbours and the info link", () => {
    expect(sivu("seurakunta-0015.html")).toEqual({
      tila: "ok",
      koodi: "0015",
      nimi: "Artjärvi - Artsjö",
      kirjat: [
        {
          kirja: "kastetut",
          vuodet: [
            { alku: 1695, loppu: 1718 },
            { alku: 1720, loppu: 1911 },
          ],
        },
        { kirja: "vihityt", vuodet: [{ alku: 1730, loppu: 1918 }] },
        { kirja: "haudatut", vuodet: [{ alku: 1732, loppu: 1919 }] },
        { kirja: "smuutt", vuodet: [{ alku: 1741, loppu: 1747 }] },
        { kirja: "umuutt", vuodet: [{ alku: 1741, loppu: 1747 }] },
        { kirja: "kaikki", vuodet: [{ alku: 1695, loppu: 1919 }] },
      ],
      naapurit: [
        { koodi: "0113", nimi: "Iitti" },
        { koodi: "0281", nimi: "Lapinjärvi - Lappträsk" },
        { koodi: "0346", nimi: "Myrskylä - Mörskom" },
        { koodi: "0366", nimi: "Orimattila" },
      ],
      lisatiedot_url: "https://hiski.genealogia.fi/historia/mini-pgsql.php?srk=15&kieli=fi",
    });
  });

  it("lists only the books the parish has", () => {
    const orimattila = sivu("seurakunta-0366.html");
    expect(orimattila.tila === "ok" && orimattila.kirjat.map((k) => k.kirja)).toEqual([
      "kastetut",
      "vihityt",
      "haudatut",
      "kaikki",
    ]);
    expect(orimattila.tila === "ok" && orimattila.naapurit).toHaveLength(8);
  });

  it("keeps the note shown for ceded Karelian parishes with its link", () => {
    expect(sivu("seurakunta-0627.html")).toMatchObject({
      tila: "ok",
      koodi: "0627",
      huomautus: {
        teksti:
          "Karjala-tietokantasäätiö on tallentanut valtaosan luovutetun Karjalan historiakirjoista.",
        linkit: [{ teksti: "Karjala-tietokantasäätiö", url: "http://www.karjalatk.fi/" }],
      },
    });
  });

  it("recognizes an unknown parish code", () => {
    expect(sivu("seurakunta-tuntematon.html")).toEqual({ tila: "ei_loytynyt" });
  });
});
