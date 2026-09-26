import { describe, expect, it } from "vitest";
import { kutsu, yhdista, yhdistaFetchilla } from "./palvelin-apu.js";

describe("hae_tapahtuma", () => {
  it("returns the event with split names, its number and address", async () => {
    const { asiakas, pyynnot } = await yhdista({ fixture: "tapahtuma-kastetut.html" });
    const { virhe, json } = await kutsu(asiakas, "hae_tapahtuma", {
      seurakunta: "Orimattila",
      kirja: "kastetut",
      numero: 18795,
    });
    expect(virhe).toBe(false);
    expect(pyynnot[0]!.url).toBe("https://hiski.genealogia.fi/hiski?fi+0366+kastetut+18795");
    expect(json).toMatchObject({
      numero: 18795,
      url: "https://hiski.genealogia.fi/hiski?fi+0366+kastetut+18795",
      isa: { ammatti: "B.", etunimi: "Johan", patronyymi: "Hansson" },
      lapsi: "Maria Sofia",
    });
  });

  it("tells when the event does not exist", async () => {
    const { asiakas } = await yhdista({ fixture: "tapahtuma-olematon.html" });
    const { virhe, json } = await kutsu(asiakas, "hae_tapahtuma", {
      seurakunta: "0366",
      kirja: "kastetut",
      numero: 99999999,
    });
    expect(virhe).toBe(false);
    expect(json).toEqual({
      huomautus:
        "Seurakunnan Orimattila (0366) kirjassa kastetut ei ole tapahtumaa numero 99999999.",
    });
  });

  it("reports an error when Hiski keeps answering with its error page", async () => {
    const virhesivu = { fixture: "tapahtuma-virhe.html" };
    const { asiakas } = await yhdista(virhesivu, virhesivu, virhesivu, virhesivu, virhesivu);
    const { virhe, teksti } = await kutsu(asiakas, "hae_tapahtuma", {
      seurakunta: "0366",
      kirja: "kastetut",
      numero: 18795,
    });
    expect(virhe).toBe(true);
    expect(teksti).toMatch(/yritä .*uudelleen/i);
  });
});

describe("errors", () => {
  it("passes on Hiski's HTTP error as a tool error", async () => {
    const { asiakas } = await yhdista({ status: 500 });
    const { virhe, teksti } = await kutsu(asiakas, "hae_kastetut", { seurakunnat: ["0366"] });
    expect(virhe).toBe(true);
    expect(teksti).toContain("HTTP 500");
  });

  it("explains an unexpected page and where to report it", async () => {
    // A search result page where a parish page was expected.
    const { asiakas } = await yhdista({ fixture: "haku-kastetut-perus.html" });
    const { virhe, teksti } = await kutsu(asiakas, "seurakunnan_tiedot", { seurakunta: "0366" });
    expect(virhe).toBe(true);
    expect(teksti).toContain("odottamattoman muotoinen");
    expect(teksti).toContain("https://github.com/jleh/hiski-mcp/issues");
  });

  it("cancels the request to Hiski when the call is cancelled", async () => {
    let peruttu = false;
    const fetch: typeof globalThis.fetch = (_osoite, init) =>
      new Promise((_ratkaise, hylkaa) => {
        init?.signal?.addEventListener("abort", () => {
          peruttu = true;
          hylkaa(new Error("peruttu"));
        });
      });
    const asiakas = await yhdistaFetchilla(fetch);
    const peruutus = new AbortController();
    const kutsuttu = asiakas.callTool(
      { name: "hae_kastetut", arguments: { seurakunnat: ["0366"] } },
      undefined,
      { signal: peruutus.signal },
    );
    await new Promise((r) => setTimeout(r, 20));
    peruutus.abort();
    await expect(kutsuttu).rejects.toThrow();
    await expect.poll(() => peruttu).toBe(true);
  });
});
