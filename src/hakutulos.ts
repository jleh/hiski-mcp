import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { siisti } from "./teksti.js";

export const HISKI_URL = "https://hiski.genealogia.fi/hiski";

export type HakuKirja = "kastetut" | "vihityt" | "haudatut" | "smuutt" | "umuutt";

export type Hakutermi =
  | { kentta: string; haku: string; muodot: string[] }
  | { kentta: string; haku: string; ei_tietokannassa: true };

export interface Tapahtuma {
  kirja: HakuKirja;
  numero: number;
  url: string;
}

export interface Lohko {
  seurakunta: { koodi: string; nimi: string };
  kirja: HakuKirja;
  hakutermit: Hakutermi[];
  /** Other notes Hiski lists with the search terms, e.g. the searched years. */
  huomautukset?: string[];
  tapahtumat: Tapahtuma[];
  /** Hiski found more events than it printed. */
  katkaistu: boolean;
  /** Hiski's estimate of all matching events, when it gives one. */
  loytyi_noin?: number;
  /** Continues a truncated search from where this block ended (Hiski's hakupos). */
  jatkokohta?: string;
}

export interface HakuTulos {
  lohkot: Lohko[];
  /** Total Hiski reports for a search over several parishes. */
  yhteensa?: number;
}

const KIRJAT_OTSIKOSTA: Record<string, HakuKirja> = {
  kastetut: "kastetut",
  vihityt: "vihityt",
  haudatut: "haudatut",
  sisäänmuuttaneet: "smuutt",
  poismuuttaneet: "umuutt",
};

const LOHKON_OTSIKKO = /<FONT SIZE="\+2"><B>([^<]*)<\/B><\/FONT>/gi;
const TAULUKKO = /<TABLE BORDER=1[^>]*>[^]*?<\/TABLE>/gi;
const TAPAHTUMALINKKI = /\/hiski\?fi\+(\d{4})\+([a-z]+)\+(\d+)$/;
const EI_TIETOKANNASSA = "hakutekstiä ei löydy tietokannasta";

/** Parses a Hiski search result page into per-parish, per-book blocks. */
export function parseHakutulos(html: string): HakuTulos {
  const otsikot = [...html.matchAll(LOHKON_OTSIKKO)];
  const lohkot = otsikot.flatMap((otsikko, i) => {
    const alku = otsikko.index + otsikko[0].length;
    const loppu = otsikot[i + 1]?.index ?? html.length;
    return parseLohko(otsikko[1]!, html.slice(alku, loppu));
  });
  const yhteensa = /Seurakunnista löytyi yhteensä (\d+) tapahtumaa/.exec(html)?.[1];
  return { lohkot, ...(yhteensa && { yhteensa: Number(yhteensa) }) };
}

/**
 * One heading may hold several tables: the "kaikki" search prints one per
 * book. Each table becomes its own block.
 */
function parseLohko(otsikko: string, sisalto: string): Lohko[] {
  const erotin = otsikko.lastIndexOf(" - ");
  const nimi = otsikko.slice(0, erotin);
  const otsikonKirja = KIRJAT_OTSIKOSTA[otsikko.slice(erotin + 3)];
  const { hakutermit, huomautukset } = parseHakutermit(sisalto);
  const taulukot = [...sisalto.matchAll(TAULUKKO)];
  return taulukot.map((taulukko, i) => {
    const perassa = sisalto.slice(
      taulukko.index + taulukko[0].length,
      taulukot[i + 1]?.index ?? sisalto.length,
    );
    const lomake = cheerio.load(perassa);
    const kentta = (nimi: string) => lomake(`input[name="${nimi}" i]`).attr("value");
    const kirja = (kentta("kirja") as HakuKirja | undefined) ?? otsikonKirja;
    const koodi = kentta("srk");
    if (!kirja || !koodi) throw new Error(`Hakutuloksen lohkoa "${otsikko}" ei tunnistettu`);
    const loytyiNoin = /Tapahtumia löytyi noin (\d+)/.exec(perassa)?.[1];
    const jatkokohta = kentta("hakupos");
    return {
      seurakunta: { koodi, nimi },
      kirja,
      hakutermit,
      ...(huomautukset.length > 0 && { huomautukset }),
      tapahtumat: parseTapahtumat(taulukko[0]),
      katkaistu: /Loppuja tapahtumista ei näytetty/.test(perassa),
      ...(loytyiNoin && { loytyi_noin: Number(loytyiNoin) }),
      ...(jatkokohta && { jatkokohta }),
    };
  });
}

function parseHakutermit(sisalto: string) {
  const hakutermit: Hakutermi[] = [];
  const huomautukset: string[] = [];
  const $ = cheerio.load(sisalto.slice(0, sisalto.search(TAULUKKO)));
  $("li").each((_, li) => {
    const rivi = siisti($(li).text());
    if (!rivi) return;
    const termi = /^(.+?): (.+?) => (.*)$/.exec(rivi);
    if (!termi) {
      huomautukset.push(rivi);
      return;
    }
    const [, kentta, haku, muodot] = termi as unknown as [string, string, string, string];
    hakutermit.push(
      muodot === EI_TIETOKANNASSA
        ? { kentta, haku, ei_tietokannassa: true }
        : { kentta, haku, muodot: muodot.split(", ") },
    );
  });
  return { hakutermit, huomautukset };
}

function parseTapahtumat(taulukko: string): Tapahtuma[] {
  const $ = cheerio.load(taulukko);
  const tapahtumat: Tapahtuma[] = [];
  $("tr").each((_, rivi) => {
    const tapahtuma = parseTapahtumarivi($, rivi);
    if (tapahtuma) tapahtumat.push(tapahtuma);
  });
  return tapahtumat;
}

function parseTapahtumarivi($: cheerio.CheerioAPI, rivi: Element): Tapahtuma | undefined {
  const href = $(rivi).children("td").first().children("a").attr("href");
  const linkki = href && TAPAHTUMALINKKI.exec(href);
  if (!linkki) return undefined;
  return {
    kirja: linkki[2] as HakuKirja,
    numero: Number(linkki[3]),
    url: `${HISKI_URL}?fi+${linkki[1]}+${linkki[2]}+${linkki[3]}`,
  };
}
