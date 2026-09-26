/**
 * Normalizes text from Hiski pages: non-breaking spaces become spaces,
 * whitespace is collapsed and trimmed, and empty text becomes undefined.
 */
export function siisti(teksti: string | undefined): string | undefined {
  const tulos = teksti?.replace(/[\s ]+/g, " ").trim();
  return tulos || undefined;
}
