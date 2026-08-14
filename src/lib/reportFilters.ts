/**
 * The one place a report turns the filter bar into a query.
 *
 * Every report hook used to carry its own copy of this if/else chain -- the
 * same twenty lines in nine files. Five other hooks simply never got a copy,
 * so the Funnel and Source Quality charts answered for all time no matter
 * which period button was lit. Fixing those five one at a time would have left
 * the tenth hook, written next month, free to forget again. So the logic lives
 * here and `reportFilters.test.ts` fails the build if a hook re-implements it.
 *
 * Writing it once surfaced three faults that the copies all shared.
 *
 * `Today` was computed with `toISOString().split('T')[0]`, which is the UTC
 * date. India runs at UTC+5:30, so every morning before 05:30 IST the reports
 * asked for yesterday -- the shift where a telecaller checks last night's
 * numbers is exactly when it was wrong.
 *
 * A custom range ending "31 Aug" became `lte('timestamp', '2026-08-31')`, and
 * a bare date against a timestamp column means midnight. The whole of the last
 * day was missing. Ranges here are half-open, [from, to), with `to` set to the
 * start of the day after -- which also removes the 23:59:59.999 edge that
 * `lte` end-of-day leaves behind.
 *
 * `7 Days` was `now - 7*24h`, a rolling instant, so a report opened at 4pm
 * dropped the first two-thirds of the earliest day. Somebody asking for seven
 * days means seven calendar days including today, and that is what it does now.
 */

export const DATE_RANGES = ['Today', '7 Days', '30 Days', 'This Month', 'Custom'] as const;
export type DateRangeId = (typeof DATE_RANGES)[number];

/** The sentinel each dropdown uses for "do not filter on this". */
export const ALL_AGENTS = 'All Agents';
export const ALL_SOURCES = 'All Sources';
export const ALL_STATUSES = 'All Status';

export interface CustomRange {
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD, inclusive as the user reads it
}

export interface ReportFilters {
  dateRange: DateRangeId;
  customRange?: CustomRange;
  agentId?: string;
  source?: string;
  status?: string;
}

/**
 * A half-open window, [from, to).
 *
 * Both representations are returned because the two shapes of column need
 * different literals. `agent_performance.date` is a DATE and compares against
 * 'YYYY-MM-DD'. `calls.timestamp` is a timestamptz, and a bare date there is
 * read in the database session's timezone -- UTC through PostgREST -- which
 * would slide every boundary by five and a half hours. The instants below are
 * the exact UTC moments of local midnight, so both agree on where a day ends.
 */
export interface DateWindow {
  fromDate: string | null;
  toDate: string | null;
  fromInstant: string | null;
  toInstant: string | null;
}

/** Local calendar date as YYYY-MM-DD. Deliberately not toISOString. */
function localDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Midnight at the start of that local day, as a UTC instant. */
function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function parseYmd(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function window(from: Date | null, to: Date | null): DateWindow {
  return {
    fromDate: from ? localDate(from) : null,
    toDate: to ? localDate(to) : null,
    fromInstant: from ? localMidnight(from).toISOString() : null,
    toInstant: to ? localMidnight(to).toISOString() : null,
  };
}

/**
 * Turn the selected period into a window. `now` is injectable so the tests can
 * pin a date instead of asserting against whatever day they run on.
 */
export function resolveDateWindow(
  dateRange: DateRangeId | string,
  customRange?: CustomRange,
  now: Date = new Date(),
): DateWindow {
  const today = localMidnight(now);
  const tomorrow = addDays(today, 1);

  switch (dateRange) {
    case 'Today':
      return window(today, tomorrow);

    // Seven calendar days ending today, so today counts as one of the seven.
    case '7 Days':
      return window(addDays(today, -6), tomorrow);

    case '30 Days':
      return window(addDays(today, -29), tomorrow);

    case 'This Month':
      return window(new Date(now.getFullYear(), now.getMonth(), 1), tomorrow);

    case 'Custom': {
      const start = customRange?.start ? parseYmd(customRange.start) : null;
      const end = customRange?.end ? parseYmd(customRange.end) : null;
      // The user reads the end date as included, so the exclusive bound is the
      // day after it.
      return window(start, end ? addDays(end, 1) : null);
    }

    // An unrecognised value must not quietly widen the report to all time.
    // Callers pass a DateRangeId; anything else is a bug, and falling back to
    // this month keeps the number on screen consistent with the button that is
    // lit rather than silently answering for every year on record.
    default:
      return window(new Date(now.getFullYear(), now.getMonth(), 1), tomorrow);
  }
}

/**
 * The window of the same length ending where this one starts.
 *
 * Derived from the current window rather than re-deriving the period, so
 * "compare" can never describe a different span from the one on screen. The
 * previous window is [start - length, start), which touches the current one
 * without overlapping it -- an overlap would count the boundary day twice and
 * show growth that is only arithmetic.
 */
export function resolvePreviousWindow(current: DateWindow): DateWindow {
  if (!current.fromInstant || !current.toInstant) {
    return { fromDate: null, toDate: null, fromInstant: null, toInstant: null };
  }
  const from = new Date(current.fromInstant);
  const to = new Date(current.toInstant);
  const lengthMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - lengthMs);
  return {
    fromDate: localDate(prevFrom),
    toDate: localDate(from),
    fromInstant: prevFrom.toISOString(),
    toInstant: from.toISOString(),
  };
}

/** The two column shapes a report filters on. */
export type DateColumnKind = 'date' | 'timestamp';

/**
 * Minimal shape of the part of a PostgREST builder used here. Typing it this
 * narrowly keeps the helper usable from every hook without importing the
 * concrete builder generic, and without an `any` that would hide a typo in a
 * column name.
 */
export interface FilterableQuery<T> {
  gte(column: string, value: string): T;
  lt(column: string, value: string): T;
  eq(column: string, value: string): T;
}

export function applyDateWindow<T extends FilterableQuery<T>>(
  query: T,
  column: string,
  kind: DateColumnKind,
  dateRange: DateRangeId | string,
  customRange?: CustomRange,
  now?: Date,
): T {
  const w = resolveDateWindow(dateRange, customRange, now);
  const from = kind === 'date' ? w.fromDate : w.fromInstant;
  const to = kind === 'date' ? w.toDate : w.toInstant;

  let out = query;
  if (from) out = out.gte(column, from);
  if (to) out = out.lt(column, to);
  return out;
}

/**
 * Apply the agent / source / status dropdowns.
 *
 * Column names differ between tables -- a call names its owner `agent_id`, a
 * lead names it `assigned_to` -- so the caller says which, and passing null
 * means that table cannot answer for that dimension and the filter is skipped
 * rather than guessed at.
 */
export interface FilterColumns {
  agent?: string | null;
  source?: string | null;
  status?: string | null;
}

export function applyDimensionFilters<T extends FilterableQuery<T>>(
  query: T,
  filters: ReportFilters,
  columns: FilterColumns,
): T {
  let out = query;
  if (columns.agent && filters.agentId && filters.agentId !== ALL_AGENTS) {
    out = out.eq(columns.agent, filters.agentId);
  }
  if (columns.source && filters.source && filters.source !== ALL_SOURCES) {
    out = out.eq(columns.source, filters.source);
  }
  if (columns.status && filters.status && filters.status !== ALL_STATUSES) {
    out = out.eq(columns.status, filters.status);
  }
  return out;
}

/** Everything at once, for the common case. */
export function applyReportFilters<T extends FilterableQuery<T>>(
  query: T,
  filters: ReportFilters,
  opts: { dateColumn: string; dateKind: DateColumnKind } & FilterColumns,
  now?: Date,
): T {
  const withDate = applyDateWindow(
    query, opts.dateColumn, opts.dateKind, filters.dateRange, filters.customRange, now,
  );
  return applyDimensionFilters(withDate, filters, opts);
}

/** What the period button should say once it is applied, for chart subtitles. */
export function describeDateWindow(
  dateRange: DateRangeId | string,
  customRange?: CustomRange,
  now: Date = new Date(),
): string {
  const w = resolveDateWindow(dateRange, customRange, now);
  if (!w.fromDate || !w.toDate) return 'All time';
  const fmt = (ymd: string) => {
    const d = parseYmd(ymd);
    return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ymd;
  };
  // toDate is exclusive; show the last day the reader actually sees.
  const lastDay = parseYmd(w.toDate);
  const inclusiveEnd = lastDay ? localDate(addDays(lastDay, -1)) : w.toDate;
  return w.fromDate === inclusiveEnd ? fmt(w.fromDate) : `${fmt(w.fromDate)} – ${fmt(inclusiveEnd)}`;
}
