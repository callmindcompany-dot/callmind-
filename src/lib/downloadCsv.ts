/**
 * Write a CSV the user can actually open.
 *
 * The previous export built a `data:text/csv,...` URI and ran it through
 * encodeURI. Three things were wrong with that, in rising order of how quietly
 * they fail:
 *
 * encodeURI does not escape '#', and everything after a '#' in a data URI is a
 * fragment -- so one lead whose note contained a hash silently truncated the
 * file at that row. The download still arrived, still opened, and was simply
 * missing the rest.
 *
 * data: URIs have a length ceiling that varies by browser (a couple of MB in
 * Chrome). A large export failed at the browser, not in code, so nothing here
 * could report it.
 *
 * And no byte-order mark meant Excel on a Hindi or Marathi Windows install
 * opened UTF-8 as the system codepage, turning every non-ASCII name into
 * mojibake. A blob with a BOM fixes all three.
 */

/** RFC 4180 quoting, applied to everything so no cell can break the shape. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Spreadsheet formula injection.
 *
 * Excel treats a cell starting with = + - or @ as a formula, so a lead named
 * `=HYPERLINK("http://…")` becomes a live link in the recipient's spreadsheet.
 * Lead names arrive from web forms and CSV imports, which means they are
 * attacker-controlled. Prefixing a tab neutralises it and is invisible in the
 * cell.
 */
function safeCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? cell(`\t${s}`) : cell(s);
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(cell).join(','),
    ...rows.map(r => r.map(safeCell).join(',')),
  ].join('\r\n');   // CRLF, which is what Excel expects
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  // ﻿ is the BOM. Without it Excel guesses the encoding and guesses wrong.
  const blob = new Blob(['﻿' + toCsv(headers, rows)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Without this the blob is held for the lifetime of the document, so a
    // few large exports in one session keep their whole contents in memory.
    URL.revokeObjectURL(url);
  }
}
