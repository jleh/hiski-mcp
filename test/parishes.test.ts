import { describe, expect, it } from "vitest";
import { parseVuosivalit } from "../src/parishes.js";

describe("parseVuosivalit", () => {
  it("parses a single year", () => {
    expect(parseVuosivalit("1848")).toEqual([{ alku: 1848, loppu: 1848 }]);
  });

  it("parses a range", () => {
    expect(parseVuosivalit("1730-1918")).toEqual([{ alku: 1730, loppu: 1918 }]);
  });

  it("parses multiple comma-separated ranges and years", () => {
    expect(parseVuosivalit("1848, 1854-1856, 1858-1916")).toEqual([
      { alku: 1848, loppu: 1848 },
      { alku: 1854, loppu: 1856 },
      { alku: 1858, loppu: 1916 },
    ]);
  });

  it("returns an empty list for empty or non-breaking-space-only text", () => {
    expect(parseVuosivalit("")).toEqual([]);
    expect(parseVuosivalit(" ")).toEqual([]);
    expect(parseVuosivalit("    ")).toEqual([]);
  });

  it("tolerates extra whitespace", () => {
    expect(parseVuosivalit(" 1697-1710 ,1718 - 1890 ")).toEqual([
      { alku: 1697, loppu: 1710 },
      { alku: 1718, loppu: 1890 },
    ]);
  });
});
