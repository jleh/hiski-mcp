const latin1 = new TextDecoder("latin1");

/** Hiski serves its pages as ISO-8859-1. */
export function decodeLatin1(data: ArrayBuffer | Uint8Array): string {
  return latin1.decode(data);
}
