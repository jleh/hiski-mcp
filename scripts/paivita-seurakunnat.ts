/**
 * Regenerates src/data/seurakunnat.json from Hiski.
 *
 * Selecting every parish at once makes Hiski return one page listing each
 * parish's full name and indexed years per book. The parish codes come from
 * the parish selector on the Hiski front page.
 *
 * Usage: npm run paivita-seurakunnat
 */
import { writeFileSync } from "node:fs";
import { decodeLatin1, poistaCloudflareLisaykset } from "../src/encoding.js";
import { parseSeurakuntaluettelo } from "../src/parishes.js";
import { lataaSeurakuntaluettelo } from "./hiski-lataus.js";

const KOHDE = new URL("../src/data/seurakunnat.json", import.meta.url);
const FIXTURE = new URL("../test/fixtures/seurakuntaluettelo.html", import.meta.url);

const { koodit, sivu: luettelo } = await lataaSeurakuntaluettelo();
const seurakunnat = parseSeurakuntaluettelo(decodeLatin1(luettelo));
if (seurakunnat.length !== koodit.length) {
  throw new Error(`Etusivulla ${koodit.length} koodia, luettelossa ${seurakunnat.length}`);
}
// One parish per line keeps the file compact and its diffs readable.
writeFileSync(KOHDE, `[\n${seurakunnat.map((s) => JSON.stringify(s)).join(",\n")}\n]\n`);
// The raw page doubles as the test fixture that guards the data above.
writeFileSync(FIXTURE, poistaCloudflareLisaykset(luettelo));
console.log(`Kirjoitettiin ${seurakunnat.length} seurakuntaa: ${KOHDE.pathname}`);
