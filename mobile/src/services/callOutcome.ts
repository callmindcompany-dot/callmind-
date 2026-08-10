/**
 * What a call outcome does to the lead.
 *
 * This is the piece that was missing. The post-call sheet wrote a row to
 * `calls` and, if the agent picked a time, a row to `callbacks` -- and left the
 * lead itself untouched. Its status stayed whatever it was, usually 'New', so a
 * telecaller scrolled past the same people they had already spoken to all
 * afternoon and nothing in the app showed a day's work happening.
 *
 * There is no automatic retry scheduler in the mobile app. The four options in
 * PostCallFeedbackSheet -- in 2 hours, tomorrow 10am, in 3 days, next week --
 * are the agent choosing a time, not rules the app applies on its own. So
 * "back of the queue" here means exactly that and nothing more: the lead keeps
 * its place in the list, and `last_contact_at` sinks it below the leads nobody
 * has tried yet today. Anything cleverer would need a scheduler that does not
 * exist, and claiming one would be worse than not having it.
 */

/** The five values PostCallFeedbackSheet offers for `outcome`. */
export type CallOutcome =
  | 'Connected'
  | 'No Answer'
  | 'Busy'
  | 'Invalid Number'
  | 'Wrong Number';

/** The three values it offers for `interest`. */
export type CallInterest = 'Interested' | 'Not Interested' | 'Call Back Later';

export interface OutcomeResult {
  /**
   * The status to write to leads.status.
   *
   * There is no CHECK constraint on that column -- queried, not assumed -- so
   * anything would be accepted. These strings are chosen to match what
   * leadService.getStatusBadgeStyle already renders and what
   * priorityQueue.CLOSED already recognises, because a status neither of them
   * knows shows up as a grey chip with the raw value in it.
   */
  status: string;
  /**
   * Whether the lead leaves the working queue.
   *
   * Keep this in step with CLOSED in priorityQueue.ts. The test in
   * src/__tests__/callOutcome.test.ts fails if the two disagree, because a
   * status that closes a lead here but is not recognised there would leave it
   * sorted last forever instead of removed.
   */
  closes: boolean;
}

/**
 * Outcome decides first. Interest only matters if the call connected.
 *
 * The sheet lets an agent pick "No Answer" and leave interest on its default of
 * "Interested", which is not a statement about anybody -- nobody picked up. So
 * a call that did not connect ignores interest entirely rather than recording
 * an opinion the lead never expressed.
 */
export function resolveOutcome(outcome: string, interest: string): OutcomeResult {
  switch (outcome) {
    case 'Invalid Number':
    case 'Wrong Number':
      // The number is wrong, so no amount of calling helps. Closed, and the
      // admin needs to see it to fix the data.
      return { status: 'Invalid', closes: true };

    case 'No Answer':
    case 'Busy':
      // Still worth calling. 'Contacted' records that an attempt was made,
      // which is what separates a lead nobody has tried from one on its fourth
      // ring-out.
      return { status: 'Contacted', closes: false };

    case 'Connected':
    default:
      switch (interest) {
        case 'Not Interested':
          return { status: 'Not Interested', closes: true };
        case 'Call Back Later':
          // Stays open. The follow-up row in `callbacks` is what brings it back
          // up the list when its time comes.
          return { status: 'Call Back', closes: false };
        case 'Interested':
        default:
          return { status: 'Interested', closes: false };
      }
  }
}

/**
 * A one-line summary for the card shown after the call.
 *
 * Says where the lead went, because that is the question the agent has and the
 * thing the app previously answered by doing nothing visible at all.
 */
export function describeOutcome(result: OutcomeResult, followUpAt: string | null): string {
  if (result.closes) {
    return result.status === 'Invalid'
      ? 'Closed and flagged for your admin — the number is wrong.'
      : 'Closed. It will not come back up in your list.';
  }
  if (followUpAt) {
    return `Follow-up set for ${new Date(followUpAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })}.`;
  }
  if (result.status === 'Interested') return 'Marked interested and kept near the top of your list.';
  if (result.status === 'Call Back') return 'Kept open — set a follow-up time so it comes back up.';
  return 'Attempt recorded. It moves below the leads you have not tried yet.';
}
