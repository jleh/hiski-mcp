/**
 * Builds hiski-mcp.mcpb for Claude Desktop: the server bundled into one file
 * with esbuild (no node_modules), plus the manifest, icon and licence.
 *
 * Usage: npm run paketoi
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const juuri = (polku: string) => fileURLToPath(new URL(`../${polku}`, import.meta.url));
const KANSIO = juuri("build/mcpb");
const PAKETTI = juuri("hiski-mcp.mcpb");

rmSync(KANSIO, { recursive: true, force: true });
mkdirSync(`${KANSIO}/server`, { recursive: true });

await build({
  entryPoints: [juuri("src/index.ts")],
  outfile: `${KANSIO}/server/index.js`,
  bundle: true,
  platform: "node",
  format: "esm",
  // The oldest Node the manifest allows (compatibility.runtimes).
  target: "node20",
  // Some of cheerio's dependencies are CommonJS and call require().
  banner: {
    js: 'import { createRequire as __hiskiRequire } from "node:module"; const require = __hiskiRequire(import.meta.url);',
  },
  legalComments: "linked",
  logLevel: "warning",
});

// package.json sits next to server/ so that src/version.ts finds it as ../package.json.
for (const tiedosto of ["manifest.json", "package.json", "LICENSE", "icon.png"]) {
  copyFileSync(juuri(tiedosto), `${KANSIO}/${tiedosto}`);
}

const mcpb = (...args: string[]) =>
  execFileSync("npx", ["--no-install", "mcpb", ...args], { stdio: "inherit" });
mcpb("validate", `${KANSIO}/manifest.json`);
mcpb("pack", KANSIO, PAKETTI);

const koko = (polku: string) => `${(statSync(polku).size / 1024).toFixed(0)} kt`;
console.log(`\n${PAKETTI}: ${koko(PAKETTI)} (palvelin ${koko(`${KANSIO}/server/index.js`)})`);
