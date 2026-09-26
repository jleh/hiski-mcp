import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

const KAYNNISTYS = fileURLToPath(new URL("../src/index.ts", import.meta.url));

describe("stdio entry point", () => {
  it("serves the tools over stdio", async () => {
    const asiakas = new Client({ name: "testi", version: "0.0.0" });
    await asiakas.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: ["--import", "tsx", KAYNNISTYS],
        stderr: "pipe",
      }),
    );
    try {
      const { tools } = await asiakas.listTools();
      expect(tools).toHaveLength(8);
      expect(asiakas.getServerVersion()?.name).toBe("hiski-mcp");
    } finally {
      await asiakas.close();
    }
  }, 20_000);
});
