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

function client(...vastaukset: Vastaus[]) {
  const { fetch, pyynnot } = mockFetch(...vastaukset);
  return { hiski: new HiskiClient({ fetch }), pyynnot };
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
