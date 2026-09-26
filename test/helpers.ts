import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeLatin1 } from "../src/encoding.js";

/** Reads a saved Hiski response (ISO-8859-1) from test/fixtures. */
export function lueFixture(nimi: string): string {
  const polku = fileURLToPath(new URL(`./fixtures/${nimi}`, import.meta.url));
  return decodeLatin1(readFileSync(polku));
}
