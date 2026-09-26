import { describe, expect, it } from "vitest";
import { kutsu, yhdista, type Pyynto } from "./palvelin-apu.js";

/** The fields of a recorded search, in any order (ASCII values only). */
const kentat = (pyynto: Pyynto | undefined) =>
  Object.fromEntries(new URLSearchParams(pyynto?.body ?? ""));

interface Tulos {
  lohkot: {
    seurakunta: { koodi: string };
    kirja: string;
    tapahtumat: { numero: number }[];
    jatkokohta?: string;
  }[];
  huomautukset?: string[];
}

describe("hae_kastetut", () => {
  it("maps the parameters to Hiski's form and returns the parsed result", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-kastetut-perus.html" });
    const { virhe, json } = await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["Orimattila"],
      isan_etunimi: "Johan",
      isan_patronyymi: "Hansson",
      aidin_etunimi: "Ottilia",
      aidin_patronyymi: "Andersdotter",
    });
    expect(virhe).toBe(false);
    expect(kentat(pyynnot[0])).toEqual({
      komento: "haku",
      srk: "0366",
      kirja: "kastetut",
      kieli: "fi",
      maxkpl: "50",
      ietunimi: "Johan",
      ipatronyymi: "Hansson",
      aetunimi: "Ottilia",
      apatronyymi: "Andersdotter",
    });
    const tulos = json as Tulos;
    expect(tulos.lohkot[0]!.tapahtumat).toHaveLength(9);
    expect(tulos).not.toHaveProperty("huomautukset");
  });

  it("maps the child's name and the village, encoding them as latin-1", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-kastetut-perus.html" });
    await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["0366"],
      lapsen_etunimi: "Maria",
      kyla: "Bärnilä",
      alkuvuosi: "1834",
      loppuvuosi: "5.1840",
    });
    expect(pyynnot[0]!.body).toContain("&etunimi=Maria");
    expect(pyynnot[0]!.body).toContain("&ikyla=B%E4rnil%E4");
    expect(kentat(pyynnot[0])).toMatchObject({ alkuvuosi: "1834", loppuvuosi: "5.1840" });
  });

  it("shows fewer events per parish by default when searching several parishes", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-kastetut-katkaistu-monta.html" });
    await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["Orimattila", "Artjärvi"],
      lapsen_etunimi: "Johan",
    });
    expect(kentat(pyynnot[0])).toMatchObject({ srk: "0366,0015", maxkpl: "15" });
  });

  it("explains how to continue a truncated result", async () => {
    const { asiakas } = await yhdista({ fixture: "haku-kastetut-katkaistu.html" });
    const { json } = await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["0366"],
      lapsen_etunimi: "Johan",
      maksimi: 15,
    });
    const tulos = json as Tulos;
    expect(tulos.lohkot[0]!.jatkokohta).toBe("17681");
    expect(tulos.huomautukset).toEqual([
      expect.stringMatching(/Orimattila.*15.*noin 416.*jatkokohta "17681".*0366/) as unknown,
    ]);
  });

  it("passes the continuation point on", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-kastetut-jatko.html" });
    await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["0366"],
      lapsen_etunimi: "Johan",
      jatkokohta: "17681",
    });
    expect(kentat(pyynnot[0])).toMatchObject({ hakupos: "17681" });
  });

  it("tells when a search word is not in Hiski's database", async () => {
    const { asiakas } = await yhdista({ fixture: "haku-kastetut-tyhja.html" });
    const { json } = await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["0366"],
      lapsen_etunimi: "Xyzzyq",
    });
    expect((json as Tulos).huomautukset).toEqual([
      expect.stringMatching(/XYZZYQ.*Lapsen etunimi.*ei ole Hiskin tietokannassa/) as unknown,
    ]);
  });

  it("tells when the years are outside what Hiski has for the parish", async () => {
    const { asiakas } = await yhdista({ fixture: "haku-kastetut-tyhja.html" });
    const { json } = await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["0366"],
      alkuvuosi: "1891",
      loppuvuosi: "21.3.1899",
    });
    expect((json as Tulos).huomautukset).toContainEqual(
      expect.stringMatching(/Orimattila.*1697–1710, 1718–1890.*1891–1899/) as unknown,
    );
  });

  it("treats an empty year as no limit", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-kastetut-perus.html" });
    const { json } = await kutsu(asiakas, "hae_kastetut", {
      seurakunnat: ["0366"],
      alkuvuosi: "",
      loppuvuosi: " ",
    });
    expect(kentat(pyynnot[0])).not.toHaveProperty("alkuvuosi");
    expect(json).not.toHaveProperty("huomautukset");
  });

  it("reports an ambiguous parish and an invalid year without calling Hiski", async () => {
    const { asiakas, pyynnot } = await yhdista();
    const epaselva = await kutsu(asiakas, "hae_kastetut", { seurakunnat: ["Kristiinankaupunki"] });
    expect(epaselva.virhe).toBe(true);
    expect(epaselva.teksti).toContain("0686");
    const vuosi = await kutsu(asiakas, "hae_kastetut", { seurakunnat: ["0366"], alkuvuosi: "abc" });
    expect(vuosi.virhe).toBe(true);
    expect(vuosi.teksti).toContain("alkuvuosi");
    expect(pyynnot).toHaveLength(0);
  });
});

describe("hae_vihityt", () => {
  it("maps both spouses' fields", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-vihityt-monta.html" });
    const { json } = await kutsu(asiakas, "hae_vihityt", {
      seurakunnat: ["0366", "0015"],
      miehen_etunimi: "Johan",
      miehen_patronyymi: "Hansson",
      miehen_sukunimi: "S",
      miehen_ammatti: "Bonde",
      miehen_paikka: "Niemi",
      vaimon_etunimi: "Otteliana",
      vaimon_patronyymi: "Anders",
      vaimon_sukunimi: "T",
      vaimon_ammatti: "Piga",
      vaimon_paikka: "Kuivanto",
    });
    expect(kentat(pyynnot[0])).toMatchObject({
      kirja: "vihityt",
      srk: "0366,0015",
      ietunimi: "Johan",
      ipatronyymi: "Hansson",
      isukunimi: "S",
      iammatti: "Bonde",
      ikyla: "Niemi",
      aetunimi: "Otteliana",
      apatronyymi: "Anders",
      asukunimi: "T",
      aammatti: "Piga",
      akyla: "Kuivanto",
    });
    expect((json as Tulos).lohkot.map((l) => l.tapahtumat.length)).toEqual([0, 2]);
  });
});

describe("hae_haudatut", () => {
  it("maps the deceased's, relative's and burial fields", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-haudatut-monta.html" });
    await kutsu(asiakas, "hae_haudatut", {
      seurakunnat: ["0366", "0015"],
      etunimi: "Johan",
      patronyymi: "Hansson",
      sukunimi: "S",
      ammatti: "Dreng",
      paikka: "Hetana",
      kuolinsyy: "Bukref",
      syntyma_alku: "1820",
      syntyma_loppu: "12.1830",
      ika: "28",
      omaisen_etunimi: "Maria",
      omaisen_patronyymi: "Eriksdr",
      omaisen_sukunimi: "K",
      omaisen_ammatti: "Hustru",
    });
    expect(kentat(pyynnot[0])).toMatchObject({
      kirja: "haudatut",
      ietunimi: "Johan",
      ipatronyymi: "Hansson",
      isukunimi: "S",
      iammatti: "Dreng",
      ikyla: "Hetana",
      ksyy: "Bukref",
      syntalku: "1820",
      syntloppu: "12.1830",
      ika: "28",
      aetunimi: "Maria",
      apatronyymi: "Eriksdr",
      asukunimi: "K",
      aammatti: "Hustru",
    });
  });
});

describe("hae_muuttaneet", () => {
  it("searches moves into the parish", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-smuutt.html" });
    const { json } = await kutsu(asiakas, "hae_muuttaneet", {
      seurakunnat: ["Artjärvi"],
      suunta: "sisaan",
      etunimi: "Anna",
      patronyymi: "Josephsdr",
      sukunimi: "S",
      ammatti: "Pig",
      kyla: "Kintula",
      toinen_paikka: "Hauho",
    });
    expect(kentat(pyynnot[0])).toMatchObject({
      kirja: "smuutt",
      ietunimi: "Anna",
      ipatronyymi: "Josephsdr",
      isukunimi: "S",
      iammatti: "Pig",
      ikyla: "Kintula",
      kohde: "Hauho",
    });
    expect((json as Tulos).lohkot[0]!.kirja).toBe("smuutt");
  });

  it("searches moves out of the parish", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-umuutt.html" });
    await kutsu(asiakas, "hae_muuttaneet", { seurakunnat: ["0015"], suunta: "pois" });
    expect(kentat(pyynnot[0])).toMatchObject({ kirja: "umuutt" });
  });

  it("tells when the parish has no migration records", async () => {
    const { asiakas } = await yhdista({ fixture: "haku-ei-lohkoja.html" });
    const { virhe, json } = await kutsu(asiakas, "hae_muuttaneet", {
      seurakunnat: ["Orimattila"],
      suunta: "sisaan",
    });
    expect(virhe).toBe(false);
    expect((json as Tulos).huomautukset).toEqual([
      "Seurakunnalla Orimattila (0366) ei ole Hiskissä kirjaa sisäänmuuttaneet.",
    ]);
  });
});

describe("hae_kaikki", () => {
  it("maps the person's fields and the free text", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "haku-kaikki.html" });
    const { json } = await kutsu(asiakas, "hae_kaikki", {
      seurakunnat: ["0366"],
      etunimi: "Johan",
      patronyymi: "Hansson",
      sukunimi: "S",
      ammatti: "Bonde",
      paikka: "Niemi",
      sisaltaa_tekstin: "Bonde",
      ei_sisalla_tekstia: "Torp",
    });
    expect(kentat(pyynnot[0])).toMatchObject({
      kirja: "kaikki",
      ietunimi: "Johan",
      ipatronyymi: "Hansson",
      isukunimi: "S",
      iammatti: "Bonde",
      ikyla: "Niemi",
      vapaaAND: "Bonde",
      vapaaNOT: "Torp",
    });
    expect((json as Tulos).lohkot.map((l) => l.kirja)).toEqual(["kastetut", "vihityt"]);
  });
});
