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

  it("has a privacy policy section linking PRIVACY.md", () => {
    expect(teksti).toMatch(/^## Tietosuoja \(Privacy Policy\)$/m);
    expect(teksti).toContain("](PRIVACY.md)");
  });
});

describe("PRIVACY.md", () => {
  const tiedosto = new URL("../PRIVACY.md", import.meta.url);
  const teksti = existsSync(tiedosto) ? readFileSync(tiedosto, "utf8") : "";

  // What Anthropic requires a local connector's privacy policy to cover, in both languages.
  it.each([
    "## Tietosuojaseloste",
    "### Kerättävät tiedot",
    "### Käyttö ja tallennus",
    "### Tietojen luovutus kolmansille osapuolille",
    "### Säilytysaika",
    "### Yhteystiedot",
    "## Privacy Policy",
    "### Data collection",
    "### Usage and storage",
    "### Third-party sharing",
    "### Data retention",
    "### Contact",
  ])("has the section %s", (otsikko) => {
    expect(teksti).toMatch(new RegExp(`^${otsikko.replace(/[()]/g, "\\$&")}$`, "m"));
  });

  it("names where the searches are sent and how to reach the author", () => {
    expect(teksti).toContain("hiski.genealogia.fi");
    expect(teksti).toContain("https://github.com/jleh/hiski-mcp/issues");
  });
});
