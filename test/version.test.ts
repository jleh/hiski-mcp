import { describe, expect, it } from "vitest";
import { SERVER_NAME, SERVER_VERSION } from "../src/version.js";

describe("version", () => {
  it("exposes server name and a semver version", () => {
    expect(SERVER_NAME).toBe("hiski-mcp");
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
