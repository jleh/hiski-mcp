import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TYOKALUT } from "../src/tyokalut.js";

const README = new URL("../README.md", import.meta.url);

describe("README.md", () => {
  const teksti = existsSync(README) ? readFileSync(README, "utf8") : "";

  it.each(TYOKALUT.map((t) => t.nimi))("mentions the tool %s", (nimi) => {
    expect(teksti).toContain(`\`${nimi}\``);
  });

  it("links the Claude Desktop package and the npx command", () => {
    expect(teksti).toContain(
      "https://github.com/jleh/hiski-mcp/releases/latest/download/hiski-mcp.mcpb",
    );
    expect(teksti).toContain("npx -y hiski-mcp");
  });

  it("says it is not made by the Genealogical Society of Finland", () => {
    expect(teksti).toMatch(/ei ole Suomen Sukututkimusseuran/);
  });
});
