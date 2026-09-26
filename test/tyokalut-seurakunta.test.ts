import { describe, expect, it } from "vitest";
import { kutsu, yhdista } from "./palvelin-apu.js";

describe("etsi_seurakunta", () => {
  it("finds a parish by its Swedish name with its years as text", async () => {
    const { asiakas, pyynnot } = await yhdista();
    const { virhe, json } = await kutsu(asiakas, "etsi_seurakunta", { nimi: "Artsjö" });
    expect(virhe).toBe(false);
    expect(json).toEqual({
      osumat: [
        {
          koodi: "0015",
          nimi: "Artjärvi",
          rinnakkaisnimi: "Artsjö",
          vuodet: {
            kastetut: "1695–1718, 1720–1911",
            vihityt: "1730–1918",
            haudatut: "1732–1919",
            smuutt: "1741–1747",
            umuutt: "1741–1747",
          },
        },
      ],
    });
    expect(pyynnot).toHaveLength(0);
  });

  it("leaves out books the parish does not have", async () => {
    const { asiakas } = await yhdista();
    const { json } = await kutsu(asiakas, "etsi_seurakunta", { nimi: "Orimattila" });
    expect(json).toMatchObject({
      osumat: [{ koodi: "0366", vuodet: { kastetut: "1697–1710, 1718–1890" } }],
    });
    expect((json as { osumat: { vuodet: object }[] }).osumat[0]!.vuodet).not.toHaveProperty(
      "smuutt",
    );
  });

  it("lists every candidate for an inflected name", async () => {
    const { asiakas } = await yhdista();
    const { json } = await kutsu(asiakas, "etsi_seurakunta", { nimi: "Kristiinankaupunki" });
    expect((json as { osumat: { koodi: string }[] }).osumat.map((o) => o.koodi).sort()).toEqual([
      "0236",
      "0686",
    ]);
  });

  it("caps the list and says how many there were", async () => {
    const { asiakas } = await yhdista();
    const { json } = await kutsu(asiakas, "etsi_seurakunta", { nimi: "srk" });
    const tulos = json as { osumat: unknown[]; yhteensa: number };
    expect(tulos.osumat).toHaveLength(20);
    expect(tulos.yhteensa).toBeGreaterThan(20);
  });

  it("explains when nothing matches", async () => {
    const { asiakas } = await yhdista();
    const { virhe, json } = await kutsu(asiakas, "etsi_seurakunta", { nimi: "xyzzy" });
    expect(virhe).toBe(false);
    expect(json).toMatchObject({ osumat: [], huomautus: expect.any(String) as unknown });
  });
});

describe("seurakunnan_tiedot", () => {
  it("combines the parish page and its info page", async () => {
    const { asiakas, pyynnot } = await yhdista(
      { fixture: "seurakunta-0366.html" },
      { fixture: "seurakuntatiedot-366.html", charset: "UTF-8" },
    );
    const { virhe, json } = await kutsu(asiakas, "seurakunnan_tiedot", {
      seurakunta: "Orimattila",
    });
    expect(virhe).toBe(false);
    expect(pyynnot[0]!.url).toBe("https://hiski.genealogia.fi/hiski?fi+0366");
    expect(json).toMatchObject({
      koodi: "0366",
      nimi: "Orimattila",
      kirjat: { kastetut: "1697–1710, 1718–1890", kaikki: "1697–1890" },
      maakunta: "Päijät-Häme",
    });
    const tiedot = json as { naapurit: { koodi: string }[]; kylat: string[]; historia: string[] };
    expect(tiedot.naapurit).toContainEqual({ koodi: "0015", nimi: "Artjärvi - Artsjö" });
    expect(tiedot.kylat).toContain("Heinämaa (Hyyttäri)");
    expect(tiedot.historia).toHaveLength(2);
  });

  it("keeps the Karelian note", async () => {
    const { asiakas } = await yhdista({ fixture: "seurakunta-0627.html" }, { status: 404 });
    const { json } = await kutsu(asiakas, "seurakunnan_tiedot", { seurakunta: "0627" });
    expect(json).toMatchObject({
      huomautus: { teksti: expect.stringContaining("Karjala-tietokantasäätiö") as unknown },
    });
  });

  it("reports an ambiguous name with the candidates and the search tool", async () => {
    const { asiakas, pyynnot } = await yhdista();
    const { virhe, teksti } = await kutsu(asiakas, "seurakunnan_tiedot", {
      seurakunta: "Kristiinankaupunki",
    });
    expect(virhe).toBe(true);
    expect(teksti).toContain("0236");
    expect(teksti).toContain("etsi_seurakunta");
    expect(pyynnot).toHaveLength(0);
  });

  it("reports a parish Hiski does not know", async () => {
    const { asiakas } = await yhdista({ fixture: "seurakunta-tuntematon.html" });
    const { virhe, teksti } = await kutsu(asiakas, "seurakunnan_tiedot", { seurakunta: "0366" });
    expect(virhe).toBe(true);
    expect(teksti).toContain("0366");
  });
});
