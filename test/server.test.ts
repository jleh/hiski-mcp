import { describe, expect, it } from "vitest";
import { yhdista } from "./palvelin-apu.js";

const TYOKALUT = [
  "etsi_seurakunta",
  "seurakunnan_tiedot",
  "hae_kastetut",
  "hae_vihityt",
  "hae_haudatut",
  "hae_muuttaneet",
  "hae_kaikki",
  "hae_tapahtuma",
];

describe("server", () => {
  it("lists the eight tools", async () => {
    const { asiakas } = await yhdista();
    const { tools } = await asiakas.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TYOKALUT].sort());
  });

  it("marks every tool read-only with a title and a description", async () => {
    const { asiakas } = await yhdista();
    const { tools } = await asiakas.listTools();
    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy();
      expect(tool.description?.length, tool.name).toBeGreaterThan(40);
      expect(tool.annotations, tool.name).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        // Only the parish lookup works offline from bundled data.
        openWorldHint: tool.name !== "etsi_seurakunta",
      });
    }
  });

  it("describes every parameter", async () => {
    const { asiakas } = await yhdista();
    const { tools } = await asiakas.listTools();
    for (const tool of tools) {
      const kentat = Object.entries(tool.inputSchema.properties ?? {});
      expect(kentat.length, tool.name).toBeGreaterThan(0);
      for (const [nimi, skeema] of kentat) {
        expect(
          (skeema as { description?: string }).description,
          `${tool.name}.${nimi}`,
        ).toBeTruthy();
      }
    }
  });

  it("gives search guidance in its instructions", async () => {
    const { asiakas } = await yhdista();
    const ohjeet = asiakas.getInstructions();
    expect(ohjeet).toContain("Hiski");
    expect(ohjeet).toContain("TAI");
    expect(ohjeet).toContain("Karjala");
  });

  it("names itself after the package", async () => {
    const { asiakas } = await yhdista();
    expect(asiakas.getServerVersion()).toMatchObject({ name: "hiski-mcp" });
  });
});
