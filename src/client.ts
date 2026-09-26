import { decodeLatin1 } from "./encoding.js";
import { HISKI_URL, parseHakutulos, type HakuKirja, type HakuTulos } from "./hakutulos.js";
import { koodaaLatin1, LomakeVirhe, rakennaHakulomake, type HakuPyynto } from "./lomake.js";
import {
  parseSeurakuntasivu,
  parseSeurakuntatiedot,
  type Seurakuntasivu,
  type Seurakuntatiedot,
} from "./seurakuntasivu.js";
import { parseTapahtumasivu, type TapahtumanTiedot } from "./tapahtumasivu.js";
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
  /** Waits before a retry; injectable so tests need not wait. */
  odota?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** Attempts at an event page, which Hiski intermittently answers with an error page. */
  yrityksia?: number;
  uudelleenyritysMs?: number;
  /** How long one request may take. */
  aikakatkaisuMs?: number;
}

export type TapahtumanHaku =
  | { tila: "ok"; tapahtuma: TapahtumanTiedot & { numero: number; url: string } }
  /** The event number does not exist in the book. */
  | { tila: "ei_loytynyt" }
  /** Hiski kept answering with its error page. */
  | { tila: "virhe" };

const USER_AGENT = `${SERVER_NAME}/${SERVER_VERSION} (+https://github.com/jleh/hiski-mcp)`;

export type SeurakunnanHaku =
  | {
      tila: "ok";
      sivu: Extract<Seurakuntasivu, { tila: "ok" }>;
      /** Background from the parish info page, when it has any and could be fetched. */
      tiedot?: Extract<Seurakuntatiedot, { tila: "ok" }>;
    }
  | { tila: "ei_loytynyt" };

/** Talks to Hiski using web-standard APIs only, so it also runs outside Node. */
export class HiskiClient {
  readonly #fetch: typeof fetch;
  readonly #odota: (ms: number, signal?: AbortSignal) => Promise<void>;
  readonly #yrityksia: number;
  readonly #uudelleenyritysMs: number;
  readonly #aikakatkaisuMs: number;

  constructor(asetukset: ClientAsetukset = {}) {
    // Workers and browsers require fetch to be called without another `this`.
    this.#fetch = asetukset.fetch ?? ((osoite, init) => fetch(osoite, init));
    this.#odota = asetukset.odota ?? odota;
    this.#yrityksia = asetukset.yrityksia ?? 5;
    this.#uudelleenyritysMs = asetukset.uudelleenyritysMs ?? 1500;
    this.#aikakatkaisuMs = asetukset.aikakatkaisuMs ?? 30_000;
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

  /**
   * Fetches one event's page. Hiski answers about half of these requests with
   * an error page, so that page is retried a few times before giving up.
   */
  async tapahtuma(
    koodi: string,
    kirja: HakuKirja,
    numero: number,
    signal?: AbortSignal,
  ): Promise<TapahtumanHaku> {
    if (!/^\d{4}$/.test(koodi)) throw new LomakeVirhe(`Seurakuntakoodi "${koodi}" ei kelpaa.`);
    if (!Number.isSafeInteger(numero) || numero < 0) {
      throw new LomakeVirhe(`Tapahtuman numero ${numero} ei kelpaa.`);
    }
    const url = `${HISKI_URL}?fi+${koodi}+${kirja}+${numero}`;
    for (let yritys = 1; ; yritys++) {
      const sivu = parseTapahtumasivu(await this.#lataa(url, {}, signal));
      if (sivu.tila === "ok") return { tila: "ok", tapahtuma: { ...sivu.tapahtuma, numero, url } };
      if (sivu.tila === "ei_loytynyt" || yritys >= this.#yrityksia) return { tila: sivu.tila };
      await this.#odota(this.#uudelleenyritysMs, signal);
    }
  }

  /**
   * Fetches a parish's page and then its info page. The info page is only
   * background, so the answer is given without it if it cannot be fetched.
   */
  async seurakunta(koodi: string, signal?: AbortSignal): Promise<SeurakunnanHaku> {
    if (!/^\d{4}$/.test(koodi)) throw new LomakeVirhe(`Seurakuntakoodi "${koodi}" ei kelpaa.`);
    const sivu = parseSeurakuntasivu(await this.#lataa(`${HISKI_URL}?fi+${koodi}`, {}, signal));
    if (sivu.tila !== "ok") return sivu;
    if (!sivu.lisatiedot_url) return { tila: "ok", sivu };
    let tiedot: Seurakuntatiedot | undefined;
    try {
      tiedot = parseSeurakuntatiedot(await this.#lataa(sivu.lisatiedot_url, {}, signal));
    } catch {
      // A cancelled request stays cancelled; otherwise only background is missing.
      signal?.throwIfAborted();
    }
    return { tila: "ok", sivu, ...(tiedot?.tila === "ok" && { tiedot }) };
  }

  /**
   * Fetches a page and decodes it. Failures become HiskiVirhe with a message
   * saying what to do; a cancellation by the caller is passed through as is.
   */
  async #lataa(url: string, init: RequestInit, signal?: AbortSignal): Promise<string> {
    const headers = new Headers(init.headers);
    headers.set("user-agent", USER_AGENT);
    const aikaraja = AbortSignal.timeout(this.#aikakatkaisuMs);
    const yhdistetty = signal ? AbortSignal.any([signal, aikaraja]) : aikaraja;
    try {
      const vastaus = await this.#fetch(url, { ...init, headers, signal: yhdistetty });
      if (!vastaus.ok) throw await vastausvirhe(vastaus);
      return dekoodaa(vastaus.headers.get("content-type"), await vastaus.arrayBuffer());
    } catch (virhe) {
      signal?.throwIfAborted();
      if (virhe instanceof HiskiVirhe) throw virhe;
      if (aikaraja.aborted) {
        throw new HiskiVirhe("Hiski ei vastannut ajoissa. Yritä hetken kuluttua uudelleen.", {
          cause: virhe,
        });
      }
      throw new HiskiVirhe("Hiskiin ei saatu yhteyttä. Tarkista verkkoyhteys ja yritä uudelleen.", {
        cause: virhe,
      });
    }
  }
}

/** Waits unless the signal aborts first. */
function odota(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((ratkaise, hylkaa) => {
    signal?.throwIfAborted();
    const ajastin = setTimeout(() => {
      signal?.removeEventListener("abort", keskeyta);
      ratkaise();
    }, ms);
    function keskeyta() {
      clearTimeout(ajastin);
      const syy: unknown = signal!.reason;
      hylkaa(syy instanceof Error ? syy : new DOMException("Peruttu", "AbortError"));
    }
    signal?.addEventListener("abort", keskeyta, { once: true });
  });
}

/** Explains a failed response; Cloudflare's bot check gets its own message. */
async function vastausvirhe(vastaus: Response): Promise<HiskiVirhe> {
  const teksti = await vastaus.text().catch(() => "");
  if (vastaus.headers.has("cf-mitigated") || /Just a moment/i.test(teksti)) {
    return new HiskiVirhe(
      "Hiskin suojaus (Cloudflare) esti pyynnön. Yritä hetken kuluttua uudelleen.",
    );
  }
  return new HiskiVirhe(
    `Hiski vastasi virheellä (HTTP ${vastaus.status}). Yritä hetken kuluttua uudelleen.`,
  );
}

/**
 * Hiski's own pages are ISO-8859-1 without saying so; others declare a charset,
 * possibly quoted. An unknown charset falls back to ISO-8859-1.
 */
function dekoodaa(sisaltotyyppi: string | null, tavut: ArrayBuffer): string {
  const merkisto = /charset="?([\w-]+)/i.exec(sisaltotyyppi ?? "")?.[1];
  if (merkisto) {
    try {
      return new TextDecoder(merkisto).decode(tavut);
    } catch {
      // Not a charset TextDecoder knows.
    }
  }
  return decodeLatin1(new Uint8Array(tavut));
}
