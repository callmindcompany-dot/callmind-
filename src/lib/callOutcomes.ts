/**
 * The words the product actually uses for how a call went.
 *
 * These are not a schema. `calls.outcome` and `calls.interest` have no CHECK
 * constraint, so anything the apps write is what lands in the table. This file
 * records what the apps currently write, for colouring and ordering a chart --
 * never for deciding whether a value is allowed. A report that drops an
 * unrecognised outcome is how every 'Connected' call in the product ended up
 * drawn as "Other".
 *
 * The vocabulary comes from mobile/src/services/callOutcome.ts. If that file
 * changes, this one is stale and the charts will simply fall back to grey --
 * which is the intended failure: an unfamiliar value still appears.
 */

/** Shown when the column is null or blank. Matches the SQL views' wording. */
export const NOT_RECORDED = 'Not recorded';

/** Whether the phone was picked up. */
export const CALL_OUTCOMES = [
  'Connected',
  'No Answer',
  'Busy',
  'Invalid Number',
  'Wrong Number',
] as const;

/**
 * What the person said, once it connected. Listed best to worst so a chart
 * reads left to right; the app declares them in a different order, and that is
 * a display choice here, not a disagreement about the values.
 */
export const CALL_INTERESTS = [
  'Interested',
  'Call Back Later',
  'Not Interested',
] as const;

/** The one outcome that means a human was reached. */
export const CONNECTED = 'Connected';

/**
 * Chart colours, from the palette validated for deuteranopia and protanopia in
 * both light and dark themes. Green is spent on Connected and Interested,
 * because those are the two slices a manager looks for first.
 */
const OUTCOME_COLORS: Record<string, string> = {
  Connected: '#0d9488',
  'No Answer': '#b45309',
  Busy: '#9333ea',
  'Invalid Number': '#e11d48',
  'Wrong Number': '#2563eb',
  Interested: '#0d9488',
  'Call Back Later': '#b45309',
  'Not Interested': '#e11d48',
};

/** Grey for anything this file has not seen, so it is visible but not claimed. */
export const UNKNOWN_COLOR = '#94a3b8';

export function outcomeColor(label: string): string {
  return OUTCOME_COLORS[label] ?? UNKNOWN_COLOR;
}

/** Known values in their natural order first, then whatever else turned up. */
export function orderOutcomes<T extends { outcome: string }>(rows: T[]): T[] {
  const rank = new Map<string, number>(
    [...CALL_OUTCOMES, ...CALL_INTERESTS].map((v, i) => [v as string, i]),
  );
  return [...rows].sort((a, b) => {
    const ra = rank.get(a.outcome) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.outcome) ?? Number.MAX_SAFE_INTEGER;
    return ra === rb ? a.outcome.localeCompare(b.outcome) : ra - rb;
  });
}
