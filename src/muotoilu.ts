import { HiskiVirhe } from "./client.js";
import type { HakuTulos } from "./hakutulos.js";
import { LomakeVirhe } from "./lomake.js";
import { SeurakuntaVirhe, type Seurakunta, type Vuosivali } from "./parishes.js";

/** "1697–1710, 1718–1890": compact for the agent, unlike a list of objects. */
export function vuodetTekstiksi(valit: readonly Vuosivali[]): string {
  return valit.map((v) => (v.alku === v.loppu ? `${v.alku}` : `${v.alku}–${v.loppu}`)).join(", ");
}

/** Years per book as text, leaving out the books a parish does not have. */
export function kirjojenVuodet(
  vuodet: Readonly<Record<string, readonly Vuosivali[]>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(vuodet)
      .filter(([, valit]) => valit.length > 0)
      .map(([kirja, valit]) => [kirja, vuodetTekstiksi(valit)]),
  );
}

/** An expected failure of a tool whose message the agent can act on. */
export class TyokaluVirhe extends Error {
  constructor(viesti: string) {
    super(viesti);
    this.name = "TyokaluVirhe";
  }
}

const ILMOITA_ONGELMASTA = "https://github.com/jleh/hiski-mcp/issues";

/** The text the agent sees for an error, with a next step where one helps. */
export function virheViesti(virhe: unknown): string {
  if (virhe instanceof SeurakuntaVirhe) {
    return `${virhe.message} Seurakuntia voi etsiä etsi_seurakunta-työkalulla; koodilla ("0366") valinta on yksiselitteinen.`;
  }
  if (
    virhe instanceof LomakeVirhe ||
    virhe instanceof HiskiVirhe ||
    virhe instanceof TyokaluVirhe
  ) {
    return virhe.message;
  }
  // Anything else means Hiski's page was not what the parsers expect.
  const syy = virhe instanceof Error ? virhe.message : String(virhe);
  return `Hiskin sivu oli odottamattoman muotoinen (${syy}). Hiski on voinut muuttua; ongelmasta voi ilmoittaa: ${ILMOITA_ONGELMASTA}`;
}

const KIRJAN_NIMI: Record<string, string> = {
  kastetut: "kastetut",
  vihityt: "vihityt",
  haudatut: "haudatut",
  smuutt: "sisäänmuuttaneet",
  umuutt: "poismuuttaneet",
  kaikki: "kaikki kirjat",
};

/** The year of "vvvv", "kk.vvvv" or "pp.kk.vvvv". */
const vuosiluku = (arvo: string | undefined) => {
  const teksti = arvo?.trim();
  return teksti ? Number(teksti.slice(-4)) : undefined;
};

/**
 * Facts and next steps about a search result for the agent: truncation,
 * unknown search words, parishes without the book and years outside what
 * Hiski has indexed for the parish.
 */
export function hakutuloksenHuomautukset(
  tulos: HakuTulos,
  pyynto: {
    kirja: string;
    seurakunnat: readonly Seurakunta[];
    alkuvuosi?: string;
    loppuvuosi?: string;
  },
): string[] {
  const huomautukset: string[] = [];
  const kirjanNimi = KIRJAN_NIMI[pyynto.kirja] ?? pyynto.kirja;

  for (const lohko of tulos.lohkot) {
    if (!lohko.katkaistu) continue;
    const { nimi, koodi } = lohko.seurakunta;
    const noin = lohko.loytyi_noin === undefined ? "" : `, löytyi noin ${lohko.loytyi_noin}`;
    const jatko = lohko.jatkokohta
      ? ` Hakua voi jatkaa antamalla jatkokohta "${lohko.jatkokohta}" samalla haulla pelkälle seurakunnalle ${koodi}, tai hakua voi rajata.`
      : " Hakua voi rajata tai maksimia kasvattaa.";
    huomautukset.push(
      `${nimi} (${KIRJAN_NIMI[lohko.kirja] ?? lohko.kirja}): näytettiin ${lohko.tapahtumat.length}${noin}.${jatko}`,
    );
  }

  // The same word is listed once per parish block; mention it once.
  const tuntemattomat = new Set<string>();
  for (const lohko of tulos.lohkot) {
    for (const termi of lohko.hakutermit) {
      if ("ei_tietokannassa" in termi) tuntemattomat.add(`${termi.haku} (${termi.kentta})`);
    }
  }
  for (const kuvaus of tuntemattomat) {
    huomautukset.push(
      `Hakusanaa ${kuvaus} ei ole Hiskin tietokannassa; kirjoitusasu voi olla toinen.`,
    );
  }

  const palautetut = new Set(tulos.lohkot.map((l) => l.seurakunta.koodi));
  for (const seurakunta of pyynto.seurakunnat) {
    if (palautetut.has(seurakunta.koodi)) continue;
    const vuodet = seurakunta.vuodet[pyynto.kirja as keyof Seurakunta["vuodet"]];
    huomautukset.push(
      vuodet && vuodet.length === 0
        ? `Seurakunnalla ${seurakunta.nimi} (${seurakunta.koodi}) ei ole Hiskissä kirjaa ${kirjanNimi}.`
        : `Hiski ei palauttanut tuloksia seurakunnalle ${seurakunta.nimi} (${seurakunta.koodi}).`,
    );
  }

  const alku = vuosiluku(pyynto.alkuvuosi);
  const loppu = vuosiluku(pyynto.loppuvuosi);
  if (alku !== undefined || loppu !== undefined) {
    for (const seurakunta of pyynto.seurakunnat) {
      const vuodet = seurakunta.vuodet[pyynto.kirja as keyof Seurakunta["vuodet"]];
      if (!vuodet || vuodet.length === 0) continue;
      const osuu = vuodet.some(
        (v) => (alku === undefined || v.loppu >= alku) && (loppu === undefined || v.alku <= loppu),
      );
      if (!osuu) {
        huomautukset.push(
          `Seurakunnan ${seurakunta.nimi} ${kirjanNimi} on Hiskissä vuosilta ${vuodetTekstiksi(vuodet)}; haettu väli ${alku ?? ""}–${loppu ?? ""} on niiden ulkopuolella.`,
        );
      }
    }
  }
  return huomautukset;
}
