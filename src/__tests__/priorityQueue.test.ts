import { describe, it, expect } from 'vitest';
import {
  orderQueue,
  queueCounts,
  normalisePriority,
  isClosed,
} from '../../mobile/src/services/priorityQueue';
import type { LeadItem } from '../../mobile/src/screens/LeadListScreen';

/**
 * The order a telecaller works their leads in.
 *
 * The list was ordered by created_at descending — newest first, which is import
 * order, not call order. `priority` was read off the row, shown as a chip, and
 * then ignored entirely.
 *
 * Two mistakes made while writing this, both caught here:
 *
 *   The tie-break sorted on `time`, which is a display label like
 *   "Today, 10:30". Date.parse returns NaN for that, so every lead compared
 *   equal and the tie-break did nothing. It sorts on createdAt now.
 *
 *   `low` and "no priority set" landed in the same band, so marking a lead low
 *   changed nothing about where it appeared.
 */

const lead = (over: Partial<LeadItem> & { id: string }): LeadItem => ({
  name: over.id,
  phone: '9000000000',
  city: 'Pune',
  tag: 'New',
  time: 'Today, 10:30',
  color: '#000',
  bgColor: '#fff',
  initials: 'XX',
  ...over,
});

const ids = (list: LeadItem[]) => list.map((l) => l.id);

describe('priority queue', () => {
  it('puts a due follow-up above everything', () => {
    const leads = [
      lead({ id: 'high', priority: 'High' }),
      lead({ id: 'due', priority: 'Low' }),
    ];
    const out = orderQueue(leads, { dueLeadIds: new Set(['due']) });
    // Even a low-priority lead outranks a high one once its follow-up is due:
    // the agent promised a time and it has passed.
    expect(ids(out)).toEqual(['due', 'high']);
  });

  it('orders high, medium, unset, low', () => {
    const leads = [
      lead({ id: 'low', priority: 'Low' }),
      lead({ id: 'unset' }),
      lead({ id: 'medium', priority: 'Medium' }),
      lead({ id: 'high', priority: 'High' }),
    ];
    expect(ids(orderQueue(leads))).toEqual(['high', 'medium', 'unset', 'low']);
  });

  it('separates low from unset', () => {
    // These shared a band, so marking a lead low moved it nowhere.
    const out = orderQueue([lead({ id: 'low', priority: 'low' }), lead({ id: 'unset' })]);
    expect(ids(out)).toEqual(['unset', 'low']);
  });

  it('puts the oldest first inside a band', () => {
    const leads = [
      lead({ id: 'new', priority: 'High', createdAt: '2026-08-07T10:00:00Z' }),
      lead({ id: 'old', priority: 'High', createdAt: '2026-08-01T10:00:00Z' }),
    ];
    // A lead untouched for a week is more urgent than one added this morning,
    // which is the opposite of the created_at DESC it replaced.
    expect(ids(orderQueue(leads))).toEqual(['old', 'new']);
  });

  it('does not sort on the display label', () => {
    // Every lead here has the same `time` string and different real dates. If
    // the tie-break reads `time`, this comes back in input order.
    const leads = [
      lead({ id: 'b', createdAt: '2026-08-05T00:00:00Z', time: 'Today, 10:30' }),
      lead({ id: 'a', createdAt: '2026-08-01T00:00:00Z', time: 'Today, 10:30' }),
    ];
    expect(ids(orderQueue(leads))).toEqual(['a', 'b']);
  });

  it('sends closed leads to the bottom whatever their priority', () => {
    const leads = [
      lead({ id: 'converted', priority: 'High', status: 'Converted' }),
      lead({ id: 'open', priority: 'Low' }),
    ];
    expect(ids(orderQueue(leads))).toEqual(['open', 'converted']);
  });

  it('does not mutate what it was given', () => {
    const leads = [lead({ id: 'b', priority: 'Low' }), lead({ id: 'a', priority: 'High' })];
    const before = ids(leads);
    orderQueue(leads);
    expect(ids(leads)).toEqual(before);
  });

  it('reads the priority values the data actually contains', () => {
    expect(normalisePriority('High')).toBe('high');
    expect(normalisePriority('  URGENT ')).toBe('high');
    expect(normalisePriority('normal')).toBe('medium');
    expect(normalisePriority('')).toBeNull();
    expect(normalisePriority(null)).toBeNull();
    expect(normalisePriority('whatever')).toBeNull();
  });

  it('knows which statuses mean finished', () => {
    expect(isClosed(lead({ id: 'x', status: 'Converted' }))).toBe(true);
    expect(isClosed(lead({ id: 'x', status: 'Not Interested' }))).toBe(true);
    expect(isClosed(lead({ id: 'x', status: 'New' }))).toBe(false);
    expect(isClosed(lead({ id: 'x' }))).toBe(false);
  });

  it('counts only open leads', () => {
    const leads = [
      lead({ id: '1', priority: 'High' }),
      lead({ id: '2', priority: 'High', status: 'Rejected' }),
      lead({ id: '3' }),
      lead({ id: '4', priority: 'Low' }),
    ];
    const counts = queueCounts(leads, new Set(['3']));
    expect(counts).toEqual({ total: 3, due: 1, high: 1, medium: 0, low: 1, unset: 1 });
  });
});
