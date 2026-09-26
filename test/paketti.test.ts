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
