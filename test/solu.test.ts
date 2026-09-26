import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { jasennaSolu } from "../src/solu.js";

const solu = (html: string) => {
  const $ = cheerio.load(`<table><tr><td>${html}</td></tr></table>`);
  return jasennaSolu($, $("td").first());
};

describe("jasennaSolu", () => {
  it("separates parenthesised field comments from the value", () => {
    expect(solu("Hauho <SMALL>(12.10.40.)</SMALL>")).toEqual({
      arvo: "Hauho",
      kommentit: ["12.10.40."],
    });
  });

  it("drops the event link and empty cells", () => {
    expect(solu('<a href="/hiski?fi+0366+kastetut+1"><img></a>&nbsp;')).toEqual({ kommentit: [] });
  });

  it("ignores empty field comments", () => {
    expect(solu("Maria <SMALL>()</SMALL><SMALL> </SMALL>")).toEqual({
      arvo: "Maria",
      kommentit: [],
    });
  });
});
