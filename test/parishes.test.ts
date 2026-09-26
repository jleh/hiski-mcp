import { describe, expect, it } from "vitest";
import { parseSeurakuntaluettelo, parseVuosivalit } from "../src/parishes.js";
import { lueFixture } from "./helpers.js";

describe("parseVuosivalit", () => {
  it("parses a single year", () => {
    expect(parseVuosivalit("1848")).toEqual([{ alku: 1848, loppu: 1848 }]);
  });

  it("parses a range", () => {
    expect(parseVuosivalit("1730-1918")).toEqual([{ alku: 1730, loppu: 1918 }]);
  });

  it("parses multiple comma-separated ranges and years", () => {
    expect(parseVuosivalit("1848, 1854-1856, 1858-1916")).toEqual([
      { alku: 1848, loppu: 1848 },
      { alku: 1854, loppu: 1856 },
      { alku: 1858, loppu: 1916 },
    ]);
  });

  it("returns an empty list for empty or non-breaking-space-only text", () => {
    expect(parseVuosivalit("")).toEqual([]);
    expect(parseVuosivalit(" ")).toEqual([]);
    expect(parseVuosivalit("    ")).toEqual([]);
  });

  it("tolerates extra whitespace", () => {
    expect(parseVuosivalit(" 1697-1710 ,1718 - 1890 ")).toEqual([
      { alku: 1697, loppu: 1710 },
      { alku: 1718, loppu: 1890 },
    ]);
  });
});

describe("parseSeurakuntaluettelo", () => {
  const seurakunnat = parseSeurakuntaluettelo(lueFixture("seurakuntaluettelo.html"));
  const hae = (koodi: string) => seurakunnat.find((s) => s.koodi === koodi);

  it("finds every parish once", () => {
    expect(seurakunnat).toHaveLength(539);
    expect(new Set(seurakunnat.map((s) => s.koodi)).size).toBe(539);
  });

  it("splits the name and parallel name and parses all five books", () => {
    expect(hae("0015")).toEqual({
      koodi: "0015",
      nimi: "Artjärvi",
      rinnakkaisnimi: "Artsjö",
      koko_nimi: "Artjärvi - Artsjö",
      vuodet: {
        kastetut: [
          { alku: 1695, loppu: 1718 },
          { alku: 1720, loppu: 1911 },
        ],
        vihityt: [{ alku: 1730, loppu: 1918 }],
        haudatut: [{ alku: 1732, loppu: 1919 }],
        smuutt: [{ alku: 1741, loppu: 1747 }],
        umuutt: [{ alku: 1741, loppu: 1747 }],
      },
    });
  });

  it("keeps names untruncated", () => {
    expect(hae("0085")?.koko_nimi).toBe("Helsingin saksalainen srk - Helsingfors tyska förs");
  });

  it("leaves rinnakkaisnimi undefined and missing books empty", () => {
    const orimattila = hae("0366");
    expect(orimattila?.nimi).toBe("Orimattila");
    expect(orimattila?.rinnakkaisnimi).toBeUndefined();
    expect(orimattila?.vuodet.smuutt).toEqual([]);
    expect(orimattila?.vuodet.kastetut).toEqual([
      { alku: 1697, loppu: 1710 },
      { alku: 1718, loppu: 1890 },
    ]);
  });

  it("splits only at the first separator", () => {
    expect(hae("0426")).toMatchObject({
      nimi: "Karkkila (ent. Pyhäjärvi Ul)",
      rinnakkaisnimi: "Högfors",
    });
  });
});
