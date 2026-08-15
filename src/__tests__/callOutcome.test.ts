import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveOutcome, describeOutcome } from '../../mobile/src/services/callOutcome';
import { decideStage } from '../../mobile/src/services/leadStageMapping';
import { orderQueue, isClosed, wasTriedRecently, RECENTLY_TRIED_MS } from '../../mobile/src/services/priorityQueue';
import type { LeadItem } from '../../mobile/src/screens/LeadListScreen';

/**
 * What a call does to the lead, and the call path that never dialled.
 *
 * Two faults sat on either side of the post-call form.
 *
 * After it: handleFeedbackSubmit wrote a row to `calls` and, if the agent had
 * picked a time, one to `callbacks`. It never touched `leads`. The status
 * stayed 'New' and the lead held its place in the queue, so a telecaller
 * scrolled past people they had already spoken to for the rest of the day and
 * nothing on screen showed a day's work happening.
 *
 * Before it: there were two ways to start a call. handleCallLead opened the
 * system dialler with `tel:`. setShowCallingScreen(true) opened 38_CallingScreen,
 * which fired onCallConnected off a three-second setTimeout and handed over to
 * 39_ActiveCallOverlay with its running timer and "Connected via SIM 1". That
 * path contained no Linking call of any kind. It was reachable from the
 * Callbacks list, the dial pad, the AI insight screen and lead detail — so
 * pressing Call Now on a follow-up showed a call connecting, showed a timer
 * running, and then asked how the call had gone. No call had been placed.
 */

const MOBILE = path.join(process.cwd(), 'mobile');
const read = (p: string) => fs.readFileSync(path.join(MOBILE, p), 'utf8');

/**
 * Source with comments stripped.
 *
 * Every "this is not here any more" assertion has to run against this. The
 * comment explaining what was removed quotes the thing that was removed, so
 * checking the raw file fails against correct code.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const lead = (over: Partial<LeadItem> = {}): LeadItem => ({
  id: 'l1', name: 'A', phone: '9000000000', city: '', tag: '', time: '',
  color: '', bgColor: '', initials: 'A', ...over,
});

/**
 * Stage lists to test every company-shaped answer against.
 *
 * The first is the live company's own, read from team_settings. It is here
 * because the code used to write Interested / Call Back / Not Interested /
 * Contacted into leads.status while this company's pipeline had none of those
 * names — so every completed call filed its lead under a stage that did not
 * exist, and the funnel grew four buckets nobody configured.
 */
const LIVE_STAGES = ['New', 'In Progress', 'Closed', 'Hot', 'Cold'];
const CLASSIC_STAGES = ['New', 'Contacted', 'Interested', 'Call Back', 'Not Interested'];
const SPARSE_STAGES = ['Open', 'Done'];

/**
 * A company whose closing stage the queue's fallback word list does not know.
 *
 * This one exists because the first two did not discriminate: priorityQueue
 * keeps a list of words meaning "finished" *and* asks the mapping, and for
 * Cold/Closed either mechanism alone was enough — deleting either still passed,
 * so the test proved nothing about which was doing the work.
 *
 * "Wrong Number" is matched by the invalid intent but is not in that word list,
 * so only the mapping can recognise it. If the queue stops asking the mapping,
 * this is what says so.
 */
const UNUSUAL_STAGES = ['New', 'Working', 'Wrong Number'];

describe('call outcome decides what the call meant', () => {
  it('closes a lead the number cannot reach', () => {
    for (const outcome of ['Invalid Number', 'Wrong Number']) {
      const r = resolveOutcome(outcome, 'Interested');
      expect(r.intent, outcome).toBe('invalid');
      expect(r.closes, outcome).toBe(true);
    }
  });

  it('keeps a lead that simply did not pick up', () => {
    for (const outcome of ['No Answer', 'Busy']) {
      const r = resolveOutcome(outcome, 'Interested');
      expect(r.intent, outcome).toBe('contacted');
      expect(r.closes, outcome).toBe(false);
    }
  });

  it('ignores interest when the call did not connect', () => {
    // The sheet defaults interest to "Interested" and lets the agent leave it
    // there while picking "No Answer". Nobody picked up, so nobody expressed an
    // opinion, and recording one would be inventing it.
    expect(resolveOutcome('No Answer', 'Not Interested').intent).toBe('contacted');
    expect(resolveOutcome('No Answer', 'Interested').intent).toBe('contacted');
    expect(resolveOutcome('Busy', 'Call Back Later').intent).toBe('contacted');
  });

  it('reads interest only on a connected call', () => {
    expect(resolveOutcome('Connected', 'Interested')).toEqual({ intent: 'interested', closes: false });
    expect(resolveOutcome('Connected', 'Not Interested')).toEqual({ intent: 'not_interested', closes: true });
    expect(resolveOutcome('Connected', 'Call Back Later')).toEqual({ intent: 'callback', closes: false });
  });

  it('names no stage of its own', () => {
    // The whole point of the intent split. If a stage name reappears in this
    // function, it is being written to leads.status again for companies that
    // do not use it.
    const src = code('src/services/callOutcome.ts');
    for (const stage of ['Interested', 'Call Back', 'Not Interested', 'Contacted', 'Invalid']) {
      expect(src, stage).not.toContain(`status: '${stage}'`);
    }
  });
});

describe('the stage written is always one the company has', () => {
  const cases = [
    ['live company', LIVE_STAGES],
    ['classic names', CLASSIC_STAGES],
    ['two stages only', SPARSE_STAGES],
  ] as const;

  it.each(cases)('%s: never invents a stage', (_label, stages) => {
    for (const o of ['Connected', 'No Answer', 'Busy', 'Invalid Number', 'Wrong Number']) {
      for (const i of ['Interested', 'Not Interested', 'Call Back Later']) {
        const { status } = decideStage(resolveOutcome(o, i).intent, stages);
        if (status !== null) {
          expect(stages, `${o}/${i} produced "${status}"`).toContain(status);
        }
      }
    }
  });

  it('leaves the lead alone rather than guessing', () => {
    // Two stages called Open and Done match none of the intent words. Writing
    // something anyway is what this whole change exists to stop.
    expect(decideStage('interested', SPARSE_STAGES).status).toBeNull();
    expect(decideStage('interested', []).status).toBeNull();
  });

  it('uses the live company\'s own words', () => {
    expect(decideStage('interested', LIVE_STAGES).status).toBe('Hot');
    expect(decideStage('callback', LIVE_STAGES).status).toBe('In Progress');
    // 'Cold' is listed before 'Closed' in the intent words, deliberately: a
    // company with both means Cold for a lead that said no.
    expect(decideStage('not_interested', LIVE_STAGES).status).toBe('Cold');
  });

  it('prefers the admin mapping, but not a stale one', () => {
    expect(decideStage('interested', LIVE_STAGES, { interested: 'New' }).status).toBe('New');
    // A mapping pointing at a stage that has since been renamed or deleted must
    // not be the thing that reintroduces a phantom stage.
    expect(decideStage('interested', LIVE_STAGES, { interested: 'Warm' }).status).toBe('Hot');
  });
});

describe('the queue agrees with the form about what closed means', () => {
  it.each([
    ['live company', LIVE_STAGES],
    ['classic names', CLASSIC_STAGES],
    ['a closing stage the word list does not know', UNUSUAL_STAGES],
  ] as const)('%s', (_label, stages) => {
    // The cross-check that matters. A lead this form closes but the queue does
    // not recognise sits in the working list for ever, sorted by priority as
    // though somebody still had to ring it.
    //
    // This is what caught the real one: for the live company "not interested"
    // maps to "Cold", and priorityQueue's hardcoded word list contained neither
    // Cold nor Closed.
    for (const o of ['Connected', 'No Answer', 'Busy', 'Invalid Number', 'Wrong Number']) {
      for (const i of ['Interested', 'Not Interested', 'Call Back Later']) {
        const r = resolveOutcome(o, i);
        const { status } = decideStage(r.intent, stages);
        if (status === null) continue;   // lead did not move; nothing to agree about
        expect(
          isClosed(lead({ status }), stages),
          `${o}/${i} moved the lead to "${status}"; closes=${r.closes} but the queue disagrees`,
        ).toBe(r.closes);
      }
    }
  });

  it('says where the lead went, not that a form was submitted', () => {
    // Phrased from the intent, so the sentence reads the same for a company
    // whose stages are Hot and Cold as for one using Interested and Not
    // Interested. It used to be written from the stage name.
    expect(describeOutcome({ intent: 'invalid', closes: true }, null)).toMatch(/number is wrong/i);
    expect(describeOutcome({ intent: 'not_interested', closes: true }, null)).toMatch(/not come back/i);
    expect(describeOutcome({ intent: 'contacted', closes: false }, null)).toMatch(/below/i);

    const when = new Date(Date.now() + 3600_000).toISOString();
    expect(describeOutcome({ intent: 'callback', closes: false }, when)).toMatch(/follow-up set/i);
  });
});

describe('a lead just called drops down the queue', () => {
  const NOW = Date.parse('2026-08-08T12:00:00.000Z');

  it('counts a call inside the window as recent', () => {
    expect(wasTriedRecently(lead({ lastContactAt: new Date(NOW - 60_000).toISOString() }), NOW)).toBe(true);
    expect(wasTriedRecently(lead({ lastContactAt: new Date(NOW - RECENTLY_TRIED_MS - 1).toISOString() }), NOW)).toBe(false);
    expect(wasTriedRecently(lead({ lastContactAt: null }), NOW)).toBe(false);
    // A malformed timestamp must not read as "called just now" and bury the lead.
    expect(wasTriedRecently(lead({ lastContactAt: 'Today, 10:30' }), NOW)).toBe(false);
  });

  it('puts a just-tried lead below one nobody has tried', () => {
    const tried = lead({ id: 'tried', priority: 'Medium', createdAt: '2026-01-01T00:00:00.000Z',
      lastContactAt: new Date(NOW - 60_000).toISOString() });
    const fresh = lead({ id: 'fresh', priority: 'Medium', createdAt: '2026-06-01T00:00:00.000Z' });

    // `tried` is the older lead, so without this rule it would sort first.
    const order = orderQueue([tried, fresh], { now: NOW }).map((l) => l.id);
    expect(order).toEqual(['fresh', 'tried']);
  });

  it('still puts a due follow-up first even if it was just tried', () => {
    const due = lead({ id: 'due', priority: 'low', lastContactAt: new Date(NOW - 60_000).toISOString() });
    const other = lead({ id: 'other', priority: 'high' });

    const order = orderQueue([other, due], { now: NOW, dueLeadIds: new Set(['due']) }).map((l) => l.id);
    expect(order, 'a promised time outranks everything, including the recency sink').toEqual(['due', 'other']);
  });
});

describe('there is only one way to place a call', () => {
  const app = code('App.tsx');

  it('no longer ships the screens that faked one', () => {
    for (const f of ['src/screens/38_CallingScreen.tsx', 'src/screens/39_ActiveCallOverlay.tsx']) {
      expect(fs.existsSync(path.join(MOBILE, f)), `${f} drew a call that was never placed`).toBe(false);
    }
  });

  it('has no path that shows a call without dialling', () => {
    expect(app).not.toContain('setShowCallingScreen');
    expect(app).not.toContain('ActiveCallOverlay');
    // The SIM was invented — `tel:` never tells the app which one the phone used.
    expect(app).not.toMatch(/sim=["']SIM/);
  });

  it('routes every call through the system dialler', () => {
    expect(app).toContain('tel:');
    expect(app).toContain('Linking.openURL');
    // One function, so a new Call button cannot quietly grow a second path.
    expect((app.match(/Linking\.openURL\(dialerUrl\)/g) ?? []).length).toBe(1);
  });

  it('writes the outcome back to the lead', () => {
    expect(app).toContain('resolveOutcome');
    expect(app).toContain('leadService.recordCallOutcome');
  });

  it('renders the card that says what happened', () => {
    // Imported and never rendered for as long as it existed.
    expect(app).toMatch(/<CallCompletedCard[\s/>]/);
    expect(app).toMatch(/<ScheduleCallbackSheet[\s/>]/);
  });
});

describe('the follow-up sheet offers real dates', () => {
  it('computes the next seven days instead of listing them by hand', () => {
    const sheet = code('src/screens/131_ScheduleCallbackSheet.tsx');
    // Was Today · 29 Jul, Tomorrow · 30 Jul, Wed · 31 Jul — the dates the file
    // was written on, with weekday names that stopped matching the next day.
    for (const frozen of ['29 Jul', '30 Jul', '31 Jul', '1 Aug']) {
      expect(sheet, `"${frozen}" was a hardcoded date`).not.toContain(frozen);
    }
    expect(sheet).toContain('nextSevenDays');
  });
});
