import { describe, expect, it } from "vitest";
import { parseTapahtumasivu, type TapahtumanTiedot } from "../src/tapahtumasivu.js";
import { lueFixture } from "./helpers.js";

/** Parses a fixture that must be a successfully loaded event page. */
function tapahtuma(fixture: string): TapahtumanTiedot {
  const sivu = parseTapahtumasivu(lueFixture(fixture));
  if (sivu.tila !== "ok") throw new Error(`${fixture}: ${sivu.tila}`);
  return sivu.tapahtuma;
}

describe("parseTapahtumasivu: page states", () => {
  it("recognizes Hiski's error page", () => {
    expect(parseTapahtumasivu(lueFixture("tapahtuma-virhe.html"))).toEqual({ tila: "virhe" });
  });

  it("recognizes a page without an event", () => {
    expect(parseTapahtumasivu(lueFixture("tapahtuma-olematon.html"))).toEqual({
      tila: "ei_loytynyt",
    });
  });
});

describe("parseTapahtumasivu: common fields", () => {
  it("reads the parish, book, permanent link and source links", () => {
    expect(tapahtuma("tapahtuma-kastetut.html")).toMatchObject({
      seurakunta: { koodi: "0366", nimi: "Orimattila" },
      kirja: "kastetut",
      pysyva_linkki: "https://hiski.genealogia.fi/hiski?fi+t10320690",
      linkit: [
        {
          teksti: "SSHY - Digiarkisto",
          url: "http://www.sukuhistoria.fi/sshy/sivut/HisKi-digiarkisto.php?plid=0366&year=1834",
        },
      ],
    });
  });

  it("leaves out empty comment rows", () => {
    expect(tapahtuma("tapahtuma-kastetut.html")).not.toHaveProperty("kommentit");
  });

  it("keeps a parish name that contains a separator", () => {
    expect(tapahtuma("tapahtuma-haudatut.html").seurakunta).toEqual({
      koodi: "0015",
      nimi: "Artjärvi - Artsjö",
    });
  });
});

describe("parseTapahtumasivu: kastetut", () => {
  it("splits the parents into occupation, names and age", () => {
    expect(tapahtuma("tapahtuma-kastetut.html")).toMatchObject({
      kirja: "kastetut",
      syntynyt: "21.9.1834",
      kastettu: "22.9.1834",
      kyla: "Njemis",
      talo: "Bärnilä",
      isa: { ammatti: "B.", etunimi: "Johan", patronyymi: "Hansson" },
      aiti: { etunimi: "Otteliana", patronyymi: "Andersdotter" },
      lapsi: "Maria Sofia",
    });
    expect(tapahtuma("tapahtuma-kastetut.html").isa).toEqual({
      ammatti: "B.",
      etunimi: "Johan",
      patronyymi: "Hansson",
    });
  });

  it("reads the mother's age", () => {
    expect(tapahtuma("tapahtuma-kastetut-ika.html")).toMatchObject({
      aiti: { etunimi: "Otteliana", patronyymi: "Andersdotter", ika: "22" },
    });
  });

  it("keeps a field comment on the person and the original comment", () => {
    expect(tapahtuma("tapahtuma-kastetut-kommentit.html")).toMatchObject({
      aiti: {
        etunimi: "Catharina",
        ika: "28",
        kenttakommentit: { patronyymi: ["ei patronyymiä"] },
      },
      kommentit: [{ tyyppi: "alkup", alikentta: "ALKUPKOMM", teksti: "Död 17.3.1850" }],
    });
  });
});

describe("parseTapahtumasivu: empty values", () => {
  it("leaves out a person row without any data", () => {
    const html =
      '<H2>Orimattila</H2><A HREF="/hiski?fi+t1">Linkki tähän tapahtumaan</A>' +
      "<TABLE BORDER=4><TR><TD><SMALL>Isä</SMALL> <TD>&nbsp; <TD>&nbsp; <TD>&nbsp; <TD>&nbsp; <TD>&nbsp;</TD></TR>" +
      "<TR><TD><SMALL>Lapsi</SMALL> <TD COLSPAN=5>Maria</TABLE>" +
      '<FORM><INPUT NAME="srk" VALUE="0366"><INPUT NAME="kirja" VALUE="kastetut"></FORM>';
    const sivu = parseTapahtumasivu(html);
    expect(sivu.tila === "ok" && sivu.tapahtuma).not.toHaveProperty("isa");
  });
});
