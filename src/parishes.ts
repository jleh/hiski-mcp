import * as cheerio from "cheerio";

export interface Vuosivali {
  alku: number;
  loppu: number;
}

/** Parses Hiski year coverage text such as "1848, 1854-1856" into ranges. */
export function parseVuosivalit(teksti: string): Vuosivali[] {
  return teksti
    .split(",")
    .map((osa) => osa.replace(/\s+/g, ""))
    .filter((osa) => osa.length > 0)
    .map((osa) => {
      const [alku, loppu = alku] = osa.split("-").map(Number);
      return { alku: alku!, loppu: loppu! };
    });
}

export const KIRJAT = ["kastetut", "vihityt", "haudatut", "smuutt", "umuutt"] as const;
export type Kirja = (typeof KIRJAT)[number];

export interface Seurakunta {
  koodi: string;
  nimi: string;
  rinnakkaisnimi?: string;
  koko_nimi: string;
  vuodet: Record<Kirja, Vuosivali[]>;
}

const KOODI_LINKISTA = /^\/hiski\?fi\+(\d{4})$/;

/**
 * Parses the book list Hiski returns when every parish is selected at once.
 * Each row holds the full parish name and the indexed years per book.
 */
export function parseSeurakuntaluettelo(html: string): Seurakunta[] {
  const $ = cheerio.load(html);
  const tulos: Seurakunta[] = [];
  $("tr").each((_, rivi) => {
    const solut = $(rivi).children("td");
    const linkki = solut.first().find("a");
    const koodi = KOODI_LINKISTA.exec(linkki.attr("href") ?? "")?.[1];
    if (!koodi) return;
    const koko_nimi = linkki.text().trim();
    const erotin = koko_nimi.indexOf(" - ");
    const vuodet = Object.fromEntries(
      KIRJAT.map((kirja, i) => [kirja, parseVuosivalit(solut.eq(i + 1).text())]),
    ) as Record<Kirja, Vuosivali[]>;
    tulos.push({
      koodi,
      nimi: erotin >= 0 ? koko_nimi.slice(0, erotin) : koko_nimi,
      ...(erotin >= 0 && { rinnakkaisnimi: koko_nimi.slice(erotin + 3) }),
      koko_nimi,
      vuodet,
    });
  });
  return tulos;
}
