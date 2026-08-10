import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * No screen shows a number, a name or a date it did not read from somewhere.
 *
 * AGENTS.md puts this first: a chart with no data shows nothing, not a
 * plausible shape. The mobile app broke the rule on nearly every screen a
 * telecaller looks at, and because the values were plausible nobody could tell
 * by looking.
 *
 *   HomeScreen          18 of 50 calls at 36% achieved, Connected 12 "+8
 *                       today", Conversions 3 "+1 today", Follow-ups 7,
 *                       Avg. Talk Time 04:32 "+12% vs avg" — and above them an
 *                       "AI NEXT BEST LEAD" banner recommending Rahul Sharma
 *                       at a 94% conversion score, whose Dial Now opened lead
 *                       id '1'. There is no scoring model in this product.
 *
 *   LeaderboardScreen   six colleagues who exist in no company — Priya Verma
 *                       168 calls, Ravi Kumar 142, Amit Patel 128, Neha Gupta,
 *                       Vikas Singh, Suresh Malhotra — so every agent read
 *                       their own absence as being last.
 *
 *   LeadDetailScreen    a missing name showed "Rahul Sharma", a missing email
 *                       "rahul.sharma@email.com", a missing city "Pune,
 *                       Maharashtra". Language was always "Hindi, English",
 *                       Assigned To the literal "Assigned Telecaller", and
 *                       Loan Amount ₹ 5,000,000 against every lead in the book.
 *                       Its timeline was three fixed entries including a note
 *                       reading "Interested in Honda City V model".
 *
 *   59_InboxScreen      five announcements dated May 2024, shown whichever tab
 *                       was selected, under a red badge permanently reading 3.
 *
 *   SettingsScreen      142 calls, a shift starting 9:02 AM on 21 May 2024, an
 *                       office in Pune.
 *
 *   PerformanceScreen   Avg. Call Duration 03:21, Connect Rate 66.7%,
 *                       Conversion Rate 19.0%, each with a green upward trend
 *                       badge comparing against nothing.
 *
 * This scans the rendered code — comments stripped, since the comments explain
 * what was removed and quote it.
 */

const SCREENS = path.join(process.cwd(), 'mobile', 'src', 'screens');

const code = (file: string) =>
  fs
    .readFileSync(path.join(SCREENS, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const files = fs.readdirSync(SCREENS).filter((f) => f.endsWith('.tsx'));

/** Placeholder people. A form hint is fine; a rendered value is not. */
const INVENTED_NAMES = [
  'Rahul Sharma', 'Priya Verma', 'Ravi Kumar', 'Amit Patel',
  'Neha Gupta', 'Vikas Singh', 'Suresh Malhotra',
];

describe('mobile screens invent nothing', () => {
  it('finds the screens it is meant to check', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it('renders no invented person', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = code(f);
      for (const name of INVENTED_NAMES) {
        if (!src.includes(name)) continue;
        // placeholder="e.g. Rahul Sharma" on a text input is a hint, not data.
        const asPlaceholder = new RegExp(`placeholder=["'][^"']*${name}`).test(src);
        if (!asPlaceholder) offenders.push(`${f}: ${name}`);
      }
    }
    expect(offenders, 'a name rendered as if it were a real record').toEqual([]);
  });

  it('carries no frozen dates', () => {
    // Every one of these was the day the file happened to be written.
    const offenders: string[] = [];
    for (const f of files) {
      const hits = code(f).match(/\b\d{1,2}\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/g);
      if (hits) offenders.push(`${f}: ${[...new Set(hits)].join(', ')}`);
    }
    expect(offenders, 'a date written into the file rather than read from a row').toEqual([]);
  });

  it('shows no made-up figures on the screens a telecaller lives in', () => {
    const banned: Record<string, string[]> = {
      'HomeScreen.tsx': ['18 / 50', '36%', '+8 today', '+1 today', '04:32', '+12% vs avg', '94%'],
      'PerformanceScreen.tsx': ['03:21', '66.7%', '19.0%'],
      'SettingsScreen.tsx': ['142', '9:02 AM', 'Pune, Maharashtra'],
      'LeadDetailScreen.tsx': ['5,000,000', 'Hindi, English', 'Assigned Telecaller', 'Honda City'],
      'LeaderboardScreen.tsx': ['168 Calls', '142 Calls', '24 Conv.'],
      // ₹ 2,500 for 600 calls and ₹ 5,000 for 720, on a "Bonus Payout Slabs"
      // card. There is no incentive system in this product at all, so the app
      // was telling every telecaller they had money coming.
      'TargetScreen.tsx': ['2,500', '5,000', 'Bonus Payout'],
      // Four files that never existed, with sizes to match, under tabs that
      // filtered nothing.
      'DocumentsScreen.tsx': ['Home Loan Pitch Script', 'Rate Card', '1.2 MB', '850 KB'],
      // Four answers describing controls that were never built, one of them
      // promising incentive payouts every Sunday.
      'HelpCenterScreen.tsx': ['SIM 1 connection', 'incentive payouts', 'Request Lead Transfer'],
    };

    const offenders: string[] = [];
    for (const [file, values] of Object.entries(banned)) {
      if (!files.includes(file)) {
        offenders.push(`${file} is gone — update this test`);
        continue;
      }
      const src = code(file);
      for (const v of values) if (src.includes(v)) offenders.push(`${file}: ${v}`);
    }
    expect(offenders).toEqual([]);
  });

  it('reads its figures from a service rather than a literal', () => {
    // The positive half. Removing the numbers is only half the fix; the screen
    // has to be showing something measured in their place.
    expect(code('HomeScreen.tsx')).toContain('stats');
    expect(code('LeaderboardScreen.tsx')).toContain('leaderboardService');
    expect(code('59_InboxScreen.tsx')).toContain('inboxService');
    expect(code('LeadDetailScreen.tsx')).toContain('activityService');
    expect(code('TargetScreen.tsx')).toContain('workspaceService');
    expect(code('DocumentsScreen.tsx')).toContain('workspaceService');
    expect(code('HelpCenterScreen.tsx')).toContain('workspaceService');
    expect(code('62_NotificationCenterScreen.tsx')).toContain('inboxService');
  });

  it('lets an agent add and correct a lead', () => {
    // Neither was possible from the phone. Leads arrived by webhook or by an
    // admin importing a file, so a referral went on paper; and every Edit
    // control on LeadDetail had no handler, so a wrong number stayed wrong.
    expect(files, 'the lead form is the only way to add a lead').toContain('LeadFormScreen.tsx');
    expect(code('LeadFormScreen.tsx')).toContain('leadService.createLead');
    expect(code('LeadFormScreen.tsx')).toContain('leadService.updateLeadDetails');
    // The plan's lead limit raises P0001, and the agent needs to be told which
    // limit they hit rather than shown a Postgres string.
    expect(code('LeadFormScreen.tsx')).toContain('PLAN_LIMIT');

    expect(code('LeadListScreen.tsx'), 'no way to open the add form').toContain('onAddLead');
    expect(code('LeadDetailScreen.tsx'), 'no way to open the edit form').toContain('onEdit');
  });

  it('does not ship screens whose only content was invented', () => {
    // 65_AILeadInsightScreen scored leads with a hardcoded 88 and no model.
    // 67_AITalkScriptScreen had no fetch of any kind — the "AI" script was
    // fixed text. LeadImportScreen listed two imports that never happened and
    // its Select File button had no handler; there is no file picker installed.
    // 81_ThemeToggleScreen held six switches nothing read, and
    // 10_LanguageSelectionScreen saved English whichever language was tapped.
    for (const gone of [
      '65_AILeadInsightScreen.tsx',
      '67_AITalkScriptScreen.tsx',
      'LeadImportScreen.tsx',
      '81_ThemeToggleScreen.tsx',
      '10_LanguageSelectionScreen.tsx',
      // Gave every agent 4.8 out of 5 and a "Top 5% Telecaller Quality Rating",
      // with Script Compliance at 95%. Scoring a call needs a recording, a
      // transcript or a person listening; this product does none of the three,
      // and the privacy policy says plainly that it does not record audio.
      'QualityAnalyticsScreen.tsx',
    ]) {
      expect(files, `${gone} should not be back without something behind it`).not.toContain(gone);
    }
  });
});
