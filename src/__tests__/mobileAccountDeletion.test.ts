import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * In-app account deletion, and the typecheck that would have caught the rest.
 *
 * The Play Store requires an app that creates accounts to offer deletion from
 * inside the app. CallMind had no screen and no database support: the privacy
 * policy said to write to the grievance address, which does not pass review.
 *
 * The second half of this file guards something that turned out to matter more.
 * mobile/tsconfig.json set moduleResolution to "node" (node10), which
 * TypeScript 6 refuses outright — so `npx tsc --noEmit` in mobile/ failed before
 * checking a single file, and the mobile app had effectively never been
 * typechecked. What it was hiding was not cosmetic: App.tsx read `callbacks` in
 * a useMemo dependency array twenty lines above the useState that declares it,
 * and a dependency array is evaluated the moment useMemo is called. The first
 * render threw "Cannot access 'callbacks' before initialization" and the app
 * could not start at all.
 *
 * The behaviour of the deletion itself is proven against the live database by
 * scripts/account-deletion-proof.mjs, which seeds a company, deletes an agent,
 * and checks that the company keeps its leads. This file only guards the wiring,
 * which is what silently rots.
 */

const ROOT = process.cwd();
const MOBILE = path.join(ROOT, 'mobile');
const read = (p: string) => fs.readFileSync(path.join(MOBILE, p), 'utf8');

/**
 * Source with comments removed.
 *
 * Every "this string is not here any more" assertion below has to run against
 * this rather than the raw file. The first version did not, and all three of
 * them failed against correct code — because the comments explaining what was
 * removed quote the thing that was removed. It is the same fault as a test that
 * matches commented-out code and reads a disabled guard as present, only
 * inverted.
 */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('mobile typecheck is able to run', () => {
  it('does not use a module resolution TypeScript 6 rejects', () => {
    const tsconfig = JSON.parse(read('tsconfig.json'));
    // node10 makes tsc exit before checking anything, which is worse than a
    // wrong setting: the suite goes quiet rather than red.
    expect(
      tsconfig.compilerOptions?.moduleResolution,
      'moduleResolution "node" resolves to node10 and TS6 refuses it outright',
    ).not.toBe('node');
  });

  it('declares callbacks before the queue order reads it', () => {
    const app = read('App.tsx');
    const declared = app.indexOf('const [callbacks, setCallbacks]');
    const used = app.indexOf('const dueLeadIds = useMemo');

    expect(declared, 'callbacks state not found — this test needs updating').toBeGreaterThan(-1);
    expect(used, 'dueLeadIds not found — this test needs updating').toBeGreaterThan(-1);
    expect(
      used,
      'dueLeadIds reads callbacks in its dependency array, so it must come after the useState',
    ).toBeGreaterThan(declared);
  });
});

describe('account deletion', () => {
  it('ships a migration that creates both functions', () => {
    const sql = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20260818000000_account_deletion.sql'),
      'utf8',
    );

    expect(sql).toContain('FUNCTION public.delete_my_account');
    expect(sql).toContain('FUNCTION public.account_deletion_preview');

    // Both count rows across every tenant, so they must not run as the caller.
    const definers = sql.match(/SECURITY DEFINER/g) ?? [];
    expect(definers.length, 'both functions must be SECURITY DEFINER').toBeGreaterThanOrEqual(2);

    // Mandatory in this codebase: without it a user-writable schema can shadow
    // the tables these functions read.
    const searchPaths = sql.match(/SET search_path = public/g) ?? [];
    expect(searchPaths.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the company its leads instead of deleting them', () => {
    const sql = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20260818000000_account_deletion.sql'),
      'utf8',
    );

    // The one thing this must never do. A telecaller leaving is not a reason to
    // destroy their employer's book of business.
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.leads/i);
    expect(sql).toMatch(/UPDATE public\.leads SET assigned_to = NULL/);

    // callbacks.assigned_to holds an email where leads.assigned_to holds an id.
    // Missing the second leaves follow-ups owned by somebody who is gone.
    expect(sql).toMatch(/UPDATE public\.callbacks SET assigned_to = NULL/);
  });

  it('refuses to strand a team by removing its only administrator', () => {
    const sql = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20260818000000_account_deletion.sql'),
      'utf8',
    );
    expect(sql).toContain('LAST_ADMIN');
    expect(sql).toMatch(/v_other_admins = 0 AND v_other_members > 0/);
  });

  it('removes the rows that neither cascade nor block', () => {
    const sql = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20260818000000_account_deletion.sql'),
      'utf8',
    );

    // These carry NOT NULL user columns with no foreign key. Nothing in the
    // schema would have taken them, so leaving them out means personal data
    // survives a deletion that reported success.
    for (const table of ['announcement_reads', 'support_chat_history', 'profiles']) {
      expect(sql, `${table} must be deleted explicitly`).toMatch(
        new RegExp(`DELETE FROM public\\.${table}`),
      );
    }
  });

  it('is reachable from the settings screen', () => {
    const settings = read('src/screens/SettingsScreen.tsx');
    const app = read('App.tsx');

    expect(settings).toContain('onDeleteAccount');
    // Imported and never rendered is the failure mode this codebase already has
    // five times over, so check the element, not the import.
    expect(app).toMatch(/<DeleteAccountScreen[\s/>]/);
    expect(app).toContain("setCurrentScreen('delete_account')");
  });

  it('shows real counts rather than describing the deletion in the abstract', () => {
    const screen = read('src/screens/DeleteAccountScreen.tsx');
    expect(screen).toContain('accountService.preview');
    // A failed preview must not render as zeroes: "nothing will be lost" is the
    // one thing this screen cannot get wrong.
    expect(screen).toContain('setLoadError');
    expect(screen).toMatch(/preview !== null/);
  });

  it('does not promise a grace period nothing would honour', () => {
    // pg_cron is not installed on this database and cron.job does not exist, so
    // a scheduled deletion would never run.
    for (const p of ['src/screens/DeleteAccountScreen.tsx', 'src/services/accountService.ts']) {
      expect(code(p), `${p} must not offer a timed deletion`).not.toMatch(
        /\b\d+\s*days?\b.*delet|delet.*\bin\s+\d+\s*days?\b/i,
      );
    }
  });
});

describe('the web deletes through the same function', () => {
  const settingsPage = fs
    .readFileSync(path.join(ROOT, 'src/components/SettingsPage.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  it('no longer runs its own delete sequence', () => {
    // Six .delete() calls, none of them checked, then "Workspace permanently
    // deleted" whether or not a row went. Row-level security refuses most of
    // them from a browser client, so the message was usually false.
    for (const table of ['leads', 'calls', 'companies', 'audit_logs', 'team_settings']) {
      expect(
        settingsPage,
        `SettingsPage must not delete ${table} directly`,
      ).not.toMatch(new RegExp(`from\\('${table}'\\)\\s*\\.delete\\(\\)`));
    }
  });

  it('calls the proven function and checks the result', () => {
    expect(settingsPage).toContain("supabase.rpc('delete_my_account'");
    expect(settingsPage, 'the error must be thrown, not ignored').toMatch(
      /const \{ error \} = await supabase\.rpc\('delete_my_account'[\s\S]{0,200}?if \(error\) throw error;/,
    );
  });

  it('is actually reachable', () => {
    // The old handler was defined and never called: no button, no modal, and
    // isDeleteModalOpen / deleteStep / emailConfirmation declared and unread.
    expect(settingsPage).toMatch(/onClick=\{handleDeleteAccount\}/);
  });

  it('does not claim to delete the whole workspace', () => {
    expect(settingsPage).not.toContain('Workspace permanently deleted');
  });
});

describe('agent presence', () => {
  it('does not read a column the database has never had', () => {
    // src/types/supabase.ts declared agent_status.location. It does not exist,
    // so TeamPage rendered "Unknown Location" for every agent, always.
    const types = fs.readFileSync(path.join(ROOT, 'src/types/supabase.ts'), 'utf8');
    const block = types.slice(types.indexOf('agent_status: {'), types.indexOf('activity_stream: {'));
    expect(block, 'agent_status has no location column').not.toContain('location');
    expect(block, 'it does have updated_at').toContain('updated_at');
  });

  it('is written by the mobile app', () => {
    // Nothing had ever written to agent_status, so the admin's live monitor
    // showed every agent offline for as long as the table has existed.
    const app = read('App.tsx');
    expect(app).toContain('agentStatusService.set');
    for (const state of ["'on_call'", "'active'", "'offline'"]) {
      expect(app, `${state} is never written`).toContain(state);
    }
  });
});

describe('settings screen shows measured figures', () => {
  it('no longer renders invented attendance and performance numbers', () => {
    const settings = code('src/screens/SettingsScreen.tsx');

    // All of these were hardcoded: a shift that started at 9:02 AM on 21 May
    // 2024, an office in Pune, and 142 calls / 78 connected / 12 conversions /
    // 03:21 average — none of it read from anywhere, on every agent's phone.
    for (const invented of ['9:02 AM', '21 May 2024', 'Pune, Maharashtra', '142', '03:21']) {
      expect(settings, `"${invented}" was hardcoded here`).not.toContain(invented);
    }
  });

  it('reads the app version from the manifest that ships', () => {
    const settings = code('src/screens/SettingsScreen.tsx');
    // Said 1.2.0 while app.json said 2.4.0, so bug reports quoted a version
    // that had never been built.
    expect(settings).not.toContain('1.2.0');
    expect(settings).toContain('appJson.expo.version');
  });
});
