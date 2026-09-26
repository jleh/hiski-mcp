import { describe, expect, it } from "vitest";
import {
  SEURAKUNNAT,
  SeurakuntaVirhe,
  etsiSeurakunta,
  normalisoi,
  parseSeurakuntaluettelo,
  parseVuosivalit,
  ratkaiseSeurakunnat,
} from "../src/parishes.js";
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

describe("SEURAKUNNAT", () => {
  // scripts/paivita-seurakunnat.ts writes both the data and the fixture,
  // so they must always match the current parser output exactly.
  it("matches the parsed fixture", () => {
    expect(SEURAKUNNAT).toEqual(parseSeurakuntaluettelo(lueFixture("seurakuntaluettelo.html")));
  });
});

describe("normalisoi", () => {
  it("lowercases, strips diacritics and collapses whitespace", () => {
    expect(normalisoi("  Artjärvi   -  ARTSJÖ Åbo ")).toBe("artjarvi - artsjo abo");
  });
});

describe("etsiSeurakunta", () => {
  const koodit = (haku: string) => etsiSeurakunta(haku).map((s) => s.koodi);

  it("finds by exact name regardless of case", () => {
    expect(koodit("Orimattila")[0]).toBe("0366");
    expect(koodit("orimattila")[0]).toBe("0366");
  });

  it("finds by parallel (Swedish) name with or without diacritics", () => {
    expect(koodit("Artsjö")).toEqual(["0015"]);
    expect(koodit("artsjo")).toEqual(["0015"]);
  });

  it("finds by code with or without leading zeros", () => {
    expect(koodit("0366")).toEqual(["0366"]);
    expect(koodit("366")).toEqual(["0366"]);
  });

  it("ranks exact matches before prefix matches", () => {
    expect(koodit("Kokkola")).toEqual(["0218", "0172"]);
    expect(koodit("Helsinki")[0]).toBe("0084");
  });

  it("matches the start of any word in the full name", () => {
    expect(koodit("Karleby")).toContain("0172");
    expect(koodit("Pyhäjärvi Ul")).toContain("0426");
  });

  it("falls back to inflected-stem matching when nothing else matches", () => {
    expect(koodit("Kristiinankaupunki")).toEqual(expect.arrayContaining(["0236", "0686"]));
    expect(koodit("Turku")).toEqual(expect.arrayContaining(["0566", "0569"]));
  });

  it("ranks closer stem matches first", () => {
    // "Turun" is a closer stem of "Turku" than the unrelated "Turtola".
    expect(koodit("Turku").at(-1)).toBe("0561");
  });

  it("returns nothing for unknown names", () => {
    expect(koodit("xyzzy")).toEqual([]);
    expect(koodit("   ")).toEqual([]);
  });
});

describe("ratkaiseSeurakunnat", () => {
  const koodit = (syotteet: string[]) => ratkaiseSeurakunnat(syotteet).map((s) => s.koodi);
  const virhe = (syotteet: string[]) => {
    try {
      ratkaiseSeurakunnat(syotteet);
    } catch (e) {
      return e;
    }
    throw new Error("expected ratkaiseSeurakunnat to throw");
  };

  it("resolves codes and names", () => {
    expect(koodit(["0366", "Artjärvi"])).toEqual(["0366", "0015"]);
  });

  it("accepts an exact name even when other parishes share its prefix", () => {
    expect(koodit(["Kokkola"])).toEqual(["0218"]);
  });

  it("accepts a single loose match", () => {
    expect(koodit(["Karleby lf"])).toEqual(["0172"]);
  });

  it("removes duplicates", () => {
    expect(koodit(["0366", "Orimattila", "366"])).toEqual(["0366"]);
  });

  it("rejects unknown parishes", () => {
    const e = virhe(["Orimattila", "xyzzy"]);
    expect(e).toBeInstanceOf(SeurakuntaVirhe);
    expect((e as SeurakuntaVirhe).syote).toBe("xyzzy");
    expect((e as SeurakuntaVirhe).ehdokkaat).toEqual([]);
    expect((e as SeurakuntaVirhe).message).toContain("xyzzy");
  });

  it("rejects ambiguous names and lists the candidates", () => {
    const e = virhe(["Kristiinankaupunki"]) as SeurakuntaVirhe;
    expect(e).toBeInstanceOf(SeurakuntaVirhe);
    expect(e.ehdokkaat.map((s) => s.koodi).sort()).toEqual(["0236", "0686"]);
    expect(e.message).toContain("0236");
  });

  it("limits the candidate list", () => {
    const e = virhe(["srk"]) as SeurakuntaVirhe;
    expect(e.ehdokkaat).toHaveLength(10);
  });
});
