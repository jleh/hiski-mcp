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
    expect(tapahtuma("tapahtuma-kastetut.html")).toHaveProperty("isa", {
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

describe("parseTapahtumasivu: vihityt", () => {
  it("reads both spouses with their homes and split names", () => {
    const vihitty = tapahtuma("tapahtuma-vihityt.html");
    expect(vihitty).toMatchObject({ kirja: "vihityt", vihitty: "28.9.1834" });
    expect(vihitty).not.toHaveProperty("kuulutettu");
    expect(vihitty).toMatchObject({
      mies: {
        kyla: "Njemis",
        talo: "Bärnilä",
        ammatti: "Bonde Värd ungkarl",
        etunimi: "Johan",
        patronyymi: "Hansson",
      },
      vaimo: {
        kyla: "Njemis",
        talo: "Bärnilä",
        ammatti: "Bonde dotter",
        etunimi: "Otteliana",
        patronyymi: "Anders:dr",
      },
    });
  });
});

describe("parseTapahtumasivu: haudatut", () => {
  it("reads the deceased, cause of death and age", () => {
    expect(tapahtuma("tapahtuma-haudatut.html")).toMatchObject({
      kirja: "haudatut",
      kuollut: "3.4.1854",
      haudattu: "9.4.1854",
      kyla: "Hetana",
      talo: "Äijälä",
      henkilo: { ammatti: "Dreng", etunimi: "Johannes", patronyymi: "Hansson" },
      kuolinsyy: "Bukref",
      ika: { vuodet: "28" },
      kommentit: [{ tyyppi: "alkup", alikentta: "ALKUPKOMM", teksti: "icke gift" }],
    });
  });

  it("reads the relative and an age given in months", () => {
    const haudattu = tapahtuma("tapahtuma-haudatut-omainen.html");
    expect(haudattu).toMatchObject({
      henkilo: { ammatti: "Son", etunimi: "Carl Gustaf" },
      kuolinsyy: "Slag",
      omainen: { ammatti: "Borg:", sukunimi: "Wikström" },
    });
    expect(haudattu).toHaveProperty("ika", { kuukaudet: "2" });
    expect(haudattu).not.toHaveProperty("kyla");
  });

  it("keeps the recorder's own comment given as an original comment", () => {
    expect(tapahtuma("tapahtuma-haudatut-oma.html").kommentit).toEqual([
      {
        tyyppi: "alkup",
        alikentta: "OMA",
        teksti: "Fiskaren Matts Sundbergs Son [kuollut 2/3 1800]",
      },
    ]);
  });
});

describe("parseTapahtumasivu: muuttaneet", () => {
  it("reads a move into the parish", () => {
    const muutto = tapahtuma("tapahtuma-smuutt.html");
    expect(muutto).toMatchObject({
      kirja: "smuutt",
      saapumispaiva: "6.1.1741",
      kyla: "Kintula",
      talo: "Heikkilä t.",
      toinen_paikka: "Hauho",
      kenttakommentit: { toinen_paikka: ["12.10.40."] },
      henkilo: { ammatti: "Pig.", etunimi: "Anna", patronyymi: "Josephsdr" },
      // The empty MUUTKOMM is left out.
      kommentit: [{ tyyppi: "alkup", alikentta: "VV", teksti: "\\K2." }],
    });
    expect(muutto).not.toHaveProperty("lahtopaiva");
  });

  it("reads a move out of the parish with the headings reversed", () => {
    expect(tapahtuma("tapahtuma-umuutt.html")).toMatchObject({
      seurakunta: { koodi: "0003", nimi: "Akaa" },
      kirja: "umuutt",
      lahtopaiva: "29.9.1806",
      kyla: "Viala",
      toinen_paikka: "Tavastehus",
      henkilo: { ammatti: "Pig.", etunimi: "Maria", patronyymi: "Johansdr." },
      kommentit: [{ tyyppi: "alkup", alikentta: "ALKUPKOMM", teksti: "föd. 15.6.1780." }],
    });
  });
});

describe("parseTapahtumasivu: unusual age", () => {
  it("keeps an age that is not in the usual form as text", () => {
    const html =
      '<H2>Orimattila</H2><A HREF="/hiski?fi+t1">Linkki tähän tapahtumaan</A>' +
      "<TABLE BORDER=4><TR><TD><SMALL>Kuolinsyy / Ikä</SMALL> <TD COLSPAN=2>Slag <TD COLSPAN=2>½ år</TR></TABLE>" +
      '<FORM><INPUT NAME="srk" VALUE="0366"><INPUT NAME="kirja" VALUE="haudatut"></FORM>';
    const sivu = parseTapahtumasivu(html);
    expect(sivu).toMatchObject({
      tila: "ok",
      tapahtuma: { kuolinsyy: "Slag", ika_teksti: "½ år" },
    });
    expect(sivu.tila === "ok" && sivu.tapahtuma).not.toHaveProperty("ika");
  });
});

describe("parseTapahtumasivu: robustness", () => {
  const sivu = (kirja: string, rivit: string) =>
    parseTapahtumasivu(
      '<H2>Orimattila</H2><A HREF="/hiski?fi+t1">Linkki tähän tapahtumaan</A>' +
        `<TABLE BORDER=4>${rivit}</TABLE>` +
        `<FORM><INPUT NAME="srk" VALUE="0366"><INPUT NAME="kirja" VALUE="${kirja}"></FORM>`,
    );

  it("rejects a book it does not know with a clear error", () => {
    expect(() => sivu("tilastot", "<TR><TD><SMALL>Lapsi</SMALL> <TD>Maria</TR>")).toThrow(
      "Tapahtumasivua ei tunnistettu",
    );
  });

  it("keeps field comments on the age and other top-level cells", () => {
    expect(
      sivu(
        "haudatut",
        "<TR><TD><SMALL>Kuolinsyy / Ikä</SMALL> <TD>Slag <SMALL>(?)</SMALL> " +
          "<TD>28 v. - kk - vko - pv <SMALL>(n.)</SMALL></TR>",
      ),
    ).toMatchObject({
      tila: "ok",
      tapahtuma: {
        kuolinsyy: "Slag",
        ika: { vuodet: "28" },
        kenttakommentit: { kuolinsyy: ["?"], ika: ["n."] },
      },
    });
  });
});
