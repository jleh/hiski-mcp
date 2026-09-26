import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { siisti } from "./teksti.js";

export interface Solu {
  arvo?: string;
  /** Short comments Hiski prints in the cell as <SMALL>(…)</SMALL>. */
  kommentit: string[];
}

/**
 * Reads a table cell from a Hiski page: its text without links, with the
 * parenthesised <SMALL> field comments separated out.
 */
export function jasennaSolu($: CheerioAPI, solu: Cheerio<Element>): Solu {
  const kopio = solu.clone();
  kopio.children("a").remove();
  const kommentit = kopio
    .children("small")
    .remove()
    .map((_, small) => siisti($(small).text())?.replace(/^\((.*)\)$/, "$1"))
    .get()
    .filter((k): k is string => k !== undefined);
  const arvo = siisti(kopio.text());
  return { ...(arvo && { arvo }), kommentit };
}
