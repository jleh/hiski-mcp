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

const HISKI = "https://hiski.genealogia.fi/hiski";
const KOHDE = new URL("../src/data/seurakunnat.json", import.meta.url);
const FIXTURE = new URL("../test/fixtures/seurakuntaluettelo.html", import.meta.url);

async function hae(init?: RequestInit, url = HISKI): Promise<Uint8Array> {
  const vastaus = await fetch(url, init);
  if (!vastaus.ok) throw new Error(`${url}: HTTP ${vastaus.status}`);
  return new Uint8Array(await vastaus.arrayBuffer());
}

const etusivu = decodeLatin1(await hae(undefined, `${HISKI}?fi`));
const koodit = [...new Set([...etusivu.matchAll(/<OPTION VALUE="(\d{4})">/gi)].map((m) => m[1]!))];
if (koodit.length === 0) throw new Error("Seurakuntakoodeja ei löytynyt etusivulta");

const lomake = new URLSearchParams({ kieli: "fi", seurakunta: "" });
for (const koodi of koodit) lomake.append("srk", koodi);
const luettelo = await hae({ method: "POST", body: lomake });

const seurakunnat = parseSeurakuntaluettelo(decodeLatin1(luettelo));
if (seurakunnat.length !== koodit.length) {
  throw new Error(`Etusivulla ${koodit.length} koodia, luettelossa ${seurakunnat.length}`);
}
// One parish per line keeps the file compact and its diffs readable.
writeFileSync(KOHDE, `[\n${seurakunnat.map((s) => JSON.stringify(s)).join(",\n")}\n]\n`);
// The raw page doubles as the test fixture that guards the data above.
writeFileSync(FIXTURE, poistaCloudflareLisaykset(luettelo));
console.log(`Kirjoitettiin ${seurakunnat.length} seurakuntaa: ${KOHDE.pathname}`);
