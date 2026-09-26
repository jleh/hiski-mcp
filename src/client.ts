import { decodeLatin1 } from "./encoding.js";
import { HISKI_URL, parseHakutulos, type HakuTulos } from "./hakutulos.js";
import { koodaaLatin1, rakennaHakulomake, type HakuPyynto } from "./lomake.js";
import { SERVER_NAME, SERVER_VERSION } from "./version.js";

/** Hiski could not be reached or refused the request; the message says what to do. */
export class HiskiVirhe extends Error {
  constructor(viesti: string, options?: ErrorOptions) {
    super(viesti, options);
    this.name = "HiskiVirhe";
  }
}

export interface ClientAsetukset {
  fetch?: typeof fetch;
}

const USER_AGENT = `${SERVER_NAME}/${SERVER_VERSION} (+https://github.com/jleh/hiski-mcp)`;

/** Talks to Hiski using web-standard APIs only, so it also runs outside Node. */
export class HiskiClient {
  readonly #fetch: typeof fetch;

  constructor(asetukset: ClientAsetukset = {}) {
    this.#fetch = asetukset.fetch ?? fetch;
  }

  /** Runs a search. Throws LomakeVirhe for an invalid request before contacting Hiski. */
  async haku(pyynto: HakuPyynto, signal?: AbortSignal): Promise<HakuTulos> {
    const body = koodaaLatin1(rakennaHakulomake(pyynto));
    const html = await this.#lataa(
      HISKI_URL,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      },
      signal,
    );
    return parseHakutulos(html);
  }

  async #lataa(url: string, init: RequestInit, signal?: AbortSignal): Promise<string> {
    const headers = new Headers(init.headers);
    headers.set("user-agent", USER_AGENT);
    const vastaus = await this.#fetch(url, { ...init, headers, signal });
    return dekoodaa(vastaus.headers.get("content-type"), await vastaus.arrayBuffer());
  }
}

/** Hiski's own pages are ISO-8859-1 without saying so; others declare a charset. */
function dekoodaa(sisaltotyyppi: string | null, tavut: ArrayBuffer): string {
  const merkisto = /charset=([\w-]+)/i.exec(sisaltotyyppi ?? "")?.[1];
  return merkisto ? new TextDecoder(merkisto).decode(tavut) : decodeLatin1(new Uint8Array(tavut));
}
