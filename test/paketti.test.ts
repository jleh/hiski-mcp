import { readFileSync } from "node:fs";
import { McpbManifestSchema } from "@anthropic-ai/mcpb/schemas/0.4";
import semver from "semver";
import { describe, expect, it } from "vitest";
import { synkronoituManifesti } from "../scripts/synkronoi-manifesti.js";
import { TYOKALUT } from "../src/tyokalut.js";

const lue = (tiedosto: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../${tiedosto}`, import.meta.url), "utf8")) as Record<
    string,
    unknown
  >;

const manifesti = lue("manifest.json");
const paketti = lue("package.json");

describe("manifest.json", () => {
  it("is a valid MCPB v0.4 manifest", () => {
    const tulos = McpbManifestSchema.safeParse(manifesti);
    expect(tulos.error?.issues ?? []).toEqual([]);
    expect(manifesti.manifest_version).toBe("0.4");
  });

  it("matches package.json", () => {
    expect(manifesti).toMatchObject({
      name: paketti.name,
      version: paketti.version,
      license: paketti.license,
      description: paketti.description,
    });
  });

  it("lists the server's tools", () => {
    expect(manifesti.tools).toEqual(TYOKALUT.map((t) => ({ name: t.nimi, description: t.kuvaus })));
  });

  it("launches the bundled server with Node", () => {
    expect(manifesti.server).toEqual({
      type: "node",
      entry_point: "server/index.js",
      mcp_config: { command: "node", args: ["${__dirname}/server/index.js"] },
    });
  });

  it("is what scripts/synkronoi-manifesti.ts writes", () => {
    expect(synkronoituManifesti(manifesti, paketti, TYOKALUT)).toEqual(manifesti);
  });
});

/** "20.18.1" → comparable tuple. */
/** The lowest Node version an engines range allows, in any range form; undefined if unparseable. */
function alinNodeVersio(alue: string): string | undefined {
  return semver.validRange(alue) ? semver.minVersion(alue)?.version : undefined;
}

describe("alinNodeVersio", () => {
  it.each([
    [">=20.18.1", "20.18.1"],
    [">= 18", "18.0.0"],
    [">=20", "20.0.0"],
    ["^20.19.0 || ^22.12.0 || >=24", "20.19.0"],
    ["18 || 20", "18.0.0"],
  ])("reads %s as %s", (alue, odotettu) => {
    expect(alinNodeVersio(alue)).toBe(odotettu);
  });

  it("gives nothing for a range it cannot parse", () => {
    expect(alinNodeVersio("uusin")).toBeUndefined();
  });
});

describe("Node version of the bundle", () => {
  const vahimmais = /^>=(\d+\.\d+\.\d+)$/.exec(
    (manifesti.compatibility as { runtimes: { node: string } }).runtimes.node,
  )?.[1];

  it("is at least what every bundled dependency requires", () => {
    const lukko = lue("package-lock.json") as {
      packages: Record<string, { dev?: boolean; engines?: { node?: string } }>;
    };
    const vaatimukset = Object.entries(lukko.packages)
      .filter(([polku, paketti]) => polku !== "" && !paketti.dev && paketti.engines?.node)
      .map(([polku, paketti]) => {
        const alue = paketti.engines!.node!;
        const alin = alinNodeVersio(alue);
        expect(alin, `${polku}: Node-vaatimusta "${alue}" ei voi jäsentää`).toBeDefined();
        return { polku, alin: alin! };
      });
    const tiukin = vaatimukset.reduce((a, b) => (semver.gte(a.alin, b.alin) ? a : b));
    expect(vahimmais).toBeDefined();
    expect(
      semver.gte(vahimmais!, tiukin.alin),
      `${tiukin.polku} vaatii Node ${tiukin.alin}, manifesti sallii ${vahimmais}`,
    ).toBe(true);
  });

  it("is the version CI tests the package with", () => {
    const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    expect(ci).toContain(`node-version: ${vahimmais}`);
  });
});
