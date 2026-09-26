import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { siisti } from "./teksti.js";

export const HISKI_URL = "https://hiski.genealogia.fi/hiski";

export type HakuKirja = "kastetut" | "vihityt" | "haudatut" | "smuutt" | "umuutt";

export type Hakutermi =
  | { kentta: string; haku: string; muodot: string[] }
  | { kentta: string; haku: string; ei_tietokannassa: true };

/** A comment row Hiski prints below an event, e.g. "alkup - ALKUPKOMM: icke gift". */
export interface Kommentti {
  tyyppi: string;
  alikentta: string;
  teksti: string;
}

interface Perus {
  numero: number;
  url: string;
  kommentit?: Kommentti[];
  /** Short comments attached to a single field, keyed by field name. */
  kenttakommentit?: Record<string, string[]>;
}

export interface Kastettu extends Perus {
  kirja: "kastetut";
  syntynyt?: string;
  kastettu?: string;
  kyla?: string;
  talo?: string;
  isa?: string;
  aiti?: string;
  aidin_ika?: string;
  lapsi?: string;
}

export interface Vihitty extends Perus {
  kirja: "vihityt";
  kuulutettu?: string;
  vihitty?: string;
  miehen_kyla?: string;
  miehen_talo?: string;
  mies?: string;
  vaimo?: string;
  vaimon_kyla?: string;
  vaimon_talo?: string;
}

export interface Ika {
  vuodet?: string;
  kuukaudet?: string;
  viikot?: string;
  paivat?: string;
}

export interface Haudattu extends Perus {
  kirja: "haudatut";
  kuollut?: string;
  haudattu?: string;
  kyla?: string;
  talo?: string;
  henkilo?: string;
  kuolinsyy?: string;
  ika?: Ika;
  omainen?: string;
}

export type Tapahtuma = Kastettu | Vihitty | Haudattu;

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

/** Which event field each result column holds, per book. */
const SARAKKEET: Record<HakuKirja, readonly string[]> = {
  kastetut: ["syntynyt", "kastettu", "kyla", "talo", "isa", "aiti", "lapsi"],
  vihityt: [
    "kuulutettu",
    "vihitty",
    "miehen_kyla",
    "miehen_talo",
    "mies",
    "vaimo",
    "vaimon_kyla",
    "vaimon_talo",
  ],
  haudatut: [
    "kuollut",
    "haudattu",
    "kyla",
    "talo",
    "henkilo",
    "kuolinsyy",
    "ika.vuodet",
    "ika.kuukaudet",
    "ika.viikot",
    "ika.paivat",
  ],
  smuutt: [],
  umuutt: [],
};

/** A trailing number or range after a person, e.g. the mother's age "25" or "25-30". */
const IKA_LOPUSSA = /^(.*?)\s*\b(\d+(?:-\d+)?)$/;

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
    if (tapahtuma) {
      tapahtumat.push(tapahtuma);
      return;
    }
    const edellinen = tapahtumat.at(-1);
    if (edellinen) liitaLisarivi($, rivi, edellinen);
  });
  return tapahtumat;
}

function parseTapahtumarivi($: cheerio.CheerioAPI, rivi: Element): Tapahtuma | undefined {
  const solut = $(rivi).children("td");
  const href = solut.first().children("a").attr("href");
  const linkki = href && TAPAHTUMALINKKI.exec(href);
  if (!linkki) return undefined;
  const kirja = linkki[2] as HakuKirja;
  const tapahtuma: Record<string, unknown> = {
    kirja,
    numero: Number(linkki[3]),
    url: `${HISKI_URL}?fi+${linkki[1]}+${linkki[2]}+${linkki[3]}`,
  };
  const kenttakommentit: Record<string, string[]> = {};
  SARAKKEET[kirja].forEach((kentta, i) => {
    const solu = solut.eq(i).clone();
    solu.children("a").remove();
    const kommentit = solu
      .children("small")
      .remove()
      .map((_, small) => siisti($(small).text())?.replace(/^\((.*)\)$/, "$1"))
      .get()
      .filter(Boolean);
    if (kommentit.length > 0) kenttakommentit[kentta] = kommentit;
    const arvo = siisti(solu.text());
    if (!arvo) return;
    // "ika.vuodet" etc. go into a nested object.
    const [ylempi, alempi] = kentta.split(".");
    if (alempi) ((tapahtuma[ylempi!] ??= {}) as Record<string, string>)[alempi] = arvo;
    else tapahtuma[kentta] = arvo;
  });
  if (Object.keys(kenttakommentit).length > 0) tapahtuma.kenttakommentit = kenttakommentit;
  if (kirja === "kastetut") erotaAidinIka(tapahtuma as unknown as Kastettu);
  return tapahtuma as unknown as Tapahtuma;
}

function erotaAidinIka(tapahtuma: Kastettu) {
  const osat = tapahtuma.aiti && IKA_LOPUSSA.exec(tapahtuma.aiti);
  if (!osat) return;
  const aiti = siisti(osat[1]);
  if (aiti) tapahtuma.aiti = aiti;
  else delete tapahtuma.aiti;
  tapahtuma.aidin_ika = osat[2]!;
}

/**
 * Attaches a row printed below an event to it: a comment row
 * ("alkup - ALKUPKOMM: …") or, for burials, the relative ("omainen: …").
 */
function liitaLisarivi($: cheerio.CheerioAPI, rivi: Element, tapahtuma: Tapahtuma) {
  const otsake = $(rivi).find("font").first();
  const otsakkeenTeksti = siisti(otsake.text());
  if (otsakkeenTeksti === "omainen:" && tapahtuma.kirja === "haudatut") {
    const ilmanOtsaketta = $(rivi).clone();
    ilmanOtsaketta.find("font").remove();
    const omainen = siisti(ilmanOtsaketta.text());
    if (omainen) tapahtuma.omainen = omainen;
    return;
  }
  const merkinta = /^(\S+) - (.+?):$/.exec(otsakkeenTeksti ?? "");
  const teksti = siisti($(rivi).find("small").first().text());
  if (!merkinta || !teksti) return;
  (tapahtuma.kommentit ??= []).push({ tyyppi: merkinta[1]!, alikentta: merkinta[2]!, teksti });
}
