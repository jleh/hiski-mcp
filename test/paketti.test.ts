import { readFileSync } from "node:fs";
import { McpbManifestSchema } from "@anthropic-ai/mcpb/schemas/0.4";
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
const versio = (teksti: string) => teksti.split(".").map(Number) as [number, number, number];
const vertaa = (a: string, b: string) => {
  const [x, y] = [versio(a), versio(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

describe("Node version of the bundle", () => {
  const vahimmais = /^>=(\d+\.\d+\.\d+)$/.exec(
    (manifesti.compatibility as { runtimes: { node: string } }).runtimes.node,
  )?.[1];

  it("is at least what every bundled dependency requires", () => {
    const lukko = lue("package-lock.json") as {
      packages: Record<string, { dev?: boolean; engines?: { node?: string } }>;
    };
    const vaatimukset = Object.entries(lukko.packages)
      .filter(([polku, paketti]) => polku !== "" && !paketti.dev)
      .flatMap(([polku, paketti]) => {
        const alin = /^>=\s*(\d+\.\d+\.\d+)$/.exec(paketti.engines?.node ?? "")?.[1];
        return alin ? [{ polku, alin }] : [];
      });
    const tiukin = vaatimukset.reduce((a, b) => (vertaa(a.alin, b.alin) >= 0 ? a : b));
    expect(vahimmais, `${tiukin.polku} vaatii Node ${tiukin.alin}`).toBeDefined();
    expect(
      vertaa(vahimmais!, tiukin.alin),
      `${tiukin.polku} vaatii Node ${tiukin.alin}`,
    ).toBeGreaterThanOrEqual(0);
  });

  it("is the version CI tests the package with", () => {
    const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
    expect(ci).toContain(`node-version: ${vahimmais}`);
  });
});
