/**
 * calls.duration is TEXT.
 *
 * The mobile app writes a whole number of seconds, but the column has no
 * constraint and older rows carry "3:42" and "1:02:30". Every place that needs
 * a number was parsing it slightly differently, and the SQL views have their
 * own guard (`duration ~ '^[0-9]+$'`) that silently scores a "3:42" as zero.
 * This is the one parser for the TypeScript side.
 *
 * Anything unrecognisable returns null rather than 0. A call whose length
 * nobody can read is not a call that lasted no time, and averaging it in as
 * zero is how an agent's average talk time drops without anyone noticing.
 */
export function parseDurationSeconds(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : null;

  const value = raw.trim();
  if (value === '') return null;

  if (value.includes(':')) {
    const parts = value.split(':');
    if (parts.length > 3) return null;
    const nums = parts.map(p => Number(p));
    if (nums.some(n => !Number.isFinite(n) || n < 0)) return null;
    // "1:02:30" is h:m:s; "3:42" is m:s.
    return nums.length === 3
      ? nums[0] * 3600 + nums[1] * 60 + nums[2]
      : nums[0] * 60 + nums[1];
  }

  // Not parseInt: that reads "12abc" as 12 and would invent a duration out of
  // a corrupted value.
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Average of the durations that could be read, and how many those were. */
export function averageDuration(
  values: Array<string | number | null | undefined>,
): { seconds: number | null; counted: number; unreadable: number } {
  let total = 0, counted = 0, unreadable = 0;
  for (const v of values) {
    const s = parseDurationSeconds(v);
    if (s === null) unreadable++;
    else { total += s; counted++; }
  }
  return {
    seconds: counted > 0 ? Math.round(total / counted) : null,
    counted,
    unreadable,
  };
}

/** "4m 32s", or "—" when nothing is known. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
