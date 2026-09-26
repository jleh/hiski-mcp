import type { HakuKirja } from "./hakutulos.js";

/** A search request that cannot be sent to Hiski; the message says why. */
export class LomakeVirhe extends Error {
  constructor(viesti: string) {
    super(viesti);
    this.name = "LomakeVirhe";
  }
}

export type Lomakekirja = HakuKirja | "kaikki";

/** A search in Hiski's own terms: form field names and parish codes. */
export interface HakuPyynto {
  kirja: Lomakekirja;
  /** Four-digit parish codes. */
  seurakunnat: string[];
  /** Hiski's form fields, e.g. { ietunimi: "Johan", ikyla: "Niemi" }. */
  kentat?: Record<string, string | undefined>;
  alkuvuosi?: string;
  loppuvuosi?: string;
  /** Events to show per parish; rounded up to a value Hiski offers. Defaults to 50. */
  maksimi?: number;
  /** Continues a truncated search in one parish (Hiski's hakupos). */
  jatkokohta?: string;
}

const HENKILO = ["ietunimi", "ipatronyymi", "isukunimi", "iammatti", "ikyla"];
const OMAINEN = ["aetunimi", "apatronyymi", "asukunimi", "aammatti"];

/** The fields on each book's search form. */
const KENTAT: Record<Lomakekirja, ReadonlySet<string>> = {
  kastetut: new Set(["etunimi", ...HENKILO, ...OMAINEN]),
  vihityt: new Set([...HENKILO, ...OMAINEN, "akyla"]),
  haudatut: new Set([...HENKILO, ...OMAINEN, "ksyy", "syntalku", "syntloppu", "ika"]),
  smuutt: new Set([...HENKILO, "kohde"]),
  umuutt: new Set([...HENKILO, "kohde"]),
  kaikki: new Set([...HENKILO, "vapaaAND", "vapaaNOT"]),
};

/** Fields holding a date in the same format as the years. */
const PAIVAMAARAKENTAT = new Set(["syntalku", "syntloppu"]);

const MAKSIMIT = [15, 30, 50, 100, 250, 500, 1000] as const;
const OLETUSMAKSIMI = 50;
/** Hiski's input fields accept at most this many characters. */
const KENTAN_PITUUS = 30;

/** Characters a browser leaves unescaped in a form body. */
const SELLAISENAAN = /[A-Za-z0-9*\-._]/;

/**
 * Encodes form fields as application/x-www-form-urlencoded in ISO-8859-1,
 * which Hiski expects (URLSearchParams would encode UTF-8, and Hiski would
 * then search for "BÃ¤rnilÃ¤").
 */
export function koodaaLatin1(kentat: [string, string][]): string {
  return kentat.map(([nimi, arvo]) => `${koodaa(nimi)}=${koodaa(arvo)}`).join("&");
}

function koodaa(teksti: string): string {
  let tulos = "";
  for (const merkki of teksti) {
    const koodi = merkki.codePointAt(0)!;
    if (merkki === " ") tulos += "+";
    else if (SELLAISENAAN.test(merkki)) tulos += merkki;
    else if (koodi <= 0xff) tulos += `%${koodi.toString(16).toUpperCase().padStart(2, "0")}`;
    else throw new LomakeVirhe(`Merkkiä "${merkki}" ei voi hakea Hiskistä.`);
  }
  return tulos;
}

/**
 * Checks a year or date in a format Hiski understands: vvvv, kk.vvvv or
 * pp.kk.vvvv. Hiski silently ignores anything else and searches all years.
 */
export function tarkistaVuosi(arvo: string, kentta: string): void {
  const virhe = () =>
    new LomakeVirhe(
      `${kentta} "${arvo}" ei kelpaa. Käytä muotoa vvvv, kk.vvvv tai pp.kk.vvvv (esim. 1834, 5.1834 tai 21.9.1834).`,
    );
  const osat = /^(?:(?:(\d{1,2})\.)?(\d{1,2})\.)?(\d{4})$/.exec(arvo);
  if (!osat) throw virhe();
  const [, paiva, kuukausi, vuosi] = osat;
  if (kuukausi === undefined) return;
  const kk = Number(kuukausi);
  if (kk < 1 || kk > 12) throw virhe();
  if (paiva === undefined) return;
  const pv = Number(paiva);
  const paiviaKuussa = new Date(Date.UTC(Number(vuosi), kk, 0)).getUTCDate();
  if (pv < 1 || pv > paiviaKuussa) throw virhe();
}

/** The smallest per-parish maximum Hiski offers that is at least n (at most 1000). */
export function pyoristaMaksimi(n: number): number {
  return MAKSIMIT.find((m) => m >= n) ?? MAKSIMIT.at(-1)!;
}

/** Validates a search and returns the form fields to send to Hiski. */
export function rakennaHakulomake(pyynto: HakuPyynto): [string, string][] {
  const { kirja, seurakunnat, kentat = {}, alkuvuosi, loppuvuosi, jatkokohta } = pyynto;
  if (seurakunnat.length === 0) throw new LomakeVirhe("Anna vähintään yksi seurakunta.");
  for (const koodi of seurakunnat) {
    if (!/^\d{4}$/.test(koodi)) {
      throw new LomakeVirhe(`Seurakuntakoodi "${koodi}" ei kelpaa; koodissa on neljä numeroa.`);
    }
  }
  if (jatkokohta !== undefined) {
    if (seurakunnat.length !== 1) {
      throw new LomakeVirhe("Hakua voi jatkaa vain yhden seurakunnan osalta kerrallaan.");
    }
    if (!/^\d+$/.test(jatkokohta)) throw new LomakeVirhe(`jatkokohta "${jatkokohta}" ei kelpaa.`);
  }

  const lomake: [string, string][] = [
    ["komento", "haku"],
    ["srk", seurakunnat.join(",")],
    ["kirja", kirja],
    ["kieli", "fi"],
    ["maxkpl", String(pyoristaMaksimi(pyynto.maksimi ?? OLETUSMAKSIMI))],
  ];
  const vuodet = { alkuvuosi: alkuvuosi?.trim(), loppuvuosi: loppuvuosi?.trim() };
  for (const [nimi, arvo] of Object.entries(vuodet)) {
    if (!arvo) continue;
    tarkistaVuosi(arvo, nimi);
    lomake.push([nimi, arvo]);
  }
  for (const [nimi, raaka] of Object.entries(kentat)) {
    const arvo = raaka?.trim();
    if (!arvo) continue;
    if (!KENTAT[kirja].has(nimi)) {
      throw new LomakeVirhe(`Kenttää "${nimi}" ei ole kirjan ${kirja} hakulomakkeella.`);
    }
    if (arvo.length > KENTAN_PITUUS) {
      throw new LomakeVirhe(
        `Kentän "${nimi}" arvo on liian pitkä (enintään ${KENTAN_PITUUS} merkkiä).`,
      );
    }
    if (PAIVAMAARAKENTAT.has(nimi)) tarkistaVuosi(arvo, nimi);
    lomake.push([nimi, arvo]);
  }
  if (jatkokohta !== undefined) lomake.push(["hakupos", jatkokohta]);
  return lomake;
}
