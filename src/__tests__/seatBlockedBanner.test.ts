import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The owner has to find out that somebody could not get in.
 *
 * A trial workspace holds three people, so the third telecaller to scan the
 * join code is the strongest buying signal this product makes. It used to be
 * discarded at the door: submit_join_request returned before writing anything,
 * so no row existed, the owner never learned anyone had tried, and the
 * telecaller was told to "contact the system administrator to upgrade their
 * plan" — which they cannot do, because only the owner can buy a plan.
 *
 * 20260818000200_seat_full_join_requests.sql records the attempt with status
 * 'blocked_seat_limit'; scripts/seat-full-join-proof.mjs proves that against
 * the live database. This guards the half that lives in the app: the query,
 * and the two places the owner meets it.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('seat-blocked join requests reach the owner', () => {
  it('is queried by the status the migration writes', () => {
    const hook = code('src/hooks/useTeam.ts');
    expect(hook).toContain('useSeatBlockedRequests');
    // The two must agree on the exact string or the query silently returns
    // nothing and the banner never appears.
    expect(hook).toContain("'blocked_seat_limit'");

    const sql = read('supabase/migrations/20260818000200_seat_full_join_requests.sql');
    expect(sql).toContain("'blocked_seat_limit'");
  });

  it('throws rather than reporting an empty queue on failure', () => {
    const hook = code('src/hooks/useTeam.ts');
    const fn = hook.slice(hook.indexOf('useSeatBlockedRequests'));
    const body = fn.slice(0, fn.indexOf('export function', 1));
    // "Nobody is waiting" and "the query failed" are different claims, and the
    // first one leaves a telecaller stranded while the owner buys nothing.
    expect(body).toMatch(/if \(error\) throw error;/);
    expect(body).not.toMatch(/return \[\];\s*\}\s*catch/);
  });

  it('is rendered where the owner manages the team and where they buy', () => {
    // Imported and never rendered is this codebase's most reliable failure, so
    // check the element rather than the import.
    for (const file of ['src/components/TeamPage.tsx', 'src/components/BillingPage.tsx']) {
      expect(code(file), `${file} does not render the banner`).toMatch(/<SeatBlockedBanner[\s/>]/);
    }
  });

  it('sends the owner to a route that exists', () => {
    const team = code('src/components/TeamPage.tsx');
    const target = team.match(/onChoosePlan=\{\(\) => navigate\('([^']+)'\)\}/)?.[1];
    expect(target, 'TeamPage does not navigate anywhere').toBeTruthy();

    // Billing is a dashboard tab resolved from a path map, not a <Route>, so
    // the check is against that map. An earlier version pointed at
    // /dashboard/billing, which is not in it.
    const app = read('src/App.tsx');
    expect(app, `${target} is not a known dashboard path`).toContain(`'${target}'`);
  });

  it('says nothing at all when nobody is waiting', () => {
    const banner = code('src/components/SeatBlockedBanner.tsx');
    // An empty amber box on every team page would train the owner to ignore it.
    expect(banner).toMatch(/length === 0\) return null/);
    // A failed query must also render nothing, not a false all-clear.
    expect(banner).toMatch(/isError/);
  });

  it('offers no approve button while the seat limit stands', () => {
    // There is nothing to approve: the seat does not exist. Offering the
    // action would produce a button that always fails.
    const banner = code('src/components/SeatBlockedBanner.tsx');
    expect(banner).not.toMatch(/onApprove|Approve/);
  });
});
