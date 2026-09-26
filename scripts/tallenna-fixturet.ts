/**
 * Downloads the parser test fixtures listed in scripts/fixturet.ts.
 *
 * Every page is checked against its expected content before anything is
 * written, so a failing run means Hiski's output has changed.
 *
 * Usage: npm run tallenna-fixturet [-- <tiedosto>...]
 */
import { writeFileSync } from "node:fs";
import { setTimeout as odota } from "node:timers/promises";
import { decodeLatin1, poistaCloudflareLisaykset } from "../src/encoding.js";
import { FIXTURET, type FixtureMaarittely, type Pyynto } from "./fixturet.js";

const HISKI = "https://hiski.genealogia.fi/hiski";
const KANSIO = new URL("../test/fixtures/", import.meta.url);
const TAUKO_MS = 300;

async function lataa(pyynto: Pyynto): Promise<Uint8Array> {
  const [url, init]: [string, RequestInit?] =
    "kysely" in pyynto
      ? [`${HISKI}?${pyynto.kysely}`]
      : "url" in pyynto
        ? [pyynto.url]
        : [HISKI, { method: "POST", body: new URLSearchParams(pyynto.lomake) }];
  const vastaus = await fetch(url, init);
  if (!vastaus.ok) throw new Error(`${url}: HTTP ${vastaus.status}`);
  return new Uint8Array(await vastaus.arrayBuffer());
}

/**
 * Hiski intermittently answers event page requests with this error instead of
 * the page (about half the time, regardless of pacing), so they are retried.
 */
const SATUNNAINEN_VIRHE = "Virhe parametrissa!";
const YRITYKSIA = 8;
const UUDELLEENYRITYS_MS = 2_000;

async function lataaSinnikkaasti(fixture: FixtureMaarittely): Promise<Uint8Array> {
  for (let yritys = 1; ; yritys++) {
    const sivu = await lataa(fixture.pyynto);
    const odotettuVirhe = fixture.sisaltaa.some((s) => s.includes(SATUNNAINEN_VIRHE));
    if (odotettuVirhe || !decodeLatin1(sivu).includes(SATUNNAINEN_VIRHE) || yritys === YRITYKSIA) {
      return sivu;
    }
    console.log(`  … ${fixture.tiedosto}: Hiski palautti virhesivun, yritetään uudelleen`);
    await odota(UUDELLEENYRITYS_MS);
  }
}

const valitut = process.argv.slice(2);
const ladattavat = valitut.length
  ? FIXTURET.filter((f) => valitut.includes(f.tiedosto))
  : FIXTURET;
const tuntemattomat = valitut.filter((v) => !FIXTURET.some((f) => f.tiedosto === v));
if (tuntemattomat.length) throw new Error(`Tuntemattomat fixturet: ${tuntemattomat.join(", ")}`);

const valmiit: [FixtureMaarittely, Uint8Array][] = [];
const virheet: string[] = [];
for (const [i, fixture] of ladattavat.entries()) {
  if (i > 0) await odota(TAUKO_MS);
  const sivu = poistaCloudflareLisaykset(await lataaSinnikkaasti(fixture));
  const teksti =
    fixture.merkisto === "utf8" ? Buffer.from(sivu).toString("utf8") : decodeLatin1(sivu);
  const puuttuvat = fixture.sisaltaa.filter((s) => !teksti.includes(s));
  if (puuttuvat.length) {
    virheet.push(`${fixture.tiedosto}: puuttuu ${puuttuvat.map((s) => JSON.stringify(s)).join(", ")}`);
  }
  valmiit.push([fixture, sivu]);
  console.log(`${puuttuvat.length ? "✗" : "✓"} ${fixture.tiedosto}`);
}

if (virheet.length) {
  console.error(`\nMitään ei tallennettu, koska Hiskin vastaukset ovat muuttuneet:\n${virheet.join("\n")}`);
  process.exit(1);
}
for (const [fixture, sivu] of valmiit) writeFileSync(new URL(fixture.tiedosto, KANSIO), sivu);
console.log(`\nTallennettiin ${valmiit.length} fixturea.`);
