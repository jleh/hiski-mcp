import { z } from "zod";
import type { HiskiClient } from "./client.js";
import type { HakuKirja } from "./hakutulos.js";
import type { Lomakekirja } from "./lomake.js";
import { hakutuloksenHuomautukset, kirjojenVuodet, TyokaluVirhe } from "./muotoilu.js";
import { etsiSeurakunta, ratkaiseSeurakunnat, type Seurakunta } from "./parishes.js";

/** What a tool handler gets besides its arguments. */
export interface Konteksti {
  hiski: HiskiClient;
  signal?: AbortSignal;
}

export interface Tyokalu<Skeema extends z.ZodRawShape = z.ZodRawShape> {
  nimi: string;
  otsikko: string;
  kuvaus: string;
  /** False only for tools that answer from bundled data without contacting Hiski. */
  verkko: boolean;
  skeema: Skeema;
  /** Returns a JSON-serializable answer; throws for errors the agent should see. */
  kasittele: (args: z.infer<z.ZodObject<Skeema>>, konteksti: Konteksti) => Promise<unknown>;
}

/** Keeps each tool's argument type tied to its own schema. */
const tyokalu = <Skeema extends z.ZodRawShape>(maaritys: Tyokalu<Skeema>) =>
  maaritys as unknown as Tyokalu;

const ETSI_SEURAKUNTA_MAX = 20;
/** Per-parish maximums: Hiski counts the maximum per parish, so several parishes default lower. */
const OLETUSMAKSIMI = { yksi: 50, useita: 15 };

interface Hakuparametrit {
  seurakunnat: string[];
  alkuvuosi?: string;
  loppuvuosi?: string;
  maksimi?: number;
  jatkokohta?: string;
}

/**
 * A search tool's handler: maps the tool's parameters to Hiski's form fields
 * (kentat: parameter → field), runs the search and adds notes for the agent.
 */
const haku =
  (
    kirja: Lomakekirja | ((args: Record<string, unknown>) => Lomakekirja),
    kentat: Record<string, string>,
  ) =>
  async (args: Hakuparametrit & Record<string, unknown>, k: Konteksti) => {
    const seurakunnat = ratkaiseSeurakunnat(args.seurakunnat);
    const hakukirja = typeof kirja === "function" ? kirja(args) : kirja;
    const lomakkeelle = Object.fromEntries(
      Object.entries(kentat).map(([parametri, kentta]) => [
        kentta,
        args[parametri] as string | undefined,
      ]),
    );
    const tulos = await k.hiski.haku(
      {
        kirja: hakukirja,
        seurakunnat: seurakunnat.map((s) => s.koodi),
        kentat: lomakkeelle,
        alkuvuosi: args.alkuvuosi,
        loppuvuosi: args.loppuvuosi,
        maksimi:
          args.maksimi ?? (seurakunnat.length > 1 ? OLETUSMAKSIMI.useita : OLETUSMAKSIMI.yksi),
        jatkokohta: args.jatkokohta,
      },
      k.signal,
    );
    const huomautukset = hakutuloksenHuomautukset(tulos, {
      kirja: hakukirja,
      seurakunnat,
      alkuvuosi: args.alkuvuosi,
      loppuvuosi: args.loppuvuosi,
    });
    return { ...tulos, ...(huomautukset.length > 0 && { huomautukset }) };
  };

async function haeTapahtuma(
  { seurakunta, kirja, numero }: { seurakunta: string; kirja: HakuKirja; numero: number },
  k: Konteksti,
) {
  const { koodi, nimi } = ratkaiseYksi(seurakunta);
  const tulos = await k.hiski.tapahtuma(koodi, kirja, numero, k.signal);
  if (tulos.tila === "ok") return tulos.tapahtuma;
  if (tulos.tila === "ei_loytynyt") {
    return {
      huomautus: `Seurakunnan ${nimi} (${koodi}) kirjassa ${kirja} ei ole tapahtumaa numero ${numero}.`,
    };
  }
  throw new TyokaluVirhe(
    "Hiski ei antanut tapahtumaa usealla yrityksellä (se vastaa tapahtumasivuihin ajoittain virhesivulla). Yritä hetken kuluttua uudelleen.",
  );
}

/** Occupation and names of one person: parameter prefix → Hiski field prefix. */
const henkilonKentat = (parametri: string, kentta: "i" | "a") => ({
  [`${parametri}etunimi`]: `${kentta}etunimi`,
  [`${parametri}patronyymi`]: `${kentta}patronyymi`,
  [`${parametri}sukunimi`]: `${kentta}sukunimi`,
  [`${parametri}ammatti`]: `${kentta}ammatti`,
});

/** Resolves one parish name or code; throws SeurakuntaVirhe with candidates. */
const ratkaiseYksi = (syote: string): Seurakunta => ratkaiseSeurakunnat([syote])[0]!;

function etsiSeurakuntaa({ nimi }: { nimi: string }) {
  const osumat = etsiSeurakunta(nimi);
  if (osumat.length === 0) {
    return {
      osumat: [],
      huomautus: `Nimellä "${nimi}" ei löytynyt seurakuntaa. Nimi voi olla eri muodossa, ruotsiksi tai osa suuremman seurakunnan nimeä.`,
    };
  }
  return {
    osumat: osumat.slice(0, ETSI_SEURAKUNTA_MAX).map((s) => ({
      koodi: s.koodi,
      nimi: s.nimi,
      ...(s.rinnakkaisnimi && { rinnakkaisnimi: s.rinnakkaisnimi }),
      vuodet: kirjojenVuodet(s.vuodet),
    })),
    ...(osumat.length > ETSI_SEURAKUNTA_MAX && { yhteensa: osumat.length }),
  };
}

async function seurakunnanTiedot({ seurakunta }: { seurakunta: string }, k: Konteksti) {
  const { koodi } = ratkaiseYksi(seurakunta);
  const tulos = await k.hiski.seurakunta(koodi, k.signal);
  if (tulos.tila !== "ok") throw new TyokaluVirhe(`Hiski ei tunne seurakuntaa ${koodi}.`);
  const { sivu, tiedot } = tulos;
  return {
    koodi: sivu.koodi,
    nimi: sivu.nimi,
    kirjat: kirjojenVuodet(Object.fromEntries(sivu.kirjat.map((k) => [k.kirja, k.vuodet]))),
    naapurit: sivu.naapurit,
    ...(sivu.huomautus && { huomautus: sivu.huomautus }),
    ...(tiedot?.maakunta && { maakunta: tiedot.maakunta }),
    ...(tiedot?.historia && { historia: tiedot.historia }),
    ...(tiedot?.kylat && { kylat: tiedot.kylat }),
    ...(tiedot?.vanhat_nimet && { vanhat_nimet: tiedot.vanhat_nimet }),
  };
}

// Parameter descriptions carry Hiski's own search advice for each field.

const seurakunta = z
  .string()
  .min(1)
  .describe('Seurakunnan nimi tai nelinumeroinen koodi, esim. "Orimattila", "Artsjö" tai "0366".');

const seurakunnat = z
  .array(z.string().min(1))
  .min(1)
  .max(30)
  .describe(
    'Seurakuntien nimet tai nelinumeroiset koodit, esim. ["Orimattila"] tai ["0366", "0015"]. Ruotsinkielinen nimi käy myös.',
  );

const vuosi = (mika: string) =>
  z
    .string()
    .optional()
    .describe(`${mika}: vvvv, kk.vvvv tai pp.kk.vvvv (esim. 1834, 5.1834 tai 21.9.1834).`);

const yhteiset = {
  seurakunnat,
  alkuvuosi: vuosi("Hakuvälin alku"),
  loppuvuosi: vuosi("Hakuvälin loppu"),
  maksimi: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe(
      "Tapahtumia enintään seurakuntaa kohden; pyöristetään ylöspäin arvoon 15, 30, 50, 100, 250, 500 tai 1000. Oletus 50 yhdelle seurakunnalle ja 15 usealle.",
    ),
  jatkokohta: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .describe(
      "Edellisen katkaistun tuloksen jatkokohta. Toimii vain yhdelle seurakunnalle ja samoilla hakuehdoilla.",
    ),
};

const etunimi = (kenen: string) =>
  z
    .string()
    .optional()
    .describe(
      `${kenen} etunimi nykyisessä perusmuodossa; löytää myös vanhat ja ruotsinkieliset muodot. Useamman nimen on löydyttävä kaikkien; vaihtoehdot TAI-sanalla.`,
    );
const patronyymi = (kenen: string) =>
  z
    .string()
    .optional()
    .describe(`${kenen} patronyymi päätteen kanssa tai ilman (Johan, Johansson, Juhonpoika).`);
const sukunimi = (kenen: string) =>
  z
    .string()
    .optional()
    .describe(`${kenen} sukunimi tai sen noin 5 alkukirjainta (normalisointi on puutteellinen).`);
const ammatti = (kenen: string) =>
  z.string().optional().describe(`${kenen} ammatti tai sääty kirjan kielellä, esim. Bonde, Torp.`);
const paikka = (kuvaus: string) =>
  z
    .string()
    .optional()
    .describe(
      `${kuvaus} Paikannimiä ei ole normalisoitu kattavasti; alkuperäinen kirjoitusasu tai sanan alku toimii usein paremmin.`,
    );

/** Occupation, first name, patronymic and surname of one person, with a field name prefix. */
const henkilo = <Etuliite extends string>(etuliite: Etuliite, kenen: string) =>
  ({
    [`${etuliite}etunimi`]: etunimi(kenen),
    [`${etuliite}patronyymi`]: patronyymi(kenen),
    [`${etuliite}sukunimi`]: sukunimi(kenen),
    [`${etuliite}ammatti`]: ammatti(kenen),
  }) as Record<
    `${Etuliite}${"etunimi" | "patronyymi" | "sukunimi" | "ammatti"}`,
    z.ZodOptional<z.ZodString>
  >;

const HAKUTULOS =
  "Tulos on seurakunnittain: hakutermit (mitä nimimuotoja Hiski haki ja mitä ei löytynyt), tapahtumat alkuperäisessä kirjoitusasussa numeroineen ja tieto katkaistusta tuloksesta jatkokohtineen. Henkilö on yksi merkkijono (ammatti ja nimet yhdessä); hae_tapahtuma antaa ne eriteltyinä.";

export const TYOKALUT: Tyokalu[] = [
  tyokalu({
    nimi: "etsi_seurakunta",
    otsikko: "Etsi seurakunta",
    kuvaus:
      "Etsii Hiskin seurakuntia nimellä, osalla nimestä, ruotsinkielisellä nimellä tai koodilla. Palauttaa enintään 20 osumaa parhaat ensin: koodi, nimi, rinnakkaisnimi ja kunkin kirjan (kastetut, vihityt, haudatut, sisään- ja poismuuttaneet) Hiskiin indeksoidut vuodet. Toimii ilman verkkoyhteyttä.",
    verkko: false,
    skeema: {
      nimi: z
        .string()
        .min(1)
        .describe('Seurakunnan nimi, osa nimestä tai koodi, esim. "Orimattila", "Turku", "366".'),
    },
    kasittele: (args) => Promise.resolve(etsiSeurakuntaa(args)),
  }),
  tyokalu({
    nimi: "seurakunnan_tiedot",
    otsikko: "Seurakunnan tiedot",
    kuvaus:
      "Hakee Hiskistä yhden seurakunnan tiedot: kirjat ja niiden indeksoidut vuodet, naapuriseurakunnat koodeineen, mahdollinen huomautus aineistosta (esim. Karjala-tietokanta), maakunta, historia (perustaminen, emäseurakunta, arkistotuhot), kylät ja vanhat nimet.",
    verkko: true,
    skeema: { seurakunta },
    kasittele: seurakunnanTiedot,
  }),
  tyokalu({
    nimi: "hae_kastetut",
    otsikko: "Hae kastetut",
    kuvaus: `Hakee Hiskin kastettujen (syntyneiden) luettelosta yhdestä tai useammasta seurakunnasta. Tapahtumassa on syntymä- ja kastepäivä, kylä, talo, isä, äiti ja hänen ikänsä sekä lapsi. ${HAKUTULOS}`,
    verkko: true,
    skeema: {
      ...yhteiset,
      lapsen_etunimi: etunimi("Lapsen"),
      kyla: paikka("Syntymäkylä tai -talo; haku kohdistuu molempiin."),
      ...henkilo("isan_", "Isän"),
      ...henkilo("aidin_", "Äidin"),
    },
    kasittele: haku("kastetut", {
      lapsen_etunimi: "etunimi",
      kyla: "ikyla",
      ...henkilonKentat("isan_", "i"),
      ...henkilonKentat("aidin_", "a"),
    }),
  }),
  tyokalu({
    nimi: "hae_vihityt",
    otsikko: "Hae vihityt",
    kuvaus: `Hakee Hiskin vihittyjen luettelosta yhdestä tai useammasta seurakunnasta. Tapahtumassa on kuulutus- ja vihkipäivä sekä mies ja vaimo kylineen ja taloineen. ${HAKUTULOS}`,
    verkko: true,
    skeema: {
      ...yhteiset,
      ...henkilo("miehen_", "Miehen"),
      miehen_paikka: paikka("Miehen asuinkylä tai -talo."),
      ...henkilo("vaimon_", "Vaimon"),
      vaimon_paikka: paikka("Vaimon asuinkylä tai -talo."),
    },
    kasittele: haku("vihityt", {
      ...henkilonKentat("miehen_", "i"),
      miehen_paikka: "ikyla",
      ...henkilonKentat("vaimon_", "a"),
      vaimon_paikka: "akyla",
    }),
  }),
  tyokalu({
    nimi: "hae_haudatut",
    otsikko: "Hae haudatut",
    kuvaus: `Hakee Hiskin haudattujen (kuolleiden) luettelosta yhdestä tai useammasta seurakunnasta. Tapahtumassa on kuolin- ja hautauspäivä, kylä, talo, vainaja, kuolinsyy, ikä (vuodet, kuukaudet, viikot, päivät) ja joissain seurakunnissa omainen. ${HAKUTULOS}`,
    verkko: true,
    skeema: {
      ...yhteiset,
      ...henkilo("", "Vainajan"),
      paikka: paikka("Vainajan kylä tai talo."),
      kuolinsyy: z
        .string()
        .optional()
        .describe("Kuolinsyy kirjan kielellä, esim. Kikhosta, Rödsot."),
      syntyma_alku: vuosi("Vainajan syntymäajan alku"),
      syntyma_loppu: vuosi("Vainajan syntymäajan loppu"),
      ika: z.string().optional().describe("Vainajan ikä vuosina."),
      ...henkilo("omaisen_", "Omaisen"),
    },
    kasittele: haku("haudatut", {
      ...henkilonKentat("", "i"),
      paikka: "ikyla",
      kuolinsyy: "ksyy",
      syntyma_alku: "syntalku",
      syntyma_loppu: "syntloppu",
      ika: "ika",
      ...henkilonKentat("omaisen_", "a"),
    }),
  }),
  tyokalu({
    nimi: "hae_muuttaneet",
    otsikko: "Hae muuttaneet",
    kuvaus: `Hakee Hiskin sisään- tai poismuuttaneiden luettelosta. Muuttoluetteloita on vain osasta seurakuntia ja usein lyhyiltä ajoilta; seurakunnan vuodet kertoo etsi_seurakunta. Tapahtumassa on lähtö- ja saapumispäivä, kylä ja talo tässä seurakunnassa, henkilö ja toinen paikka (mistä tai minne). ${HAKUTULOS}`,
    verkko: true,
    skeema: {
      ...yhteiset,
      suunta: z
        .enum(["sisaan", "pois"])
        .describe("sisaan = seurakuntaan muuttaneet, pois = seurakunnasta muuttaneet."),
      ...henkilo("", "Muuttajan"),
      kyla: paikka("Kylä tai talo tässä seurakunnassa."),
      toinen_paikka: z
        .string()
        .optional()
        .describe("Paikka tai seurakunta, josta muutettiin (sisään) tai johon muutettiin (pois)."),
    },
    kasittele: haku((args) => (args.suunta === "pois" ? "umuutt" : "smuutt"), {
      ...henkilonKentat("", "i"),
      kyla: "ikyla",
      toinen_paikka: "kohde",
    }),
  }),
  tyokalu({
    nimi: "hae_kaikki",
    otsikko: "Hae kaikista kirjoista",
    kuvaus: `Hakee henkilöä Hiskin kaikista kirjoista kerralla (kastetut, vihityt, haudatut, muuttaneet) yhdestä tai useammasta seurakunnasta. Tulos on jaettu kirjoittain. ${HAKUTULOS}`,
    verkko: true,
    skeema: {
      ...yhteiset,
      ...henkilo("", "Henkilön"),
      paikka: paikka("Kylä tai talo."),
      sisaltaa_tekstin: z
        .string()
        .optional()
        .describe("Vapaa teksti, jonka tapahtuman on sisällettävä."),
      ei_sisalla_tekstia: z
        .string()
        .optional()
        .describe("Vapaa teksti, jota tapahtuma ei saa sisältää."),
    },
    kasittele: haku("kaikki", {
      ...henkilonKentat("", "i"),
      paikka: "ikyla",
      sisaltaa_tekstin: "vapaaAND",
      ei_sisalla_tekstia: "vapaaNOT",
    }),
  }),
  tyokalu({
    nimi: "hae_tapahtuma",
    otsikko: "Hae tapahtuman tiedot",
    kuvaus:
      "Hakee yhden Hiskin tapahtuman tarkat tiedot hakutuloksen numerolla. Henkilöt ovat eriteltyinä (ammatti, etunimi, patronyymi, sukunimi, ikä), mukana ovat alkuperäis- ja tallentajan kommentit, SSHY-digiarkiston linkki alkuperäisen kirjan kuvaan ja Hiskin pysyvä linkki.",
    verkko: true,
    skeema: {
      seurakunta,
      kirja: z
        .enum(["kastetut", "vihityt", "haudatut", "smuutt", "umuutt"])
        .describe("Tapahtuman kirja; smuutt = sisäänmuuttaneet, umuutt = poismuuttaneet."),
      numero: z.number().int().min(0).describe("Tapahtuman numero hakutuloksesta."),
    },
    kasittele: haeTapahtuma,
  }),
];
