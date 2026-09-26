import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { Element } from "domhandler";
import { HISKI_URL, type HakuKirja, type Kommentti } from "./hakutulos.js";
import { jasennaSolu, type Solu } from "./solu.js";
import { siisti } from "./teksti.js";

interface Yhteiset {
  seurakunta: { koodi: string; nimi: string };
  /** Hiski's permanent link to this event. */
  pysyva_linkki: string;
  kommentit?: Kommentti[];
  /** Links Hiski gives for the event, e.g. to the SSHY digital archive image. */
  linkit?: { teksti: string; url: string }[];
}

/** A person split into the fields Hiski stores separately. */
export interface Henkilo {
  ammatti?: string;
  etunimi?: string;
  patronyymi?: string;
  sukunimi?: string;
  ika?: string;
  /** Short comments attached to a single field, keyed by field name. */
  kenttakommentit?: Record<string, string[]>;
}

export interface KastetunTiedot extends Yhteiset {
  kirja: "kastetut";
  syntynyt?: string;
  kastettu?: string;
  kyla?: string;
  talo?: string;
  isa?: Henkilo;
  aiti?: Henkilo;
  lapsi?: string;
  kenttakommentit?: Record<string, string[]>;
}

export type TapahtumanTiedot = KastetunTiedot;

export type Tapahtumasivu =
  | { tila: "ok"; tapahtuma: TapahtumanTiedot }
  /** The page has headings but no event, e.g. for an unknown event number. */
  | { tila: "ei_loytynyt" }
  /** Hiski's "Virhe parametrissa!" page, which it also returns intermittently. */
  | { tila: "virhe" };

/** A table row: its heading path (e.g. ["Mies", "Nimi"]) and value cells. */
interface Rivi {
  otsake: string[];
  solut: Cheerio<Element>;
}

const VIRHE = "Virhe parametrissa!";

const HENKILON_KENTAT = ["ammatti", "etunimi", "patronyymi", "sukunimi", "ika"] as const;

type Kasittelija = (tapahtuma: Kentat, solut: Solu[]) => void;
type Kentat = Record<string, unknown>;

/** Sets the cells' values to the given fields; "mies.kyla" sets a nested field. */
const arvot =
  (...kentat: string[]): Kasittelija =>
  (tapahtuma, solut) =>
    kentat.forEach((kentta, i) => {
      const { arvo, kommentit } = solut[i] ?? { kommentit: [] };
      if (!arvo && kommentit.length === 0) return;
      // Nested objects are only created for data, so an empty person is left out.
      const polku = kentta.split(".");
      const nimi = polku.pop()!;
      const kohde = polku.reduce((olio, osa) => (olio[osa] ??= {}) as Kentat, tapahtuma);
      if (arvo) kohde[nimi] = arvo;
      if (kommentit.length > 0) ((kohde.kenttakommentit ??= {}) as Kentat)[nimi] = kommentit;
    });

/** Reads a person row: occupation, first name, patronymic, surname and age. */
const henkilo =
  (kentta: string): Kasittelija =>
  (tapahtuma, solut) =>
    arvot(...HENKILON_KENTAT.map((k) => `${kentta}.${k}`))(tapahtuma, solut);

/** Which fields each row fills, keyed by the row's heading path, per book. */
const RIVIT: Record<HakuKirja, Record<string, Kasittelija>> = {
  kastetut: {
    "Syntynyt / Kastettu": arvot("syntynyt", "kastettu"),
    "Kylä / Talo": arvot("kyla", "talo"),
    Isä: henkilo("isa"),
    Äiti: henkilo("aiti"),
    Lapsi: arvot("lapsi"),
  },
  vihityt: {},
  haudatut: {},
  smuutt: {},
  umuutt: {},
};

/** Parses a Hiski event page (/hiski?fi+SRK+KIRJA+N). */
export function parseTapahtumasivu(html: string): Tapahtumasivu {
  if (html.includes(VIRHE)) return { tila: "virhe" };
  const $ = cheerio.load(html);
  const taulukko = $("table[border=4]").first();
  if (taulukko.length === 0) return { tila: "ei_loytynyt" };

  const lomake = (nimi: string) => $(`input[name="${nimi}" i]`).attr("value");
  const koodi = lomake("srk");
  const kirja = lomake("kirja") as HakuKirja | undefined;
  const nimi = siisti($("h2").first().text());
  const pysyva = $("a")
    .filter((_, a) => /^\/hiski\?fi\+t\d+$/.test($(a).attr("href") ?? ""))
    .attr("href");
  if (!koodi || !kirja || !nimi || !pysyva) throw new Error("Tapahtumasivua ei tunnistettu");

  const rivit = lueRivit($, taulukko);
  const kommentit = [
    ...lueKommentit($, rivit, "Alkup. komm.", "alkup"),
    ...lueKommentit($, rivit, "Oma komm.", "oma"),
  ];
  const linkit = rivit
    .filter((r) => r.otsake[0] === "Linkit")
    .flatMap((r) => r.solut.find("a").get())
    .map((a) => ({
      teksti: siisti($(a).text()) ?? "",
      url: new URL($(a).attr("href") ?? "", HISKI_URL).href,
    }));

  const tapahtuma: Kentat = {
    seurakunta: { koodi, nimi },
    kirja,
    pysyva_linkki: new URL(pysyva, HISKI_URL).href,
  };
  for (const rivi of rivit) {
    const kasittelija = RIVIT[kirja][rivi.otsake.join(" › ")];
    kasittelija?.(
      tapahtuma,
      rivi.solut.get().map((s) => jasennaSolu($, $(s))),
    );
  }
  if (kommentit.length > 0) tapahtuma.kommentit = kommentit;
  if (linkit.length > 0) tapahtuma.linkit = linkit;
  return { tila: "ok", tapahtuma: tapahtuma as unknown as TapahtumanTiedot };
}

/** A cell holding only a <SMALL> heading, e.g. <TD><SMALL>Isä</SMALL>. */
function onOtsakesolu($: cheerio.CheerioAPI, solu: Element): boolean {
  const small = $(solu).children("small");
  const teksti = siisti($(solu).text());
  return small.length === 1 && teksti === siisti(small.text()) && !teksti?.startsWith("(");
}

/**
 * Reads the rows with their heading path. A heading cell spanning several
 * rows (Mies, Vaimo, Omainen) becomes the first part of the path of each row
 * it spans; a spanned row without a heading of its own gets "jatko".
 */
function lueRivit($: cheerio.CheerioAPI, taulukko: Cheerio<Element>): Rivi[] {
  const rivit: Rivi[] = [];
  let yla: { otsake: string; riveja: number } | undefined;
  taulukko.find("tr").each((_, tr) => {
    const solut = $(tr).children("td");
    let otsakkeita = 0;
    while (otsakkeita < solut.length && onOtsakesolu($, solut[otsakkeita]!)) otsakkeita++;
    const otsakkeet = solut.slice(0, otsakkeita).get();
    const omat = otsakkeet.map((s) => siisti($(s).text())!);
    const ylaotsake = yla && yla.riveja > 0 ? yla.otsake : undefined;
    const ensimmainen = otsakkeet[0];
    const ulottuu = Number($(ensimmainen).attr("rowspan") ?? 1);
    if (ensimmainen && ulottuu > 1) {
      yla = { otsake: omat[0]!, riveja: ulottuu - 1 };
      rivit.push({ otsake: omat, solut: solut.slice(otsakkeet.length) });
      return;
    }
    if (ylaotsake) yla!.riveja--;
    const otsake = ylaotsake ? [ylaotsake, ...(omat.length > 0 ? omat : ["jatko"])] : omat;
    rivit.push({ otsake, solut: solut.slice(otsakkeet.length) });
  });
  return rivit;
}

/**
 * Splits a comment cell such as
 * `<FONT>ALKUPKOMM:</FONT> Död 17.3.1850<BR><FONT>VV:</FONT> \K2.<BR>`
 * into comments, skipping empty ones.
 */
function lueKommentit(
  $: cheerio.CheerioAPI,
  rivit: Rivi[],
  otsake: string,
  tyyppi: string,
): Kommentti[] {
  const rivi = rivit.find((r) => r.otsake[0] === otsake);
  if (!rivi) return [];
  return (rivi.solut.first().html() ?? "").split(/<br\s*\/?>/i).flatMap((osa) => {
    const pala = cheerio.load(osa, null, false);
    const alikentta = siisti(pala("font").first().text())?.replace(/:$/, "");
    pala("font").remove();
    const teksti = siisti(pala.text());
    if (!teksti) return [];
    return [{ tyyppi, alikentta: alikentta ?? tyyppi.toUpperCase(), teksti }];
  });
}
