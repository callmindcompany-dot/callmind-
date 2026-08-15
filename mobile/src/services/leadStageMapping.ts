/**
 * Which of the company's own stages a finished call moves the lead to.
 *
 * The post-call form used to decide this with four names written into the
 * source: Interested, Call Back, Not Interested, Contacted. Nothing in the
 * mobile app has ever read `team_settings.leads_statuses`, and the live
 * company's stages are New, In Progress, Closed, Hot, Cold -- so every
 * completed call filed its lead under a stage that company does not use, and
 * the funnel grew four buckets nobody configured.
 *
 * The rule here is narrow and absolute: **never write a status that is not in
 * the company's own list.** When no stage can be justified, the lead's stage is
 * left exactly as it was. A lead sitting in the wrong-but-real stage is
 * recoverable; a pipeline full of stages that do not exist is not, and it
 * corrupts every funnel and pipeline figure at the same time.
 *
 * Step 2 of this plan adds an explicit mapping an admin chooses. Until that
 * lands, `matchByIntent` guesses from the stage names themselves -- and returns
 * null rather than guessing badly.
 */

/**
 * What the call said, independent of what any company calls its stages.
 *
 * resolveOutcome in callOutcome.ts produces one of these; decideStage below
 * turns it into one of the company's own stage names. Splitting the two is what
 * lets a company rename every stage in its pipeline without any of this logic
 * changing.
 */
export type CallIntent =
  | 'interested'
  | 'callback'
  | 'not_interested'
  | 'contacted'
  | 'invalid'
  | 'unreachable';

/**
 * Words that identify a stage as meaning a given intent.
 *
 * Matched against the company's own stage names, lowercased. Deliberately
 * short: a longer list guesses more often, and a wrong guess here silently
 * moves real leads into the wrong column. Anything not recognised falls
 * through to null and the stage is left alone.
 */
const INTENT_WORDS: Record<CallIntent, string[]> = {
  interested:     ['hot', 'interested', 'warm', 'qualified'],
  callback:       ['in progress', 'progress', 'follow', 'callback', 'call back', 'pending'],
  not_interested: ['cold', 'lost', 'not interested', 'closed', 'rejected', 'dead'],
  contacted:      ['contacted', 'in progress', 'progress', 'reached'],
  invalid:        ['invalid', 'wrong', 'dnc', 'dnd', 'bad number'],
  // A lead nobody reached has not moved anywhere, so no stage means this.
  unreachable:    [],
};

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The stage in `stages` that best matches an intent, or null.
 *
 * Exact-ish matching only. `find` returns the first stage whose name contains
 * one of the intent's words, and the words are ordered most-specific first so
 * "Hot" beats "Qualified" when a company has both.
 */
export function matchByIntent(intent: CallIntent, stages: string[]): string | null {
  const words = INTENT_WORDS[intent];
  if (words.length === 0 || stages.length === 0) return null;

  for (const word of words) {
    const hit = stages.find(stage => normalise(stage).includes(word));
    if (hit) return hit;
  }
  return null;
}

/**
 * The intents after which a lead leaves the working queue.
 *
 * Declared here, beside the mapping, so priorityQueue can ask which of a
 * company's stages mean "finished" rather than keeping a second list of words.
 * resolveOutcome's `closes` flag and this must agree, and
 * src/__tests__/callOutcome.test.ts fails if they drift.
 */
export const CLOSING_INTENTS: CallIntent[] = ['not_interested', 'invalid'];

export interface StageDecision {
  /** The stage to write, or null to leave the lead where it is. */
  status: string | null;
  /** Why, in words, for the log and for the settings screen to explain. */
  reason: string;
}

/**
 * Decide the stage for a completed call.
 *
 * `explicit` is the admin's own mapping when one exists, and always wins --
 * but only if the stage it names is still one of the company's stages. An
 * admin can rename or remove a stage after setting a mapping, and a stale
 * mapping must not be the thing that reintroduces a phantom stage.
 */
export function decideStage(
  intent: CallIntent,
  stages: string[],
  explicit?: Partial<Record<CallIntent, string>>,
): StageDecision {
  if (intent === 'unreachable') {
    return { status: null, reason: 'Nobody was reached, so the stage is unchanged.' };
  }

  if (!stages || stages.length === 0) {
    return {
      status: null,
      reason: 'This company has no stages configured, so there is nothing safe to write.',
    };
  }

  const chosen = explicit?.[intent];
  if (chosen) {
    const stillExists = stages.some(s => normalise(s) === normalise(chosen));
    if (stillExists) {
      return { status: chosen, reason: 'Mapped by the company settings.' };
    }
    // Fall through to matching rather than writing a stage that has since been
    // removed or renamed.
  }

  const matched = matchByIntent(intent, stages);
  if (matched) {
    return { status: matched, reason: `Matched "${matched}" from the company's own stages.` };
  }

  return {
    status: null,
    reason: 'No stage in this company matches what the call said, so the lead is left alone.',
  };
}
