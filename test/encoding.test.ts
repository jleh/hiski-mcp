import { describe, expect, it } from "vitest";
import { poistaCloudflareLisaykset } from "../src/encoding.js";

const tavut = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

describe("poistaCloudflareLisaykset", () => {
  const sahkoposti = (a: string, b: string) =>
    `<A HREF="/cdn-cgi/l/email-protection#${a}"><span class="__cf_email__" data-cfemail="${b}">[email&#160;protected]</span></A>`;

  const cloudflare =
    "<script>(function(){var d=1;d.innerHTML=\"window.__CF$cv$params={r:'a4110d1029ce56f6'};\";})();</script>";

  it("removes Cloudflare's injected script", () => {
    const sivu = tavut(`<BODY>sisältö${cloudflare}</BODY></HTML>`);
    expect(poistaCloudflareLisaykset(sivu)).toEqual(tavut("<BODY>sisältö</BODY></HTML>"));
  });

  it("keeps every other byte intact, including 0x80-0x9f", () => {
    const sivu = Uint8Array.from([0x3c, 0x80, 0x92, 0x9f, 0xe4, 0xff, 0x3e]);
    expect(poistaCloudflareLisaykset(sivu)).toEqual(sivu);
  });

  it("replaces the per-request obfuscated e-mail link with a fixed text", () => {
    const eka = poistaCloudflareLisaykset(tavut(`Sähköposti: ${sahkoposti("3645", "5e2d")}<BR>`));
    const toka = poistaCloudflareLisaykset(tavut(`Sähköposti: ${sahkoposti("4231", "c7b4")}<BR>`));
    expect(eka).toEqual(tavut("Sähköposti: [email&#160;protected]<BR>"));
    expect(toka).toEqual(eka);
  });

  it("keeps other scripts", () => {
    const sivu = tavut("<script>function t(a) {}</script>");
    expect(poistaCloudflareLisaykset(sivu)).toEqual(sivu);
  });
});
