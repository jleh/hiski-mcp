/**
 * Keeps manifest.json in step with package.json and the server's tools.
 * Runs on `npm version`, so a new version also lands in the manifest.
 *
 * Usage: npm run synkronoi-manifesti
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { TYOKALUT, type Tyokalu } from "../src/tyokalut.js";

type Json = Record<string, unknown>;

/** The manifest with the fields that come from package.json and the tools. */
export function synkronoituManifesti(
  manifesti: Json,
  paketti: Json,
  tyokalut: readonly Pick<Tyokalu, "nimi" | "kuvaus">[],
): Json {
  return {
    ...manifesti,
    name: paketti.name,
    version: paketti.version,
    description: paketti.description,
    license: paketti.license,
    tools: tyokalut.map((t) => ({ name: t.nimi, description: t.kuvaus })),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const tiedosto = (nimi: string) => new URL(`../${nimi}`, import.meta.url);
  const lue = (nimi: string) => JSON.parse(readFileSync(tiedosto(nimi), "utf8")) as Json;
  const manifesti = synkronoituManifesti(lue("manifest.json"), lue("package.json"), TYOKALUT);
  writeFileSync(tiedosto("manifest.json"), `${JSON.stringify(manifesti, null, 2)}\n`);
  console.log(`manifest.json: versio ${String(manifesti.version)}`);
}
