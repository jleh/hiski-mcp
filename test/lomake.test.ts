import { describe, expect, it } from "vitest";
import {
  LomakeVirhe,
  koodaaLatin1,
  pyoristaMaksimi,
  rakennaHakulomake,
  tarkistaVuosi,
} from "../src/lomake.js";

describe("koodaaLatin1", () => {
  it("encodes Scandinavian letters as ISO-8859-1 bytes", () => {
    expect(koodaaLatin1([["ikyla", "Bärnilä"]])).toBe("ikyla=B%E4rnil%E4");
    expect(koodaaLatin1([["x", "Åbo Öster"]])).toBe("x=%C5bo+%D6ster");
  });

  it("escapes form syntax characters", () => {
    expect(
      koodaaLatin1([
        ["a", "1&2=3+4"],
        ["b", "?*$."],
      ]),
    ).toBe("a=1%262%3D3%2B4&b=%3F*%24.");
  });

  it("rejects characters outside ISO-8859-1", () => {
    expect(() => koodaaLatin1([["x", "Kőszeg"]])).toThrow(LomakeVirhe);
    expect(() => koodaaLatin1([["x", "a—b"]])).toThrow(/Hiski/);
  });
});

describe("tarkistaVuosi", () => {
  it.each(["1834", "5.1834", "05.1834", "21.9.1834", "29.2.1836"])("accepts %s", (arvo) => {
    expect(() => tarkistaVuosi(arvo, "alkuvuosi")).not.toThrow();
  });

  it.each(["abc", "18345", "834", "13.1834", "0.1834", "32.1.1834", "29.2.1835", "1834-1840"])(
    "rejects %s with a clear message",
    (arvo) => {
      expect(() => tarkistaVuosi(arvo, "alkuvuosi")).toThrow(LomakeVirhe);
      expect(() => tarkistaVuosi(arvo, "alkuvuosi")).toThrow(/alkuvuosi/);
    },
  );
});

describe("pyoristaMaksimi", () => {
  it.each([
    [1, 15],
    [15, 15],
    [16, 30],
    [50, 50],
    [51, 100],
    [999, 1000],
    [5000, 1000],
  ])("rounds %i up to %i", (n, odotettu) => {
    expect(pyoristaMaksimi(n)).toBe(odotettu);
  });
});

describe("rakennaHakulomake", () => {
  it("builds the form of the example search in suunnitelma.md", () => {
    const lomake = rakennaHakulomake({
      kirja: "kastetut",
      seurakunnat: ["0366"],
      kentat: {
        ietunimi: "Johan",
        aetunimi: "Ottilia",
        ipatronyymi: "Hansson",
        apatronyymi: "Andersdotter",
      },
    });
    expect(Object.fromEntries(lomake)).toEqual({
      komento: "haku",
      srk: "0366",
      kirja: "kastetut",
      kieli: "fi",
      maxkpl: "50",
      ietunimi: "Johan",
      aetunimi: "Ottilia",
      ipatronyymi: "Hansson",
      apatronyymi: "Andersdotter",
    });
  });

  it("joins parishes, rounds the maximum, trims fields and drops empty ones", () => {
    const lomake = Object.fromEntries(
      rakennaHakulomake({
        kirja: "vihityt",
        seurakunnat: ["0366", "0015"],
        kentat: { ietunimi: "  Johan ", aetunimi: "  " },
        alkuvuosi: "1825",
        loppuvuosi: "1835",
        maksimi: 20,
      }),
    );
    expect(lomake).toMatchObject({ srk: "0366,0015", maxkpl: "30", ietunimi: "Johan" });
    expect(lomake).toMatchObject({ alkuvuosi: "1825", loppuvuosi: "1835" });
    expect(lomake).not.toHaveProperty("aetunimi");
  });

  it("passes the continuation point as hakupos", () => {
    const lomake = rakennaHakulomake({
      kirja: "kastetut",
      seurakunnat: ["0366"],
      kentat: { etunimi: "Johan" },
      jatkokohta: "17681",
    });
    expect(Object.fromEntries(lomake)).toMatchObject({ hakupos: "17681" });
  });

  it("validates the dates of birth in a burial search", () => {
    expect(() =>
      rakennaHakulomake({
        kirja: "haudatut",
        seurakunnat: ["0366"],
        kentat: { syntalku: "1.13.1800" },
      }),
    ).toThrow(/syntalku/);
  });

  it.each([
    [{ seurakunnat: [] }, /seurakunta/],
    [{ seurakunnat: ["366"] }, /366/],
    [{ seurakunnat: ["0366", "0015"], jatkokohta: "17681" }, /yhden seurakunnan/],
    [{ seurakunnat: ["0366"], jatkokohta: "abc" }, /jatkokohta/],
    [{ seurakunnat: ["0366"], kentat: { kohde: "Hauho" } }, /kohde/],
    [{ seurakunnat: ["0366"], kentat: { ietunimi: "x".repeat(31) } }, /30/],
    [{ seurakunnat: ["0366"], alkuvuosi: "abc" }, /alkuvuosi/],
  ])("rejects an invalid request %#", (muutos, virhe) => {
    expect(() => rakennaHakulomake({ kirja: "kastetut", ...muutos })).toThrow(virhe);
  });

  it("accepts the fields of each book's form", () => {
    expect(() =>
      rakennaHakulomake({ kirja: "smuutt", seurakunnat: ["0015"], kentat: { kohde: "Hauho" } }),
    ).not.toThrow();
    expect(() =>
      rakennaHakulomake({
        kirja: "kaikki",
        seurakunnat: ["0366"],
        kentat: { vapaaAND: "Bonde", vapaaNOT: "Torp" },
      }),
    ).not.toThrow();
  });
});
