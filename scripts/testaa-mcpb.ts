/**
 * Checks hiski-mcp.mcpb the way Claude Desktop uses it: unpacked into an
 * empty directory without node_modules and started with `node server/index.js`.
 * Only local tools are called, so no network is needed.
 *
 * Usage: npm run testaa-paketti (after npm run paketoi)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const PAKETTI = fileURLToPath(new URL("../hiski-mcp.mcpb", import.meta.url));
const versio = (
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    version: string;
  }
).version;

function varmista(ehto: unknown, viesti: string): asserts ehto {
  if (!ehto) throw new Error(`Paketin testi epäonnistui: ${viesti}`);
}

const kansio = mkdtempSync(join(tmpdir(), "hiski-mcpb-"));
try {
  execFileSync("npx", ["--no-install", "mcpb", "unpack", PAKETTI, kansio], { stdio: "ignore" });
  varmista(!existsSync(join(kansio, "node_modules")), "paketissa on node_modules");

  const asiakas = new Client({ name: "paketin-testi", version: "0" });
  await asiakas.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [join(kansio, "server", "index.js")],
      cwd: kansio,
    }),
  );
  try {
    const palvelin = asiakas.getServerVersion();
    varmista(palvelin?.name === "hiski-mcp", `nimi ${palvelin?.name}`);
    varmista(palvelin.version === versio, `versio ${palvelin.version}, odotettiin ${versio}`);
    const { tools } = await asiakas.listTools();
    varmista(tools.length === 8, `${tools.length} työkalua`);
    const tulos = await asiakas.callTool({
      name: "etsi_seurakunta",
      arguments: { nimi: "Artsjö" },
    });
    const teksti = (tulos.content as { text: string }[])[0]?.text ?? "";
    varmista(teksti.includes('"koodi":"0015"'), `etsi_seurakunta palautti ${teksti}`);
  } finally {
    await asiakas.close();
  }
  console.log(
    `✓ ${PAKETTI} toimii Node ${process.versions.node}:lla (versio ${versio}, 8 työkalua)`,
  );
} finally {
  rmSync(kansio, { recursive: true, force: true });
}
