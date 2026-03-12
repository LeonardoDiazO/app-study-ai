/**
 * Extracts the page count from a base64-encoded PDF without external libraries.
 *
 * PDFs store the total page count in the root page-tree node as /Count N.
 * Taking the maximum value found covers the case where sub-trees also have
 * smaller /Count entries.
 *
 * Returns 0 when the count cannot be determined (binary-heavy PDF, encrypted, etc.).
 */
export function extractPageCount(base64Pdf: string): number {
  try {
    const binary = atob(base64Pdf);
    const matches = [...binary.matchAll(/\/Count\s+(\d+)/g)];
    if (matches.length === 0) return 0;
    return Math.max(...matches.map((m) => parseInt(m[1], 10)));
  } catch {
    return 0;
  }
}

/**
 * Returns the ideal module range string for the Gemini prompt
 * based on the PDF page count.
 */
export function getModuleRange(pages: number): string {
  if (pages <= 0) return '3-5';   // unknown
  if (pages <= 15) return '2-3';
  if (pages <= 30) return '3-4';
  if (pages <= 60) return '4-6';
  return '5-8';                   // 61-100 pages
}
