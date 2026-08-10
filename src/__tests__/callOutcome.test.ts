import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveOutcome, describeOutcome } from '../../mobile/src/services/callOutcome';
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

describe('call outcome decides where the lead goes', () => {
  it('closes a lead the number cannot reach', () => {
    for (const outcome of ['Invalid Number', 'Wrong Number']) {
      const r = resolveOutcome(outcome, 'Interested');
      expect(r.status, outcome).toBe('Invalid');
      expect(r.closes, outcome).toBe(true);
    }
  });

  it('keeps a lead that simply did not pick up', () => {
    for (const outcome of ['No Answer', 'Busy']) {
      const r = resolveOutcome(outcome, 'Interested');
      expect(r.status, outcome).toBe('Contacted');
      expect(r.closes, outcome).toBe(false);
    }
  });

  it('ignores interest when the call did not connect', () => {
    // The sheet defaults interest to "Interested" and lets the agent leave it
    // there while picking "No Answer". Nobody picked up, so nobody expressed an
    // opinion, and recording one would be inventing it.
    expect(resolveOutcome('No Answer', 'Not Interested').status).toBe('Contacted');
    expect(resolveOutcome('No Answer', 'Interested').status).toBe('Contacted');
    expect(resolveOutcome('Busy', 'Call Back Later').status).toBe('Contacted');
  });

  it('reads interest only on a connected call', () => {
    expect(resolveOutcome('Connected', 'Interested')).toEqual({ status: 'Interested', closes: false });
    expect(resolveOutcome('Connected', 'Not Interested')).toEqual({ status: 'Not Interested', closes: true });
    expect(resolveOutcome('Connected', 'Call Back Later')).toEqual({ status: 'Call Back', closes: false });
  });

  it('agrees with the queue about what closed means', () => {
    // The cross-check that matters. A status that closes a lead here but is not
    // in CLOSED there would leave it sorted to the bottom of the list forever
    // instead of being taken off it — which is the bug this whole change is
    // about, reintroduced one layer down.
    const outcomes = ['Connected', 'No Answer', 'Busy', 'Invalid Number', 'Wrong Number'];
    const interests = ['Interested', 'Not Interested', 'Call Back Later'];

    for (const o of outcomes) {
      for (const i of interests) {
        const r = resolveOutcome(o, i);
        expect(
          isClosed(lead({ status: r.status })),
          `resolveOutcome('${o}','${i}') gives "${r.status}"; closes=${r.closes} but priorityQueue disagrees`,
        ).toBe(r.closes);
      }
    }
  });

  it('says where the lead went, not that a form was submitted', () => {
    expect(describeOutcome({ status: 'Invalid', closes: true }, null)).toMatch(/number is wrong/i);
    expect(describeOutcome({ status: 'Not Interested', closes: true }, null)).toMatch(/not come back/i);
    expect(describeOutcome({ status: 'Contacted', closes: false }, null)).toMatch(/below/i);

    const when = new Date(Date.now() + 3600_000).toISOString();
    expect(describeOutcome({ status: 'Call Back', closes: false }, when)).toMatch(/follow-up set/i);
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
