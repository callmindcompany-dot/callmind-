import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { leadDrill, callDrill, DRILL_ROW_LIMIT } from '@/lib/drillDown';
import type { ReportFilters } from '@/lib/reportFilters';

const FILTERS: ReportFilters = {
  dateRange: 'This Month',
  agentId: 'u1',
  source: 'IndiaMart',
  status: 'All Status',
};

describe('drill-down descriptors', () => {
  it('carries the filter bar the chart was drawn under', () => {
    // This is the whole point. A panel that drops the period or the agent
    // would list rows that were never in the bar the reader clicked, and there
    // is nothing on screen that would reveal it.
    const d = leadDrill('Leads at Won', 'Stage: Won', FILTERS, { status: 'Won' });
    expect(d.filters).toEqual(FILTERS);
    expect(d.leadWhere).toEqual({ status: 'Won' });
  });

  it('keeps leads and calls apart', () => {
    expect(leadDrill('a', 'b', FILTERS, {}).subject).toBe('leads');
    expect(callDrill('a', 'b', FILTERS, {}).subject).toBe('calls');
    expect(callDrill('a', 'b', FILTERS, { outcome: 'Connected' }).leadWhere).toBeUndefined();
  });

  it('caps how many rows a panel loads', () => {
    expect(DRILL_ROW_LIMIT).toBeGreaterThan(0);
  });
});

describe('every chart segment is clickable', () => {
  const PAGE = path.join(process.cwd(), 'src', 'components', 'ReportsPage.tsx');
  const code = fs.readFileSync(PAGE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  /**
   * Before this, not one Bar, Pie, Cell or Area on the page had an onClick.
   * Charts were summaries and nothing else: a manager could read a number and
   * had no way to ask which rows produced it.
   *
   * Counting rather than asserting per chart, because the failure being
   * guarded is a chart added later without a handler.
   */
  const chartRoots = [...code.matchAll(/<(BarChart|AreaChart|LineChart)\b/g)].length;
  const pies = [...code.matchAll(/<Pie\b/g)].length;
  const handlers = [...code.matchAll(/onClick=\{\(?(e|slice)\)?\s*=>/g)].length;

  it('finds charts to check', () => {
    expect(chartRoots + pies).toBeGreaterThanOrEqual(8);
  });

  it('gives every chart a click handler', () => {
    expect(handlers).toBeGreaterThanOrEqual(chartRoots + pies);
  });

  it('opens the shared panel rather than a per-chart one', () => {
    expect(code).toMatch(/<DrillDownPanel/);
    expect([...code.matchAll(/setDrill\(/g)].length).toBeGreaterThanOrEqual(chartRoots + pies);
  });

  it('marks clickable charts as clickable', () => {
    // A chart that responds to a click but shows a default cursor reads as
    // decoration; nobody discovers it.
    //
    // The exact literal, and exact equality. A >= against a bare
    // /cursor-pointer/ passed while a chart's cursor was deleted, because the
    // table rows carry the class too inside longer className strings.
    const onCharts = [...code.matchAll(/className="cursor-pointer"/g)].length;
    expect(onCharts).toBe(chartRoots + pies);
  });
});

describe('the drill-down query cannot widen the chart', () => {
  const HOOK = path.join(process.cwd(), 'src', 'hooks', 'useDrillDown.ts');
  const code = fs.readFileSync(HOOK, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  /**
   * There are two subject queries, leads and calls. Asserting that
   * applyDateWindow merely appears somewhere is not enough: an earlier version
   * of this test did exactly that, and deleting the call from the leads branch
   * left the one in the calls branch and the test still passed. Counted
   * against the number of subject branches instead.
   */
  const subjects = [...code.matchAll(/if \(drill\.subject === 'leads'\)/g)].length + 1;

  it('applies the report period on every subject, not just one', () => {
    expect(subjects).toBe(2);
    expect([...code.matchAll(/applyDateWindow\(/g)].length).toBe(subjects);
  });

  it('applies the agent, source and status dropdowns on every subject', () => {
    expect([...code.matchAll(/applyDimensionFilters\(/g)].length).toBe(subjects);
  });

  it('scopes every query to the company', () => {
    const scoped = [...code.matchAll(/\.eq\('company_id', companyId\)/g)].length;
    const from = [...code.matchAll(/\.from\(/g)].length;
    expect(from).toBeGreaterThanOrEqual(3);
    expect(scoped).toBe(from);
  });

  it('excludes deleted leads', () => {
    expect(code).toMatch(/\.eq\('is_deleted', false\)/);
  });

  it('asks for an exact count on every subject, so a capped list can say so', () => {
    // Counted, not merely present. There are two subject queries and a
    // toMatch passed while one of them had lost its count.
    expect([...code.matchAll(/count: 'exact'/g)].length).toBe(subjects);
  });

  it('throws on error rather than returning an empty list', () => {
    expect(code).not.toMatch(/return\s*\{\s*columns:\s*\[\],\s*rows:\s*\[\],\s*total:\s*0\s*\};\s*\}\s*catch/);
    expect([...code.matchAll(/if \(error\) throw error/g)].length).toBeGreaterThanOrEqual(2);
  });
});

describe('the download matches the screen', () => {
  const PANEL = path.join(process.cwd(), 'src', 'components', 'reports', 'DrillDownPanel.tsx');
  const code = fs.readFileSync(PANEL, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('builds the file from the rows already rendered, not a second query', () => {
    // Re-querying is how a file comes to disagree with the screen it was
    // downloaded from.
    expect(code).toMatch(/rows\.map\(/);
    expect(code).not.toMatch(/supabase/);
  });

  it('keeps masked phone numbers masked in the file', () => {
    expect(code).toMatch(/hidePhoneNumbers.*maskPhone|maskPhone\(String\(cell\)\)/s);
  });

  it('respects the export plan gate instead of silently downloading', () => {
    expect(code).toMatch(/if \(!canExport\)\s*\{\s*onExportBlocked\(\); return; \}/);
  });

  it('states the cap when it was reached', () => {
    expect(code).toMatch(/capped/);
  });
});
