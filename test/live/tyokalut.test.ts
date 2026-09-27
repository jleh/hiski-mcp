/**
 * The MCP tools against the real Hiski with known, stable historical records.
 * Run with `npm run test:live`; also weekly in .github/workflows/live.yml.
 */
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { beforeAll, describe, expect, it } from "vitest";
import { HiskiClient } from "../../src/client.js";
import { kutsu, yhdistaClientilla } from "../palvelin-apu.js";

interface Lohko {
  seurakunta: { koodi: string; nimi: string };
  kirja: string;
  tapahtumat: Record<string, unknown>[];
  katkaistu: boolean;
  jatkokohta?: string;
}
interface Tulos {
  lohkot: Lohko[];
  yhteensa?: number;
  huomautukset?: string[];
}

let asiakas: Client;
beforeAll(async () => {
  asiakas = await yhdistaClientilla(new HiskiClient());
});

/** Calls a search tool and expects a successful JSON answer. */
async function hae(tyokalu: string, args: Record<string, unknown>): Promise<Tulos> {
  const { virhe, teksti, json } = await kutsu(asiakas, tyokalu, args);
  expect(virhe, teksti).toBe(false);
  return json as Tulos;
}

describe("live: searches", () => {
  it("finds the children of Johan Hansson and Ottilia Andersdotter (suunnitelma.md)", async () => {
    const tulos = await hae("hae_kastetut", {
      seurakunnat: ["Orimattila"],
      isan_etunimi: "Johan",
      isan_patronyymi: "Hansson",
      aidin_etunimi: "Ottilia",
      aidin_patronyymi: "Andersdotter",
    });
    const lapset = tulos.lohkot[0]!.tapahtumat.map((t) => t.lapsi);
    expect(lapset).toHaveLength(9);
    expect(lapset[0]).toBe("Maria Sofia");
    expect(lapset.at(-1)).toBe("Mathilda");
  });

  it("encodes Scandinavian letters so that Hiski finds them", async () => {
    const tulos = await hae("hae_kastetut", {
      seurakunnat: ["0366"],
      kyla: "Bärnilä",
      alkuvuosi: "1834",
      loppuvuosi: "1840",
    });
    expect(tulos.lohkot[0]!.tapahtumat).toHaveLength(6);
  });

  it("continues a truncated search where it ended", async () => {
    const haku = {
      seurakunnat: ["0366"],
      lapsen_etunimi: "Johan",
      alkuvuosi: "1830",
      loppuvuosi: "1840",
      maksimi: 15,
    };
    const eka = (await hae("hae_kastetut", haku)).lohkot[0]!;
    expect(eka.katkaistu).toBe(true);
    const toka = (await hae("hae_kastetut", { ...haku, jatkokohta: eka.jatkokohta })).lohkot[0]!;
    const viimeinen = eka.tapahtumat.at(-1)!.numero as number;
    expect(toka.tapahtumat[0]!.numero as number).toBeGreaterThan(viimeinen);
  });

  it("searches marriages in two parishes", async () => {
    const tulos = await hae("hae_vihityt", {
      seurakunnat: ["Orimattila", "Artjärvi"],
      miehen_etunimi: "Johan",
      miehen_patronyymi: "Hansson",
      alkuvuosi: "1825",
      loppuvuosi: "1835",
    });
    const tapahtumia = tulos.lohkot.reduce((n, l) => n + l.tapahtumat.length, 0);
    expect(tapahtumia).toBe(2);
  });

  it("keeps the first parish of an all-books search over several parishes", async () => {
    const tulos = await hae("hae_kaikki", {
      seurakunnat: ["Artjärvi", "Orimattila"],
      etunimi: "Johan",
      patronyymi: "Hansson",
      alkuvuosi: "1850",
      loppuvuosi: "1855",
    });
    expect(tulos.lohkot.map((l) => `${l.seurakunta.koodi}/${l.kirja}`)).toContain("0015/haudatut");
    const tapahtumia = tulos.lohkot.reduce((n, l) => n + l.tapahtumat.length, 0);
    expect(tapahtumia).toBe(tulos.yhteensa);
  });

  it("finds a move out of Akaa", async () => {
    const tulos = await hae("hae_muuttaneet", {
      seurakunnat: ["Akaa"],
      suunta: "pois",
      alkuvuosi: "1806",
      loppuvuosi: "1806",
      maksimi: 15,
    });
    const paikat = tulos.lohkot[0]!.tapahtumat.map((t) => t.toinen_paikka);
    expect(paikat).toContain("Tavastehus");
  });
});

describe("live: event and parish", () => {
  it("gives an event with the father's names split, despite Hiski's error pages", async () => {
    const { virhe, teksti, json } = await kutsu(asiakas, "hae_tapahtuma", {
      seurakunta: "Orimattila",
      kirja: "kastetut",
      numero: 18795,
    });
    expect(virhe, teksti).toBe(false);
    expect(json).toMatchObject({
      lapsi: "Maria Sofia",
      isa: { etunimi: "Johan", patronyymi: "Hansson" },
    });
  });

  it("gives a ceded Karelian parish's note and background", async () => {
    const { virhe, teksti, json } = await kutsu(asiakas, "seurakunnan_tiedot", {
      seurakunta: "0627",
    });
    expect(virhe, teksti).toBe(false);
    expect(json).toMatchObject({
      koodi: "0627",
      huomautus: { linkit: [{ url: "http://www.karjalatk.fi/" }] },
      maakunta: "Luovutetun alueen lakkautetut seurakunnat",
    });
  });
});
