const latin1 = new TextDecoder("latin1");

/** Hiski serves its pages as ISO-8859-1. */
export function decodeLatin1(data: ArrayBuffer | Uint8Array): string {
  return latin1.decode(data);
}

const CLOUDFLARE_SKRIPTI = /<script>[^<]*__CF\$cv\$params[^]*?<\/script>/;
const CLOUDFLARE_SAHKOPOSTI =
  /<A HREF="\/cdn-cgi\/l\/email-protection#[0-9a-f]*"><span class="__cf_email__" data-cfemail="[0-9a-f]*">(\[email&#160;protected\])<\/span><\/A>/gi;

/**
 * Removes what Cloudflare adds to every Hiski page with a per-request value:
 * the challenge script and the obfuscated e-mail link. Otherwise saved
 * fixtures would change on every download.
 * Works on raw bytes: Node's "latin1" maps each byte to one character and back.
 */
export function poistaCloudflareLisaykset(sivu: Uint8Array): Uint8Array {
  const teksti = Buffer.from(sivu)
    .toString("latin1")
    .replace(CLOUDFLARE_SKRIPTI, "")
    .replace(CLOUDFLARE_SAHKOPOSTI, "$1");
  return new Uint8Array(Buffer.from(teksti, "latin1"));
}
