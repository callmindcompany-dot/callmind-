import type { LeadItem } from '../screens/LeadListScreen';
import { decideStage, CLOSING_INTENTS } from './leadStageMapping';

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

// Imported rather than duplicated: the queue and the post-call form have to
// agree about which of a company's stages mean "finished", and a second list
// of words here is exactly how they would drift apart.

/**
 * Statuses that mean the lead is finished, whatever its priority says.
 *
 * This list is a fallback, not the answer. It was the only answer until the
 * post-call form started writing the company's own stage names: the live
 * company closes leads into "Cold" and "Closed", and neither word is here, so
 * a finished lead would sit in the working queue for ever — sorted by priority
 * as though somebody still had to ring it.
 *
 * `closedStagesFor` below asks the same mapping the form uses, so the two can
 * never disagree. These words remain for a company whose stages match none of
 * the intents, and for a lead whose status predates the mapping.
 */
const CLOSED = new Set([
  'converted', 'rejected', 'not interested', 'invalid', 'dnc', 'dnd',
  'closed', 'lost', 'dead', 'cold',
]);

/**
 * The company's own stages that mean finished, derived from the same mapping
 * the post-call form writes through.
 *
 * Pass the company's stages and this answers for that company. Called without
 * them it falls back to the word list, which is what every caller did before
 * stages existed.
 */
export function closedStagesFor(stages: string[] = []): Set<string> {
  const closed = new Set(CLOSED);
  for (const intent of CLOSING_INTENTS) {
    const decision = decideStage(intent, stages);
    if (decision.status) closed.add(decision.status.trim().toLowerCase());
  }
  return closed;
}

export function isClosed(lead: LeadItem, stages: string[] = []): boolean {
  const status = (lead.status ?? '').trim().toLowerCase();
  if (status === '') return false;
  return closedStagesFor(stages).has(status);
}

export interface QueueOptions {
  /** Lead ids with a follow-up already due, which outrank everything. */
  dueLeadIds?: Set<string>;
  /** Injected so the ordering is testable without waiting for the clock. */
  now?: number;
}

/**
 * How long a lead stays at the bottom of its band after being called.
 *
 * Long enough that an agent working down the list does not meet the same
 * no-answer three times in ten minutes, short enough that a lead tried at 10am
 * is back in the run before the day ends.
 */
export const RECENTLY_TRIED_MS = 2 * 60 * 60 * 1000;

/** Whether this lead was called recently enough to belong lower down. */
export function wasTriedRecently(lead: LeadItem, now: number): boolean {
  if (!lead.lastContactAt) return false;
  const at = Date.parse(lead.lastContactAt);
  return Number.isFinite(at) && now - at < RECENTLY_TRIED_MS;
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
  const now = options.now ?? Date.now();

  const band = (lead: LeadItem): number => {
    if (isClosed(lead)) return BAND_CLOSED;
    if (due.has(lead.id)) return BAND_DUE;
    return BAND[normalisePriority(lead.priority) ?? 'unset'];
  };

  return [...leads].sort((a, b) => {
    const bandDiff = band(a) - band(b);
    if (bandDiff !== 0) return bandDiff;

    // A lead just tried sinks below the ones nobody has tried yet.
    //
    // This is what "back of the queue" means here, and all it means. A due
    // follow-up still outranks it, because the agent promised a time -- the
    // check sits after the band comparison, not before it.
    const aTried = wasTriedRecently(a, now);
    const bTried = wasTriedRecently(b, now);
    if (aTried !== bTried) return aTried ? 1 : -1;

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
