/**
 * fieldPatterns.ts
 * Pattern-detection utilities for SmartImportModal.
 * All logic is pure (no side effects). English only.
 */

export type ParsedRow = Record<string, string>;

// ── Regex constants ────────────────────────────────────────────────────────────

/** Matches common Indian/international phone number formats (8–15 chars of digits + formatting) */
const PHONE_RE = /^[\d\s+\-().]{8,15}$/;

/** Simple email presence check */
const EMAIL_RE = /@.+\./;

/** ISO-8601, DD/MM/YYYY, MM-DD-YYYY, "Jan 01, 2024" styles */
const DATE_RE =
  /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|[A-Za-z]{3}\s\d{1,2},?\s\d{4})$/;

// ── Sample-based detectors ────────────────────────────────────────────────────

/**
 * Returns the fraction of non-empty samples that match a given test.
 * Requires at least 1 filled sample.
 */
function fractionMatch(samples: string[], test: (v: string) => boolean): number {
  const filled = samples.filter(Boolean);
  if (!filled.length) return 0;
  return filled.filter(v => test(v.trim())).length / filled.length;
}

/** True if ≥80 % of samples look like phone numbers. */
export function isPhonePattern(samples: string[]): boolean {
  return fractionMatch(samples, v => PHONE_RE.test(v)) >= 0.8;
}

/** True if ≥80 % of samples look like email addresses. */
export function isEmailPattern(samples: string[]): boolean {
  return fractionMatch(samples, v => EMAIL_RE.test(v)) >= 0.8;
}

/** True if ≥80 % of samples look like date strings. */
export function isDatePattern(samples: string[]): boolean {
  return fractionMatch(samples, v => DATE_RE.test(v)) >= 0.8;
}

/** True if ≥80 % of samples are numeric values in the range 0–100 (lead score). */
export function isScorePattern(samples: string[]): boolean {
  return fractionMatch(samples, v => {
    const n = Number(v);
    return !isNaN(n) && n >= 0 && n <= 100 && v !== '';
  }) >= 0.8;
}

// ── Column pattern detector ───────────────────────────────────────────────────

/**
 * Given the first N sample values for an unmapped column, returns the best
 * matching CRM field key — or null if no pattern is detected.
 *
 * @param samples          Up to 5 sample values from the column.
 * @param phoneAlreadyMapped True if another column is already mapped to 'phone'.
 */
export function detectColumnPattern(
  samples: string[],
  phoneAlreadyMapped: boolean,
): string | null {
  if (isPhonePattern(samples)) return phoneAlreadyMapped ? 'altPhone' : 'phone';
  if (isEmailPattern(samples)) return 'email';
  if (isDatePattern(samples))  return 'created_at';
  if (isScorePattern(samples)) return 'score_points';
  return null;
}

// ── Multi-phone resolution ────────────────────────────────────────────────────

/**
 * Counts how many values in the supplied array look like valid phone numbers.
 */
export function countValidPhones(values: string[]): number {
  return values.filter(v => PHONE_RE.test(String(v).trim())).length;
}

/**
 * When multiple CSV headers are mapped to 'phone', this returns the column
 * that has the highest count of valid phone-like values (the winner stays
 * as 'phone'; others should be demoted to 'altPhone').
 *
 * Returns null if there is zero or one phone column (no conflict).
 */
export function pickBestPhoneColumn(
  headers: string[],
  parsedData: ParsedRow[],
  mapping: Record<string, string>,
): string | null {
  const phoneCols = headers.filter(h => mapping[h] === 'phone');
  if (phoneCols.length <= 1) return null;

  // Scan up to 20 rows for a quick score
  const sampleRows = parsedData.slice(0, 20);

  let bestCol   = phoneCols[0];
  let bestCount = -1;

  for (const col of phoneCols) {
    const values = sampleRows.map(r => String(r[col] ?? ''));
    const count  = countValidPhones(values);
    if (count > bestCount) {
      bestCount = count;
      bestCol   = col;
    }
  }

  return bestCol; // this column should keep 'phone'; rest → 'altPhone'
}
