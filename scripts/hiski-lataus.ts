/**
 * Downloads raw pages from Hiski for the fixture and data scripts and the
 * live tests. Unlike src/client.ts, these return the page bytes untouched.
 */
import { setTimeout as odota } from "node:timers/promises";
import { decodeLatin1 } from "../src/encoding.js";
import type { FixtureMaarittely, Pyynto } from "./fixturet.js";

const HISKI = "https://hiski.genealogia.fi/hiski";

/** Fetches the page a fixture request describes. */
export async function lataa(pyynto: Pyynto): Promise<Uint8Array> {
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

/** Fetches a fixture's page, retrying Hiski's intermittent error page. */
export async function lataaFixture(
  fixture: FixtureMaarittely,
  loki: (viesti: string) => void = () => {},
): Promise<Uint8Array> {
  const odotettuVirhe = fixture.sisaltaa.some((s) => s.includes(SATUNNAINEN_VIRHE));
  for (let yritys = 1; ; yritys++) {
    const sivu = await lataa(fixture.pyynto);
    if (odotettuVirhe || !decodeLatin1(sivu).includes(SATUNNAINEN_VIRHE) || yritys === YRITYKSIA) {
      return sivu;
    }
    loki(`  … ${fixture.tiedosto}: Hiski palautti virhesivun, yritetään uudelleen`);
    await odota(UUDELLEENYRITYS_MS);
  }
}

/** A fixture page as text in its own character set. */
export const fixtureTekstina = (fixture: FixtureMaarittely, sivu: Uint8Array) =>
  fixture.merkisto === "utf8" ? new TextDecoder("utf-8").decode(sivu) : decodeLatin1(sivu);

/**
 * The book list of every parish at once: selecting all parishes makes Hiski
 * list each one's full name and indexed years. The codes come from the parish
 * selector on the front page.
 */
export async function lataaSeurakuntaluettelo(): Promise<{ koodit: string[]; sivu: Uint8Array }> {
  const etusivu = decodeLatin1(await lataa({ kysely: "fi" }));
  const koodit = [
    ...new Set([...etusivu.matchAll(/<OPTION VALUE="(\d{4})">/gi)].map((m) => m[1]!)),
  ];
  if (koodit.length === 0) throw new Error("Seurakuntakoodeja ei löytynyt etusivulta");
  const lomake = new URLSearchParams({ kieli: "fi", seurakunta: "" });
  for (const koodi of koodit) lomake.append("srk", koodi);
  const vastaus = await fetch(HISKI, { method: "POST", body: lomake });
  if (!vastaus.ok) throw new Error(`${HISKI}: HTTP ${vastaus.status}`);
  return { koodit, sivu: new Uint8Array(await vastaus.arrayBuffer()) };
}
