/**
 * Saved Hiski responses used as parser test fixtures.
 * scripts/tallenna-fixturet.ts downloads them and test/fixtures.test.ts
 * checks that they are present and still contain what they are meant to show.
 */

export type Merkisto = "latin1" | "utf8";

export type Pyynto =
  /** GET https://hiski.genealogia.fi/hiski?<kysely>, e.g. "fi+0366+kastetut+18795" */
  | { kysely: string }
  /** POST https://hiski.genealogia.fi/hiski with an ASCII-only search form */
  | { lomake: Record<string, string> }
  /** GET an absolute URL (pages outside the /hiski script) */
  | { url: string };

export interface FixtureMaarittely {
  tiedosto: string;
  kuvaus: string;
  pyynto: Pyynto;
  merkisto: Merkisto;
  /** Text that must appear in the decoded page, checked on save and in tests. */
  sisaltaa: string[];
}

const haku = (kentat: Record<string, string>) => ({
  lomake: { komento: "haku", kieli: "fi", maxkpl: "50", ...kentat },
});

const JOHAN_HANSSON = { ietunimi: "Johan", ipatronyymi: "Hansson" };
const KATKAISTU = {
  kirja: "kastetut",
  maxkpl: "15",
  etunimi: "Johan",
  alkuvuosi: "1830",
  loppuvuosi: "1840",
};

export const FIXTURET: FixtureMaarittely[] = [
  {
    tiedosto: "haku-kastetut-perus.html",
    kuvaus: "suunnitelma.md:n esimerkki: hakutermit, äidin ikä, 9 tapahtumaa",
    pyynto: haku({
      srk: "0366",
      kirja: "kastetut",
      ...JOHAN_HANSSON,
      aetunimi: "Ottilia",
      apatronyymi: "Andersdotter",
    }),
    merkisto: "latin1",
    sisaltaa: ["Orimattila - kastetut", "JOHAN => Johan", "kastetut+18795", "9 tapahtumaa löytyi."],
  },
  {
    tiedosto: "haku-kastetut-kommentit.html",
    kuvaus: "kenttäkommentit (oägta), kommentti ennen äidin ikää, alkup-kommenttirivit",
    pyynto: haku({ srk: "0366", kirja: "kastetut", alkuvuosi: "1850", loppuvuosi: "1850", maxkpl: "30" }),
    merkisto: "latin1",
    sisaltaa: ["<SMALL>(oägta)</SMALL>", "<SMALL>(ei patronyymiä)</SMALL>", "alkup - ALKUPKOMM: "],
  },
  {
    tiedosto: "haku-kastetut-katkaistu.html",
    kuvaus: "yhden seurakunnan katkaistu tulos ja jatkohaun hakupos",
    pyynto: haku({ srk: "0366", ...KATKAISTU }),
    merkisto: "latin1",
    sisaltaa: ["Tapahtumia löytyi noin", "Näytettiin 15 tapahtumaa.", 'name=hakupos type=hidden value="17681"'],
  },
  {
    tiedosto: "haku-kastetut-jatko.html",
    kuvaus: "jatkohaun vastaus hakupos-parametrilla",
    pyynto: haku({ srk: "0366", ...KATKAISTU, hakupos: "17681" }),
    merkisto: "latin1",
    sisaltaa: ["kastetut+17685", "name=hakupos"],
  },
  {
    tiedosto: "haku-kastetut-katkaistu-monta.html",
    kuvaus: "usean seurakunnan katkaistu tulos: lohkokohtainen hakupos ja yhteensä-rivi",
    pyynto: haku({ srk: "0366,0015", ...KATKAISTU }),
    merkisto: "latin1",
    sisaltaa: [
      "Artjärvi - Artsjö - kastetut",
      "Orimattila - kastetut",
      "Tapahtumia löytyi yli maksimimäärän (15 tapahtumaa).",
      "Seurakunnista löytyi yhteensä",
    ],
  },
  {
    tiedosto: "haku-kastetut-tyhja.html",
    kuvaus: "ei tuloksia, ja hakutekstiä ei löydy tietokannasta",
    pyynto: haku({ srk: "0366", kirja: "kastetut", etunimi: "Xyzzyq" }),
    merkisto: "latin1",
    sisaltaa: ["hakutekstiä ei löydy tietokannasta", "Näillä hakuehdoilla ei löytynyt yhtään tapahtumia."],
  },
  {
    tiedosto: "haku-ei-lohkoja.html",
    kuvaus: "kirja, jota seurakunnalla ei ole: sivulla ei ole tuloslohkoa",
    pyynto: haku({ srk: "0366", kirja: "smuutt" }),
    merkisto: "latin1",
    sisaltaa: ["Hakulomake"],
  },
  {
    tiedosto: "haku-vihityt-monta.html",
    kuvaus: "vihityt kahdesta seurakunnasta",
    pyynto: haku({ srk: "0366,0015", kirja: "vihityt", ...JOHAN_HANSSON, alkuvuosi: "1825", loppuvuosi: "1835" }),
    merkisto: "latin1",
    sisaltaa: ["Orimattila - vihityt", "vihityt+4326", "<TH>Kuul. <TH>Vihitty"],
  },
  {
    tiedosto: "haku-haudatut-monta.html",
    kuvaus: "haudatut kahdesta seurakunnasta: ikäsarakkeet ja kommenttirivit",
    pyynto: haku({ srk: "0366,0015", kirja: "haudatut", ...JOHAN_HANSSON, alkuvuosi: "1850", loppuvuosi: "1860" }),
    merkisto: "latin1",
    sisaltaa: ["Artjärvi - Artsjö - haudatut", "haudatut+6681", "alkup - IKÄKOMM: "],
  },
  {
    tiedosto: "haku-haudatut-oma.html",
    kuvaus: "tallentajan oma kommentti (alkup - OMA)",
    pyynto: haku({ srk: "0084", kirja: "haudatut", alkuvuosi: "1800", loppuvuosi: "1801", maxkpl: "100" }),
    merkisto: "latin1",
    sisaltaa: ["alkup - OMA: "],
  },
  {
    tiedosto: "haku-smuutt.html",
    kuvaus: "sisäänmuuttaneet: minne/mistä-sarakkeet ja kohteen kenttäkommentti",
    pyynto: haku({ srk: "0015", kirja: "smuutt", maxkpl: "15" }),
    merkisto: "latin1",
    sisaltaa: ["sisäänmuuttaneet", "<TH>Lähtöpäivä", "smuutt+1", "Hauho <SMALL>(12.10.40.)</SMALL>"],
  },
  {
    tiedosto: "haku-umuutt.html",
    kuvaus: "poismuuttaneet",
    pyynto: haku({ srk: "0015", kirja: "umuutt", maxkpl: "15" }),
    merkisto: "latin1",
    sisaltaa: ["poismuuttaneet", "umuutt+0"],
  },
  {
    tiedosto: "haku-kaikki.html",
    kuvaus: "kaikki kirjat: useita alitaulukoita samassa seurakuntalohkossa",
    pyynto: haku({ srk: "0366", kirja: "kaikki", ...JOHAN_HANSSON, alkuvuosi: "1834", loppuvuosi: "1835" }),
    merkisto: "latin1",
    sisaltaa: ["Orimattila - kaikki", "kastetut+18795", "vihityt+4326"],
  },
  {
    tiedosto: "tapahtuma-kastetut.html",
    kuvaus: "kastetun tapahtumasivu",
    pyynto: { kysely: "fi+0366+kastetut+18795" },
    merkisto: "latin1",
    sisaltaa: ["Linkki tähän tapahtumaan", "Maria Sofia", "SSHY - Digiarkisto"],
  },
  {
    tiedosto: "tapahtuma-vihityt.html",
    kuvaus: "vihityn tapahtumasivu",
    pyynto: { kysely: "fi+0366+vihityt+4326" },
    merkisto: "latin1",
    sisaltaa: ["Linkki tähän tapahtumaan", "Otteliana"],
  },
  {
    tiedosto: "tapahtuma-haudatut.html",
    kuvaus: "haudatun tapahtumasivu kommentilla",
    pyynto: { kysely: "fi+0015+haudatut+6681" },
    merkisto: "latin1",
    sisaltaa: ["Linkki tähän tapahtumaan", "Bukref", "icke gift"],
  },
  {
    tiedosto: "tapahtuma-smuutt.html",
    kuvaus: "sisäänmuuttaneen tapahtumasivu",
    pyynto: { kysely: "fi+0015+smuutt+1" },
    merkisto: "latin1",
    sisaltaa: ["Linkki tähän tapahtumaan", "Hauho"],
  },
  {
    tiedosto: "tapahtuma-virhe.html",
    kuvaus: "virhesivu, jonka Hiski palauttaa myös satunnaisesti olemassa olevalle tapahtumalle",
    pyynto: { kysely: "fi+0366+eikirja+1" },
    merkisto: "latin1",
    sisaltaa: ["Virhe parametrissa! Seurakuntaa/kirjaa ei löytynyt."],
  },
  {
    tiedosto: "tapahtuma-olematon.html",
    kuvaus: "olematon tapahtumanumero: otsikot ilman tapahtumataulukkoa",
    pyynto: { kysely: "fi+0366+kastetut+99999999" },
    merkisto: "latin1",
    sisaltaa: ["<H2>Orimattila</H2>", "<H3>Kastetut</H3>"],
  },
  {
    tiedosto: "seurakunta-0366.html",
    kuvaus: "seurakuntasivu: kirjat vuosineen, naapurit, lisätietolinkki",
    pyynto: { kysely: "fi+0366" },
    merkisto: "latin1",
    sisaltaa: ["(1697-1710, 1718-1890)", "/hiski?fi+0015", "Lisätietoja seurakunnasta"],
  },
  {
    tiedosto: "seurakunta-0015.html",
    kuvaus: "seurakuntasivu, jossa myös muuttoluettelot",
    pyynto: { kysely: "fi+0015" },
    merkisto: "latin1",
    sisaltaa: ["fi+0015+smuutt", "fi+0015+umuutt"],
  },
  {
    tiedosto: "seurakuntatiedot-366.html",
    kuvaus: "seurakunnan lisätiedot: maakunta, historia, naapurit, kylät",
    pyynto: { url: "https://hiski.genealogia.fi/historia/mini-pgsql.php?srk=366&kieli=fi" },
    merkisto: "utf8",
    sisaltaa: ["Seurakunta: 366 - Orimattila", "Päijät-Häme", "Kylät", "Heinämaa (Hyyttäri)"],
  },
  {
    tiedosto: "seurakuntatiedot-706.html",
    kuvaus: "suppeat lisätiedot: vanhat nimet, ei kyliä eikä naapureita",
    pyynto: { url: "https://hiski.genealogia.fi/historia/mini-pgsql.php?srk=706&kieli=fi" },
    merkisto: "utf8",
    sisaltaa: ["Seurakunta: 706", "Vanhat nimet"],
  },
  {
    tiedosto: "seurakuntatiedot-ei-loytynyt.html",
    kuvaus: "lisätietosivu seurakunnalle, jolla lisätietoja ei ole",
    pyynto: { url: "https://hiski.genealogia.fi/historia/mini-pgsql.php?srk=4100&kieli=fi" },
    merkisto: "utf8",
    sisaltaa: ["Seurakunta: 4100 - Ei löytynyt"],
  },
];
