import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * /api/founder reads across every tenant using the service role, which bypasses
 * RLS. The only thing standing between that and any logged-in customer is the
 * guard at the top of the router.
 *
 * Two specific mistakes this repository has already made, which these assertions
 * exist to catch coming back:
 *
 *   - authorizing on `role === 'founder'`. Every customer is given that role at
 *     signup, so it grants nothing. The impersonate-company edge function
 *     shipped with exactly that check.
 *   - failing open when the allow-list is empty, so an unset environment
 *     variable means everybody rather than nobody.
 */

const ROUTE = path.join(process.cwd(), 'src', 'routes', 'founder.ts');

/** Comments describe the hole as often as they describe the fix; match code only. */
function code(): string {
  return fs
    .readFileSync(ROUTE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('/api/founder authorization', () => {
  const src = code();

  it('authenticates every request', () => {
    expect(src).toMatch(/router\.use\(\s*authGuard\s*\)/);
  });

  it('gates cross-tenant access on the email allow-list', () => {
    expect(src).toContain('FOUNDER_OWNERS');
    expect(src).toMatch(/router\.use\(\s*requirePlatformOwner\s*\)/);
  });

  it('does not authorize on the founder role, which every customer has', () => {
    // Any comparison, in either direction, positive or negated. The first
    // version of this test only matched `===` and let `!== 'founder'` through
    // -- which is the shape the mistake actually takes in a guard, since the
    // guard rejects rather than admits.
    expect(src).not.toMatch(/\brole\b[^;\n]{0,40}[!=]==?\s*['"]founder['"]/);
    expect(src).not.toMatch(/['"]founder['"]\s*[!=]==?[^;\n]{0,40}\brole\b/);
    // And the same via a membership check.
    expect(src).not.toMatch(/\[[^\]]*['"]founder['"][^\]]*\]\s*\.includes\s*\(\s*[^)]*role/);
  });

  it('fails closed when the allow-list is empty', () => {
    // An unset INTERNAL_TEAM_EMAILS must deny, not admit. The guard has to
    // return before reaching next() on a zero-length list.
    expect(src).toMatch(/FOUNDER_OWNERS\.length\s*===\s*0/);
    const guard = src.slice(src.indexOf('function requirePlatformOwner'));
    const emptyCheck = guard.slice(guard.indexOf('FOUNDER_OWNERS.length === 0'));
    const beforeNext = emptyCheck.slice(0, emptyCheck.indexOf('next()'));
    expect(beforeNext).toMatch(/res\.status\(\s*(403|503)\s*\)/);
  });

  it('runs the guard before any handler is declared', () => {
    const guardMount = src.indexOf('router.use(requirePlatformOwner)');
    const firstHandler = Math.min(
      ...['router.get(', 'router.post(', 'router.patch(', 'router.delete(']
        .map((m) => src.indexOf(m))
        .filter((i) => i !== -1),
    );
    expect(guardMount).toBeGreaterThan(-1);
    expect(guardMount).toBeLessThan(firstHandler);
  });

  it('never takes the company to read from the request', () => {
    // The whole point is reading across tenants, so there is no company filter
    // to get wrong -- but a handler that started trusting req.query.companyId
    // would be the same hole /api/sla shipped with.
    expect(src).not.toMatch(/req\.(query|body|params)\.company_?[Ii]d/);
  });
});
