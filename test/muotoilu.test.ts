import { describe, expect, it } from "vitest";
import type { HakuTulos, Lohko } from "../src/hakutulos.js";
import { muotoileHakutulos } from "../src/muotoilu.js";
import { ratkaiseSeurakunnat } from "../src/parishes.js";

const katkaistu = (kirja: Lohko["kirja"]): Lohko => ({
  seurakunta: { koodi: "0366", nimi: "Orimattila" },
  kirja,
  hakutermit: [],
  tapahtumat: [],
  katkaistu: true,
  loytyi_noin: 416,
  jatkokohta: "17681",
});

describe("muotoileHakutulos", () => {
  const seurakunnat = ratkaiseSeurakunnat(["0366"]);

  it("gives the continuation point of a single-book search", () => {
    const tulos: HakuTulos = { lohkot: [katkaistu("kastetut")] };
    const valmis = muotoileHakutulos(tulos, { kirja: "kastetut", seurakunnat });
    expect(valmis.lohkot[0]!.jatkokohta).toBe("17681");
    expect(valmis.huomautukset).toEqual([expect.stringContaining('jatkokohta "17681"') as unknown]);
  });

  it("drops the continuation point of an all-books search, which belongs to one book only", () => {
    const tulos: HakuTulos = { lohkot: [katkaistu("kastetut")] };
    const valmis = muotoileHakutulos(tulos, { kirja: "kaikki", seurakunnat });
    expect(valmis.lohkot[0]).not.toHaveProperty("jatkokohta");
    expect(valmis.huomautukset).toHaveLength(1);
    expect(valmis.huomautukset![0]).not.toContain("jatkokohta");
    expect(valmis.huomautukset![0]).toContain("hae_kastetut");
  });
});
