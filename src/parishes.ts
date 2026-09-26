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
