import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * ReportsPage used the word isError exactly zero times.
 *
 * Every hook throws correctly. The page dropped the error and rendered the
 * empty array, so nine report features that could not run -- four views that
 * did not exist and nine functions that raised on every call -- all displayed
 * as ordinary quiet reports. Nothing on screen distinguished "nobody called
 * anyone this week" from "this query is broken".
 *
 * These assertions are structural rather than behavioural on purpose. A render
 * test would have to mount the whole page with a query client and would only
 * cover the panels the test remembered to open; this covers every panel,
 * including ones added later.
 */
describe('every report renders its failure state', () => {
  const PAGE = path.join(process.cwd(), 'src', 'components', 'ReportsPage.tsx');
  const raw = fs.readFileSync(PAGE, 'utf8');

  /** Comments go first, or prose describing the old bug reads as the bug. */
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const charts = [...code.matchAll(/<ResponsiveContainer/g)].length;
  const wrappers = [...code.matchAll(/<ReportState/g)].length;

  it('has charts to check, so the count is not vacuously satisfied', () => {
    expect(charts).toBeGreaterThanOrEqual(8);
  });

  it('wraps every chart in a state boundary', () => {
    // Not a proof that each individual chart is wrapped, but it cannot pass
    // while a chart is added without one, which is the drift being guarded.
    expect(wrappers).toBeGreaterThanOrEqual(charts);
  });

  it('checks isError somewhere, which it never used to', () => {
    expect(/isError/.test(code)).toBe(true);
  });

  it('never claims a figure it did not read', () => {
    // Each of these shipped. The deal value was `avgDealValue = 10000`
    // extrapolated to a month; the hours were days_present * 8.5; the targets
    // were 50 and 5 for companies that had set none.
    expect(code).not.toMatch(/avgDealValue/);
    expect(code).not.toMatch(/revenueProjection/);
    expect(code).not.toMatch(/\*\s*8\.5/);
    expect(code).not.toMatch(/const\s+target\s*=\s*\d+/);
  });

  it('prices in rupees, not dollars', () => {
    // `${'$'}${value.toLocaleString()}` in a product sold in India.
    expect(code).not.toMatch(/>\s*\$\{[a-zA-Z]/);
    expect(code).not.toMatch(/`\$\$\{/);
  });

  it('does not colour an outcome by a value the app never writes', () => {
    // `call.outcome === 'Answered'` painted every connected call red, because
    // the app writes 'Connected'.
    expect(code).not.toMatch(/outcome\s*===\s*'Answered'/);
  });

  it('names unknown channels honestly', () => {
    // `sourceYield[0]?.source || 'Direct'` named a channel the company may
    // never have used, whenever the query returned nothing.
    expect(code).not.toMatch(/\|\|\s*'Direct'/);
  });
});
