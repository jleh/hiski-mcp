import { describe, expect, it } from "vitest";
import { poistaCloudflareSkripti } from "../src/encoding.js";

const tavut = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

describe("poistaCloudflareSkripti", () => {
  const cloudflare =
    "<script>(function(){var d=1;d.innerHTML=\"window.__CF$cv$params={r:'a4110d1029ce56f6'};\";})();</script>";

  it("removes Cloudflare's injected script", () => {
    const sivu = tavut(`<BODY>sisältö${cloudflare}</BODY></HTML>`);
    expect(poistaCloudflareSkripti(sivu)).toEqual(tavut("<BODY>sisältö</BODY></HTML>"));
  });

  it("keeps every other byte intact, including 0x80-0x9f", () => {
    const sivu = Uint8Array.from([0x3c, 0x80, 0x92, 0x9f, 0xe4, 0xff, 0x3e]);
    expect(poistaCloudflareSkripti(sivu)).toEqual(sivu);
  });

  it("keeps other scripts", () => {
    const sivu = tavut("<script>function t(a) {}</script>");
    expect(poistaCloudflareSkripti(sivu)).toEqual(sivu);
  });
});
