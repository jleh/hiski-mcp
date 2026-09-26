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
import { poistaCloudflareLisaykset } from "../src/encoding.js";
import { FIXTURET, type FixtureMaarittely } from "./fixturet.js";
import { fixtureTekstina, lataaFixture } from "./hiski-lataus.js";

const KANSIO = new URL("../test/fixtures/", import.meta.url);
const TAUKO_MS = 300;

const valitut = process.argv.slice(2);
const ladattavat = valitut.length ? FIXTURET.filter((f) => valitut.includes(f.tiedosto)) : FIXTURET;
const tuntemattomat = valitut.filter((v) => !FIXTURET.some((f) => f.tiedosto === v));
if (tuntemattomat.length) throw new Error(`Tuntemattomat fixturet: ${tuntemattomat.join(", ")}`);

const valmiit: [FixtureMaarittely, Uint8Array][] = [];
const virheet: string[] = [];
for (const [i, fixture] of ladattavat.entries()) {
  if (i > 0) await odota(TAUKO_MS);
  const sivu = poistaCloudflareLisaykset(await lataaFixture(fixture, console.log));
  const teksti = fixtureTekstina(fixture, sivu);
  const puuttuvat = fixture.sisaltaa.filter((s) => !teksti.includes(s));
  if (puuttuvat.length) {
    virheet.push(
      `${fixture.tiedosto}: puuttuu ${puuttuvat.map((s) => JSON.stringify(s)).join(", ")}`,
    );
  }
  valmiit.push([fixture, sivu]);
  console.log(`${puuttuvat.length ? "✗" : "✓"} ${fixture.tiedosto}`);
}

if (virheet.length) {
  console.error(
    `\nMitään ei tallennettu, koska Hiskin vastaukset ovat muuttuneet:\n${virheet.join("\n")}`,
  );
  process.exit(1);
}
for (const [fixture, sivu] of valmiit) writeFileSync(new URL(fixture.tiedosto, KANSIO), sivu);
console.log(`\nTallennettiin ${valmiit.length} fixturea.`);
