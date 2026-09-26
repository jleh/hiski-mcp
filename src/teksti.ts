/**
 * Normalizes text from Hiski pages: whitespace (including the non-breaking
 * spaces Hiski uses for empty cells) is collapsed and trimmed, and empty text
 * becomes undefined.
 */
export function siisti(teksti: string | undefined): string | undefined {
  const tulos = teksti?.replace(/\s+/g, " ").trim();
  return tulos || undefined;
}
