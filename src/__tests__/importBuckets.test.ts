import { describe, it, expect } from 'vitest';
import { bucketImportRows, ExistingLead } from '@/lib/importBuckets';

/**
 * The point of every assertion here is sourceIndex.
 *
 * `inserts` is a filtered subset of the rows being imported, so its positions
 * do not line up with the file. The import used to report failures by insert
 * position, which meant that on any file containing a skipped duplicate the
 * error report named the wrong rows -- and Retry Failed Rows retried those.
 * The counts were right, so nothing looked wrong.
 */

const row = (phone: string, name = phone) => ({ cleanedPhone: phone, name });
const payloadOf = (r: { name: string }) => ({ name: r.name, custom_data: {}, custom_fields: {} });
const at = (t = '2026-08-07T00:00:00.000Z') => () => t;

function existing(...phones: [string, string][]): Map<string, ExistingLead> {
  return new Map(
    phones.map(([phone, id]) => [phone, { id, custom_data: {}, custom_fields: {} }]),
  );
}

describe('bucketImportRows', () => {
  it('keeps each insert pointing at the row it came from when duplicates are skipped', () => {
    const rows = [row('111'), row('222'), row('333'), row('444')];
    // 222 and 333 already exist and are skipped, so inserts holds rows 0 and 3.
    const result = bucketImportRows(rows, existing(['222', 'a'], ['333', 'b']), 'skip', payloadOf, at());

    expect(result.skipped).toBe(2);
    expect(result.updates).toEqual([]);
    // The bug: these would have been 0 and 1, naming rows 111 and 222.
    expect(result.inserts.map((i) => i.sourceIndex)).toEqual([0, 3]);
    expect(result.inserts.map((i) => i.payload.name)).toEqual(['111', '444']);
  });

  it('keeps indices straight when inserts and updates interleave', () => {
    const rows = [row('111'), row('222'), row('333'), row('444'), row('555')];
    const result = bucketImportRows(
      rows,
      existing(['222', 'a'], ['444', 'b']),
      'overwrite',
      payloadOf,
      at(),
    );

    expect(result.skipped).toBe(0);
    expect(result.inserts.map((i) => i.sourceIndex)).toEqual([0, 2, 4]);
    expect(result.updates.map((u) => u.sourceIndex)).toEqual([1, 3]);
    expect(result.updates.map((u) => u.id)).toEqual(['a', 'b']);
  });

  it('never assigns an index outside the input', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(String(i)));
    // every third row already exists
    const dupes = existing(...rows.filter((_, i) => i % 3 === 0).map((r, n) => [r.cleanedPhone, `id${n}`] as [string, string]));
    const result = bucketImportRows(rows, dupes, 'merge', payloadOf, at());

    const all = [...result.inserts, ...result.updates].map((o) => o.sourceIndex);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...all)).toBeLessThan(rows.length);
    // Every row is accounted for exactly once.
    expect(new Set(all).size).toBe(rows.length);
    expect(all.length + result.skipped).toBe(rows.length);
  });

  it('merges onto what the lead already has, letting the file win', () => {
    const rows = [{ cleanedPhone: '111', name: 'x' }];
    const map = new Map<string, ExistingLead>([
      ['111', { id: 'a', custom_data: { keep: 1, shared: 'old' }, custom_fields: { c: 1 } }],
    ]);
    const result = bucketImportRows(
      rows,
      map,
      'merge',
      () => ({ custom_data: { shared: 'new' }, custom_fields: { d: 2 } }),
      at(),
    );

    expect(result.updates[0].payload.custom_data).toEqual({
      keep: 1,
      shared: 'new',
      mergedAt: '2026-08-07T00:00:00.000Z',
    });
    expect(result.updates[0].payload.custom_fields).toEqual({ c: 1, d: 2 });
  });

  it('treats every row as an insert when nothing matches', () => {
    const rows = [row('111'), row('222')];
    const result = bucketImportRows(rows, new Map(), 'skip', payloadOf, at());
    expect(result.inserts.map((i) => i.sourceIndex)).toEqual([0, 1]);
    expect(result.skipped).toBe(0);
  });
});
