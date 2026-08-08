import type { LeadItem } from '../screens/LeadListScreen';

/**
 * The order a telecaller should work their leads in.
 *
 * The list was ordered by created_at descending — newest first — which is the
 * order they were imported, not the order worth calling. `priority` was read
 * off the row and shown as a chip, and then ignored.
 *
 * The specification puts this decision with the agent: "प्रायॉरिटी टॉगल"
 * belongs to the telecaller and the admin sees it read-only. So the ordering
 * leans on what the agent set, and uses the rest only to break ties.
 */

export type Priority = 'high' | 'medium' | 'low';

/** Anything else — null, an empty string, a value from an older import. */
export function normalisePriority(value: string | null | undefined): Priority | null {
  const v = (value ?? '').trim().toLowerCase();
  if (v === 'high' || v === 'urgent') return 'high';
  if (v === 'medium' || v === 'normal') return 'medium';
  if (v === 'low') return 'low';
  return null;
}

/**
 * Bands, in call order. Unset sits between medium and low deliberately: a lead
 * nobody has looked at yet is worth more attention than one the agent has
 * already judged to be low.
 *
 * These were high/medium/low = 0/1/2 with unset as a separate 3, which put
 * `low` and `unset` in the same band -- so marking a lead low changed nothing.
 */
const BAND_DUE = 0;
const BAND: Record<Priority | 'unset', number> = {
  high: 1,
  medium: 2,
  unset: 3,
  low: 4,
};
const BAND_CLOSED = 5;

/** Statuses that mean the lead is finished, whatever its priority says. */
const CLOSED = new Set(['converted', 'rejected', 'not interested', 'invalid', 'dnc']);

export function isClosed(lead: LeadItem): boolean {
  return CLOSED.has((lead.status ?? '').trim().toLowerCase());
}

export interface QueueOptions {
  /** Lead ids with a follow-up already due, which outrank everything. */
  dueLeadIds?: Set<string>;
  /** Injected so the ordering is testable without waiting for the clock. */
  now?: number;
}

/**
 * Sorts a copy. Does not mutate the input.
 *
 * The order:
 *   1. A follow-up that is already due. The agent promised a time and it has
 *      passed; nothing on the list matters more than that.
 *   2. High, then medium.
 *   3. Leads with no priority set yet — worth more attention than one the
 *      agent has already judged low.
 *   4. Low.
 *   5. Oldest first inside each band. A lead sitting untouched for a week is
 *      more urgent than one added this morning, which is the opposite of what
 *      created_at descending was doing.
 *   6. Closed leads last, whatever else they carry.
 */
export function orderQueue(leads: LeadItem[], options: QueueOptions = {}): LeadItem[] {
  const due = options.dueLeadIds ?? new Set<string>();

  const band = (lead: LeadItem): number => {
    if (isClosed(lead)) return BAND_CLOSED;
    if (due.has(lead.id)) return BAND_DUE;
    return BAND[normalisePriority(lead.priority) ?? 'unset'];
  };

  return [...leads].sort((a, b) => {
    const bandDiff = band(a) - band(b);
    if (bandDiff !== 0) return bandDiff;

    // Oldest first within a band.
    //
    // On createdAt, not `time` — that is a display label like "Today, 10:30",
    // which Date.parse turns into NaN, so every lead would have compared equal
    // and the tie-break would have done nothing at all.
    const at = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
    if (at !== bt) return at - bt;

    return a.name.localeCompare(b.name);
  });
}

/** Counts for the queue header, so the agent can see the shape of their day. */
export function queueCounts(leads: LeadItem[], dueLeadIds?: Set<string>) {
  const due = dueLeadIds ?? new Set<string>();
  const open = leads.filter((l) => !isClosed(l));

  return {
    total: open.length,
    due: open.filter((l) => due.has(l.id)).length,
    high: open.filter((l) => normalisePriority(l.priority) === 'high').length,
    medium: open.filter((l) => normalisePriority(l.priority) === 'medium').length,
    low: open.filter((l) => normalisePriority(l.priority) === 'low').length,
    unset: open.filter((l) => normalisePriority(l.priority) === null).length,
  };
}
