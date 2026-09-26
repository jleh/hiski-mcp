import { SeurakuntaVirhe, type Vuosivali } from "./parishes.js";

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

/** The text the agent sees for an error, with a next step where one helps. */
export function virheViesti(virhe: unknown): string {
  if (virhe instanceof SeurakuntaVirhe) {
    return `${virhe.message} Seurakuntia voi etsiä etsi_seurakunta-työkalulla; koodilla ("0366") valinta on yksiselitteinen.`;
  }
  return virhe instanceof Error ? virhe.message : String(virhe);
}
