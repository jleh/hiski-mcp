import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Merkisto } from "../scripts/fixturet.js";
import { decodeLatin1 } from "../src/encoding.js";

export const FIXTURE_KANSIO = fileURLToPath(new URL("./fixtures/", import.meta.url));

/** Reads a saved Hiski response from test/fixtures (ISO-8859-1 unless stated). */
export function lueFixture(nimi: string, merkisto: Merkisto = "latin1"): string {
  const tavut = readFileSync(FIXTURE_KANSIO + nimi);
  return merkisto === "utf8" ? tavut.toString("utf8") : decodeLatin1(tavut);
}
