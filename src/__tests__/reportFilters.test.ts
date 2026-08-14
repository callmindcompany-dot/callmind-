import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  resolveDateWindow,
  applyDateWindow,
  applyDimensionFilters,
  describeDateWindow,
  ALL_AGENTS,
  ALL_SOURCES,
  ALL_STATUSES,
  type ReportFilters,
} from '@/lib/reportFilters';

/**
 * `now` is pinned so these assertions do not change meaning depending on the
 * day the suite runs. 14 Aug 2026 was a Friday; 02:00 local is deliberate,
 * because that is the hour at which the old UTC-based implementation was wrong
 * for every user in India.
 */
const NOW = new Date(2026, 7, 14, 2, 0, 0);

/** The local calendar date, written out without going through UTC. */
function localDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Records the calls a hook would have made, so no database is needed. */
function spyQuery() {
  const calls: Array<[string, string, string]> = [];
  const q = {
    calls,
    gte(c: string, v: string) { calls.push(['gte', c, v]); return q; },
    lt(c: string, v: string) { calls.push(['lt', c, v]); return q; },
    eq(c: string, v: string) { calls.push(['eq', c, v]); return q; },
  };
  return q;
}

describe('resolveDateWindow', () => {
  it('uses the local calendar day for Today, not the UTC one', () => {
    const w = resolveDateWindow('Today', undefined, NOW);
    expect(w.fromDate).toBe(localDate(NOW));
    expect(w.toDate).toBe('2026-08-15');

    // The instant must be local midnight. Reading it back, the local clock has
    // to say 00:00 -- which is what fails if anyone reaches for toISOString to
    // build the boundary again.
    const back = new Date(w.fromInstant!);
    expect(back.getHours()).toBe(0);
    expect(back.getMinutes()).toBe(0);
    expect(localDate(back)).toBe(localDate(NOW));
  });

  it('counts 7 Days as seven calendar days including today', () => {
    const w = resolveDateWindow('7 Days', undefined, NOW);
    expect(w.fromDate).toBe('2026-08-08');   // not 2026-08-07
    expect(w.toDate).toBe('2026-08-15');

    // Seven days, counted off the boundaries themselves.
    const days = (Date.parse(w.toDate!) - Date.parse(w.fromDate!)) / 86_400_000;
    expect(days).toBe(7);
  });

  it('starts 30 Days thirty calendar days back', () => {
    const w = resolveDateWindow('30 Days', undefined, NOW);
    const days = (Date.parse(w.toDate!) - Date.parse(w.fromDate!)) / 86_400_000;
    expect(days).toBe(30);
  });

  it('starts This Month on the first', () => {
    expect(resolveDateWindow('This Month', undefined, NOW).fromDate).toBe('2026-08-01');
  });

  it('includes the whole of a custom range last day', () => {
    const w = resolveDateWindow('Custom', { start: '2026-08-01', end: '2026-08-31' }, NOW);
    expect(w.fromDate).toBe('2026-08-01');
    // Exclusive bound is the day after, so a call logged at 23:50 on the 31st
    // still counts. lte('2026-08-31') dropped that entire day.
    expect(w.toDate).toBe('2026-09-01');
  });

  it('leaves the window open when a custom range is half filled', () => {
    expect(resolveDateWindow('Custom', { start: '2026-08-01', end: '' }, NOW).toDate).toBeNull();
    expect(resolveDateWindow('Custom', { start: '', end: '' }, NOW).fromDate).toBeNull();
  });

  it('does not widen to all time on an unknown period', () => {
    // A typo in a period name must not silently turn a monthly report into a
    // lifetime one -- that reads as a real number and is not.
    const w = resolveDateWindow('Last Quarter' as never, undefined, NOW);
    expect(w.fromDate).toBe('2026-08-01');
    expect(w.fromDate).not.toBeNull();
  });
});

describe('applyDateWindow', () => {
  it('sends dates to a DATE column and instants to a timestamp column', () => {
    const d = spyQuery();
    applyDateWindow(d, 'date', 'date', 'Today', undefined, NOW);
    expect(d.calls).toEqual([
      ['gte', 'date', '2026-08-14'],
      ['lt', 'date', '2026-08-15'],
    ]);

    const t = spyQuery();
    applyDateWindow(t, 'timestamp', 'timestamp', 'Today', undefined, NOW);
    expect(t.calls.map(c => c[0])).toEqual(['gte', 'lt']);
    // A timestamptz column must be given a full instant. A bare date there is
    // read as UTC midnight and slides the boundary by the offset.
    expect(t.calls[0][2]).toContain('T');
    expect(t.calls[0][2]).not.toBe('2026-08-14');
  });

  it('always closes the upper bound, so future rows cannot leak in', () => {
    const q = spyQuery();
    applyDateWindow(q, 'timestamp', 'timestamp', '7 Days', undefined, NOW);
    expect(q.calls.some(c => c[0] === 'lt')).toBe(true);
  });
});

describe('applyDimensionFilters', () => {
  const base: ReportFilters = { dateRange: 'Today' };

  it('skips a dimension the table cannot answer for', () => {
    const q = spyQuery();
    applyDimensionFilters(q, { ...base, source: 'IndiaMart' }, { agent: 'agent_id' });
    expect(q.calls).toEqual([]);
  });

  it('uses the column name the caller gives, not a guessed one', () => {
    // A call names its owner agent_id; a lead names it assigned_to.
    const c = spyQuery();
    applyDimensionFilters(c, { ...base, agentId: 'u1' }, { agent: 'agent_id' });
    expect(c.calls).toEqual([['eq', 'agent_id', 'u1']]);

    const l = spyQuery();
    applyDimensionFilters(l, { ...base, agentId: 'u1' }, { agent: 'assigned_to' });
    expect(l.calls).toEqual([['eq', 'assigned_to', 'u1']]);
  });

  it('treats each All sentinel as no filter', () => {
    const q = spyQuery();
    applyDimensionFilters(
      q,
      { ...base, agentId: ALL_AGENTS, source: ALL_SOURCES, status: ALL_STATUSES },
      { agent: 'agent_id', source: 'source', status: 'status' },
    );
    expect(q.calls).toEqual([]);
  });

  it('applies all three together', () => {
    const q = spyQuery();
    applyDimensionFilters(
      q,
      { ...base, agentId: 'u1', source: 'Justdial', status: 'Won' },
      { agent: 'assigned_to', source: 'source', status: 'status' },
    );
    expect(q.calls).toEqual([
      ['eq', 'assigned_to', 'u1'],
      ['eq', 'source', 'Justdial'],
      ['eq', 'status', 'Won'],
    ]);
  });
});

describe('describeDateWindow', () => {
  it('names the last day the reader can actually see', () => {
    // The window ends 1 Sep exclusive; showing "1 Sep" would claim a day the
    // report does not include.
    const label = describeDateWindow('Custom', { start: '2026-08-01', end: '2026-08-31' }, NOW);
    expect(label).toContain('31 Aug');
    expect(label).not.toContain('1 Sep');
  });

  it('collapses a single day to one date', () => {
    expect(describeDateWindow('Today', undefined, NOW)).not.toContain('–');
  });
});

/**
 * The guard. Fixing the five hooks that ignored the period button is worth
 * little if the next hook written is free to ignore it too -- that is exactly
 * how five of them drifted in the first place. Any hook that accepts a
 * dateRange has to get its window from the shared resolver.
 */
describe('no report hook re-implements the filter logic', () => {
  const HOOKS = path.join(process.cwd(), 'src', 'hooks');
  const PAGE = path.join(process.cwd(), 'src', 'components', 'ReportsPage.tsx');

  /** Comments must go, or prose about the old bug reads as the old bug. */
  const strip = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  /**
   * The set is read off ReportsPage's own imports rather than hardcoded, so a
   * hook added to the page next month is covered without anyone remembering to
   * add it here. Hooks belonging to other screens are deliberately out of
   * scope: the Calls page and the Dashboard have their own filter bars with
   * their own vocabularies ('Last 7 Days', 'week'), and forcing them through
   * this resolver would be a change to those screens, not a guard on this one.
   */
  const pageSource = fs.readFileSync(PAGE, 'utf8');
  const imported = [...pageSource.matchAll(/from ['"]@\/hooks\/([A-Za-z0-9_]+)['"]/g)]
    .map(m => m[1]);

  const files = [...new Set(imported)]
    .map(name => {
      for (const ext of ['.ts', '.tsx']) {
        const p = path.join(HOOKS, name + ext);
        if (fs.existsSync(p)) return { name: name + ext, code: strip(fs.readFileSync(p, 'utf8')) };
      }
      return null;
    })
    .filter((f): f is { name: string; code: string } => f !== null)
    .filter(f => /\bfilters\b|\bdateRange\b/.test(f.code));

  it('finds report hooks to check, so the sweep is not vacuously empty', () => {
    // Without this, a rename of ReportsPage or of the import style would make
    // every assertion below pass by iterating over nothing.
    expect(imported.length).toBeGreaterThanOrEqual(10);
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  it.each(files.map(f => f.name))('%s takes the shared filter type', (name) => {
    const file = files.find(f => f.name === name)!;
    expect(file.code).toMatch(/from ['"]@\/lib\/reportFilters['"]/);
  });

  it.each(files.map(f => f.name))('%s does not hand-roll period branches', (name) => {
    const file = files.find(f => f.name === name)!;
    expect(file.code).not.toMatch(/dateRange\s*===\s*['"](Today|7 Days|30 Days|This Month)['"]/);
  });

  it.each(files.map(f => f.name))('%s does not build a date boundary out of UTC', (name) => {
    const file = files.find(f => f.name === name)!;
    expect(file.code).not.toMatch(/toISOString\(\)\s*\.\s*split\(/);
  });

  it.each(files.map(f => f.name))('%s does not silently discard a query error', (name) => {
    const file = files.find(f => f.name === name)!;
    // `const { data } = await query` with no error binding is how notes_count
    // stayed at zero when the query behind it was failing.
    const blind = [...file.code.matchAll(/const\s*\{\s*data(?:\s*:\s*\w+)?\s*\}\s*=\s*await\s+/g)];
    expect(blind.map(m => m[0])).toEqual([]);
  });
});
