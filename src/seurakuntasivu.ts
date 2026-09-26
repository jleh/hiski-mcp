import * as cheerio from "cheerio";
import { HISKI_URL, type HakuKirja } from "./hakutulos.js";
import { parseVuosivalit, type Vuosivali } from "./parishes.js";
import { siisti } from "./teksti.js";

export interface Linkki {
  teksti: string;
  url: string;
}

/** A note Hiski shows for some parishes, e.g. that ceded Karelia is mostly elsewhere. */
export interface Huomautus {
  teksti: string;
  linkit?: Linkki[];
}

export type Seurakuntasivu =
  | {
      tila: "ok";
      koodi: string;
      nimi: string;
      /** The books Hiski has for the parish with their indexed years. */
      kirjat: { kirja: HakuKirja | "kaikki"; vuodet: Vuosivali[] }[];
      /** Neighbouring parishes, ready to be searched by code. */
      naapurit: { koodi: string; nimi: string }[];
      huomautus?: Huomautus;
      /** Address of the parish info page (parseSeurakuntatiedot). */
      lisatiedot_url?: string;
    }
  | { tila: "ei_loytynyt" };

const EI_LOYTYNYT = "Seurakuntaa ei löytynyt";
const KIRJALINKKI = /^\/hiski\?fi\+(\d{4})\+([a-z]+)$/;
const SEURAKUNTALINKKI = /^\/hiski\?fi\+(\d{4})$/;
const HAETTAVAT_KIRJAT = new Set(["kastetut", "vihityt", "haudatut", "smuutt", "umuutt", "kaikki"]);
const LISATIEDOT = "Lisätietoja seurakunnasta";
/** The maps that end the parish page. */
const KARTAT = /<TABLE WIDTH="100%">/i;

/** Parses a Hiski parish page (/hiski?fi+SRK). */
export function parseSeurakuntasivu(html: string): Seurakuntasivu {
  if (html.includes(EI_LOYTYNYT)) return { tila: "ei_loytynyt" };
  const $ = cheerio.load(html);
  const nimi = siisti($("h2").first().text());
  if (!nimi) throw new Error("Seurakuntasivua ei tunnistettu");

  let koodi: string | undefined;
  const kirjat: { kirja: HakuKirja | "kaikki"; vuodet: Vuosivali[] }[] = [];
  $("li > a").each((_, a) => {
    const osat = KIRJALINKKI.exec($(a).attr("href") ?? "");
    if (!osat || !HAETTAVAT_KIRJAT.has(osat[2]!)) return;
    koodi ??= osat[1];
    // The years follow the link in the same list item: "Kastetut</A> (1695-1718, 1720-1911)".
    const vuodet = /\(([^)]*)\)/.exec($(a).parent().text())?.[1] ?? "";
    kirjat.push({ kirja: osat[2] as HakuKirja | "kaikki", vuodet: parseVuosivalit(vuodet) });
  });
  if (!koodi) throw new Error("Seurakuntasivua ei tunnistettu");

  // The only links to a single other parish are the neighbours. (The parser
  // moves their list out of its heading's paragraph, so the heading is no anchor.)
  const naapurit = $("a")
    .get()
    .flatMap((a) => {
      const naapuri = SEURAKUNTALINKKI.exec($(a).attr("href") ?? "")?.[1];
      const naapurinNimi = siisti($(a).text());
      return naapuri && naapuri !== koodi && naapurinNimi
        ? [{ koodi: naapuri, nimi: naapurinNimi }]
        : [];
    });

  const lisatiedot = $("a")
    .filter((_, a) => siisti($(a).text()) === LISATIEDOT)
    .attr("href");
  const huomautus = lueHuomautus(html);

  return {
    tila: "ok",
    koodi,
    nimi,
    kirjat,
    naapurit,
    ...(huomautus && { huomautus }),
    ...(lisatiedot && { lisatiedot_url: new URL(lisatiedot, HISKI_URL).href }),
  };
}

/**
 * Reads the free text Hiski prints between the info link and the maps, such
 * as the note that ceded Karelia's records are mostly in the Karelia database.
 */
function lueHuomautus(html: string): Huomautus | undefined {
  const alku = html.indexOf(LISATIEDOT);
  if (alku < 0) return undefined;
  const loppu = html.slice(alku).search(KARTAT);
  const alue = html.slice(html.indexOf("</A>", alku) + 4, loppu < 0 ? undefined : alku + loppu);
  const $ = cheerio.load(alue, null, false);
  const teksti = siisti($.root().text());
  if (!teksti) return undefined;
  const linkit = $("a")
    .get()
    .map((a) => ({
      teksti: siisti($(a).text()) ?? "",
      url: new URL($(a).attr("href") ?? "", HISKI_URL).href,
    }));
  return { teksti, ...(linkit.length > 0 && { linkit }) };
}

export type Seurakuntatiedot =
  | {
      tila: "ok";
      maakunta?: string;
      /** Paragraphs about the parish: founding, mother parish, destroyed archives. */
      historia?: string[];
      /** Villages; old or parallel names in parentheses, e.g. "Heinämaa (Hyyttäri)". */
      kylat?: string[];
      vanhat_nimet?: string[];
    }
  | { tila: "ei_loytynyt" };

const OTSIKKO = /<H1>([^<]*)<\/H1>/i;

/** Text of an HTML fragment, whitespace collapsed. */
const tekstiksi = (html: string) => siisti(cheerio.load(html, null, false).root().text());

/**
 * Parses a parish info page (mini-pgsql.php). The page is loose text between
 * headings, so it is split at <H2> headings; only the sections that help
 * interpret search results are kept (not archive listings or clergy).
 */
export function parseSeurakuntatiedot(html: string): Seurakuntatiedot {
  const otsikko = OTSIKKO.exec(html);
  if (!otsikko) throw new Error("Seurakunnan lisätietosivua ei tunnistettu");
  if (otsikko[1]!.includes("Ei löytynyt")) return { tila: "ei_loytynyt" };

  const [johdanto = "", ...osiot] = html.slice(otsikko.index + otsikko[0].length).split(/<H2>/i);
  // The introduction runs from the province line to the first map image.
  const [maakuntarivi = "", ...kappaleet] = johdanto.split(/<IMG/i)[0]!.split(/<P>/i);
  const maakunta = /Maakunta:\s*\d*\s*(.*)/.exec(tekstiksi(maakuntarivi) ?? "")?.[1];
  const historia = kappaleet.map(tekstiksi).filter((k): k is string => k !== undefined);

  let kylat: string[] = [];
  let vanhatNimet: string[] = [];
  for (const osio of osiot) {
    const [nimi = "", sisalto = ""] = osio.split(/<\/H2>/i);
    if (siisti(nimi) === "Kylät") {
      kylat = (tekstiksi(sisalto) ?? "")
        .split(",")
        .map((kyla) => siisti(kyla))
        .filter((kyla): kyla is string => kyla !== undefined);
    } else if (siisti(nimi) === "Vanhat nimet") {
      const $ = cheerio.load(sisalto, null, false);
      vanhatNimet = $("li")
        .get()
        .map((li) => siisti($(li).text()))
        .filter((n): n is string => n !== undefined);
    }
  }

  return {
    tila: "ok",
    ...(maakunta && { maakunta }),
    ...(historia.length > 0 && { historia }),
    ...(kylat.length > 0 && { kylat }),
    ...(vanhatNimet.length > 0 && { vanhat_nimet: vanhatNimet }),
  };
}
