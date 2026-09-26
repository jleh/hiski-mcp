const latin1 = new TextDecoder("latin1");

/** Hiski serves its pages as ISO-8859-1. */
export function decodeLatin1(data: ArrayBuffer | Uint8Array): string {
  return latin1.decode(data);
}

const CLOUDFLARE_SKRIPTI = /<script>[^<]*__CF\$cv\$params[^]*?<\/script>/;

/**
 * Removes the script Cloudflare injects into every Hiski page. It carries a
 * per-request id, so saved fixtures would otherwise change on every download.
 * Works on raw bytes: Node's "latin1" maps each byte to one character and back.
 */
export function poistaCloudflareSkripti(sivu: Uint8Array): Uint8Array {
  const teksti = Buffer.from(sivu).toString("latin1");
  return new Uint8Array(Buffer.from(teksti.replace(CLOUDFLARE_SKRIPTI, ""), "latin1"));
}
