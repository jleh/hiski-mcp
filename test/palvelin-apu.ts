import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { HiskiClient } from "../src/client.js";
import { luoPalvelin } from "../src/server.js";
import { FIXTURE_KANSIO } from "./helpers.js";

export type Vastaus = { fixture: string; charset?: string } | { status: number; teksti?: string };

export interface Pyynto {
  url: string;
  body?: string;
}

/**
 * Connects an MCP client to the server in memory. Hiski is replaced by a
 * fetch that answers with fixtures in order and records the requests.
 */
export async function yhdista(...vastaukset: Vastaus[]) {
  const pyynnot: Pyynto[] = [];
  const fetch: typeof globalThis.fetch = (osoite, init) => {
    const url = osoite instanceof Request ? osoite.url : osoite.toString();
    pyynnot.push({ url, ...(typeof init?.body === "string" && { body: init.body }) });
    const vastaus = vastaukset[pyynnot.length - 1];
    if (!vastaus) return Promise.reject(new Error(`Odottamaton pyyntö ${url}`));
    if ("fixture" in vastaus) {
      const tyyppi = `text/html${vastaus.charset ? `; charset=${vastaus.charset}` : ""}`;
      const tavut = readFileSync(FIXTURE_KANSIO + vastaus.fixture);
      return Promise.resolve(new Response(tavut, { headers: { "content-type": tyyppi } }));
    }
    return Promise.resolve(new Response(vastaus.teksti ?? "", { status: vastaus.status }));
  };
  const hiski = new HiskiClient({ fetch, odota: () => Promise.resolve() });
  const [asiakkaanPaa, palvelimenPaa] = InMemoryTransport.createLinkedPair();
  const palvelin = luoPalvelin(hiski);
  await palvelin.connect(palvelimenPaa);
  const asiakas = new Client({ name: "testi", version: "0.0.0" });
  await asiakas.connect(asiakkaanPaa);
  return { asiakas, pyynnot };
}

/** Calls a tool and returns its text answer, parsed as JSON when possible. */
export async function kutsu(
  asiakas: Client,
  nimi: string,
  args: Record<string, unknown>,
): Promise<{ virhe: boolean; teksti: string; json?: unknown }> {
  const tulos = await asiakas.callTool({ name: nimi, arguments: args });
  const sisalto = tulos.content as { type: string; text: string }[];
  const teksti = sisalto.map((s) => s.text).join("\n");
  let json: unknown;
  try {
    json = JSON.parse(teksti);
  } catch {
    json = undefined;
  }
  return { virhe: tulos.isError === true, teksti, ...(json !== undefined && { json }) };
}
