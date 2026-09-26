import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HiskiClient } from "../src/client.js";
import { FIXTURE_KANSIO } from "./helpers.js";

interface Pyynto {
  url: string;
  method: string;
  headers: Headers;
  body?: string;
}

type Vastaus =
  | { fixture: string; charset?: string }
  | { status: number; teksti?: string; headers?: Record<string, string> };

/** A fetch that records requests and answers them in order. */
function mockFetch(...vastaukset: Vastaus[]) {
  const pyynnot: Pyynto[] = [];
  const fetch: typeof globalThis.fetch = (osoite, init) => {
    const url = osoite instanceof Request ? osoite.url : osoite.toString();
    const body = init?.body;
    pyynnot.push({
      url,
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      ...(typeof body === "string" && { body }),
    });
    const vastaus = vastaukset[pyynnot.length - 1];
    if (!vastaus) throw new Error(`Odottamaton pyyntö ${url}`);
    if ("fixture" in vastaus) {
      const tyyppi = `text/html${vastaus.charset ? `; charset=${vastaus.charset}` : ""}`;
      const tavut = readFileSync(FIXTURE_KANSIO + vastaus.fixture);
      return Promise.resolve(new Response(tavut, { headers: { "content-type": tyyppi } }));
    }
    return Promise.resolve(
      new Response(vastaus.teksti ?? "", { status: vastaus.status, headers: vastaus.headers }),
    );
  };
  return { fetch, pyynnot };
}

/** A client whose waits before retries resolve at once and are recorded. */
function client(...vastaukset: Vastaus[]) {
  const { fetch, pyynnot } = mockFetch(...vastaukset);
  const odotukset: number[] = [];
  const odota = (ms: number) => {
    odotukset.push(ms);
    return Promise.resolve();
  };
  return { hiski: new HiskiClient({ fetch, odota }), pyynnot, odotukset };
}

describe("HiskiClient.haku", () => {
  it("posts a latin-1 form to Hiski and parses the result", async () => {
    const { hiski, pyynnot } = client({ fixture: "haku-kastetut-perus.html" });
    const tulos = await hiski.haku({
      kirja: "kastetut",
      seurakunnat: ["0366"],
      kentat: { ietunimi: "Johan", ikyla: "Bärnilä" },
    });
    expect(tulos.lohkot[0]!.tapahtumat).toHaveLength(9);
    const [pyynto] = pyynnot;
    expect(pyynto).toMatchObject({ url: "https://hiski.genealogia.fi/hiski", method: "POST" });
    expect(pyynto!.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    expect(pyynto!.headers.get("user-agent")).toMatch(
      /^hiski-mcp\/\d+\.\d+\.\d+ \(\+https:\/\/github\.com\/jleh\/hiski-mcp\)$/,
    );
    expect(pyynto!.body).toBe(
      "komento=haku&srk=0366&kirja=kastetut&kieli=fi&maxkpl=50&ietunimi=Johan&ikyla=B%E4rnil%E4",
    );
  });

  it("sends the continuation point", async () => {
    const { hiski, pyynnot } = client({ fixture: "haku-kastetut-jatko.html" });
    const tulos = await hiski.haku({
      kirja: "kastetut",
      seurakunnat: ["0366"],
      kentat: { etunimi: "Johan" },
      jatkokohta: "17681",
    });
    expect(pyynnot[0]!.body).toContain("&hakupos=17681");
    expect(tulos.lohkot[0]!.tapahtumat[0]!.numero).toBe(17685);
  });

  it("rejects an invalid request without calling Hiski", async () => {
    const { hiski, pyynnot } = client();
    await expect(
      hiski.haku({ kirja: "kastetut", seurakunnat: ["0366"], alkuvuosi: "abc" }),
    ).rejects.toThrow(/alkuvuosi/);
    expect(pyynnot).toHaveLength(0);
  });
});

describe("HiskiClient.tapahtuma", () => {
  const VIRHE = { fixture: "tapahtuma-virhe.html" };

  it("fetches and parses an event page, adding its number and address", async () => {
    const { hiski, pyynnot } = client({ fixture: "tapahtuma-kastetut.html" });
    const sivu = await hiski.tapahtuma("0366", "kastetut", 18795);
    expect(pyynnot[0]).toMatchObject({
      url: "https://hiski.genealogia.fi/hiski?fi+0366+kastetut+18795",
      method: "GET",
    });
    expect(sivu).toMatchObject({
      tila: "ok",
      tapahtuma: {
        numero: 18795,
        url: "https://hiski.genealogia.fi/hiski?fi+0366+kastetut+18795",
        lapsi: "Maria Sofia",
      },
    });
  });

  it("retries Hiski's intermittent error page", async () => {
    const { hiski, pyynnot, odotukset } = client(VIRHE, VIRHE, {
      fixture: "tapahtuma-kastetut.html",
    });
    expect((await hiski.tapahtuma("0366", "kastetut", 18795)).tila).toBe("ok");
    expect(pyynnot).toHaveLength(3);
    expect(odotukset).toEqual([1500, 1500]);
  });

  it("gives up after the configured number of attempts", async () => {
    const { hiski, pyynnot } = client(VIRHE, VIRHE, VIRHE, VIRHE, VIRHE);
    expect(await hiski.tapahtuma("0366", "kastetut", 18795)).toEqual({ tila: "virhe" });
    expect(pyynnot).toHaveLength(5);
  });

  it("does not retry an event that does not exist", async () => {
    const { hiski, pyynnot } = client({ fixture: "tapahtuma-olematon.html" });
    expect(await hiski.tapahtuma("0366", "kastetut", 99999999)).toEqual({ tila: "ei_loytynyt" });
    expect(pyynnot).toHaveLength(1);
  });

  it("rejects an invalid parish code or event number without calling Hiski", async () => {
    const { hiski, pyynnot } = client();
    await expect(hiski.tapahtuma("366", "kastetut", 1)).rejects.toThrow(/366/);
    await expect(hiski.tapahtuma("0366", "kastetut", -1)).rejects.toThrow(/-1/);
    expect(pyynnot).toHaveLength(0);
  });
});

describe("HiskiClient: cancellation", () => {
  it("passes the signal to fetch and stops waiting for a retry when cancelled", async () => {
    const peruutus = new AbortController();
    const signaalit: (AbortSignal | null | undefined)[] = [];
    const fetch: typeof globalThis.fetch = (_osoite, init) => {
      signaalit.push(init?.signal);
      // Cancel while the client is about to wait before retrying.
      peruutus.abort(new Error("peruttu"));
      const tavut = readFileSync(FIXTURE_KANSIO + "tapahtuma-virhe.html");
      return Promise.resolve(new Response(tavut));
    };
    const hiski = new HiskiClient({ fetch, uudelleenyritysMs: 60_000 });
    await expect(hiski.tapahtuma("0366", "kastetut", 1, peruutus.signal)).rejects.toThrow(
      "peruttu",
    );
    expect(signaalit).toHaveLength(1);
    expect(signaalit[0]).toBeInstanceOf(AbortSignal);
  });
});
