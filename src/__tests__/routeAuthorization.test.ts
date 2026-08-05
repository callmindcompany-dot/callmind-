import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the tenancy boundary at the Express layer.
 *
 * server.ts mounts every router with no global authentication middleware, so
 * each route file is responsible for its own. That is easy to forget, and it
 * was: `/api/sla` shipped with four endpoints, no auth of any kind, and a
 * `companyId` read straight from the query string and request body. Anyone who
 * knew a company id could read another tenant's SLA policy, change it, and run
 * /check-breaches to reassign that tenant's leads -- without logging in.
 *
 * These tests read the source rather than exercising the server, because the
 * server pulls in Razorpay, Gemini and the Supabase admin client at import
 * time. They are deliberately blunt: they catch the shape of the mistake.
 */

const ROUTES_DIR = join(__dirname, '..', 'routes');

/**
 * Reads a source file with comments stripped.
 *
 * Necessary because these checks are textual: a commented-out
 * `// router.use(authGuard)` still contains the text being searched for, so
 * without this a disabled guard reads as a present one. That is precisely how
 * the first version of this test passed while the hole was open.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const read = (file: string) => stripComments(readFileSync(join(ROUTES_DIR, file), 'utf8'));

const routeFiles = readdirSync(ROUTES_DIR).filter((f) => f.endsWith('.ts'));

/** Endpoints that are authenticated by something other than a bearer token. */
const EXEMPT: Record<string, string> = {
  // Signed by Razorpay / the sending provider and verified by HMAC instead.
  'payments.ts': 'razorpay webhook verifies an HMAC signature',
  // Third-party form providers cannot hold a user session; verified by a
  // per-tenant x-webhook-secret header.
  'leads.ts': 'inbound webhooks verify x-webhook-secret',
  // A liveness probe that returns no tenant data.
  'calls.ts': 'health probe only',
  // Login and token exchange necessarily precede having a token.
  'auth.ts': 'authentication endpoints',
};

describe('route authorization', () => {
  it.each(routeFiles.filter((f) => !(f in EXEMPT)))(
    '%s authenticates every endpoint',
    (file) => {
      const src = read(file);
      const hasBlanketGuard = /router\.use\(\s*authGuard\s*\)/.test(src);
      if (hasBlanketGuard) return;

      const endpoints = src.match(/^\s*\w*[Rr]outer\.(get|post|put|delete)\(/gm) ?? [];
      if (endpoints.length === 0) return;

      // Either every endpoint carries authGuard inline, or the file verifies a
      // bearer token in its own handlers (the authorizeBillingActor /
      // authorizeDocumentActor pattern).
      //
      // `verifyIdToken` must be *called*, not merely imported. An earlier
      // version of this test accepted the import alone, which meant removing
      // `router.use(authGuard)` from sla.ts left the suite green -- a test that
      // could not fail was worse than no test.
      const guardedInline = (src.match(/[Rr]outer\.\w+\([^)]*authGuard/g) ?? []).length;
      const verifiesToken =
        /verifyIdToken\(/.test(src) || /supabaseAdmin\.auth\.getUser\(/.test(src);

      expect(
        guardedInline === endpoints.length || verifiesToken,
        `${file} has ${endpoints.length} endpoints with no authentication`,
      ).toBe(true);
    },
  );

  it('never takes the company id from the client on SLA routes', () => {
    const src = read('sla.ts');

    // The company must come from the verified token, not the request.
    expect(src).toMatch(/user\?\.company_id/);
    expect(src).not.toMatch(/req\.query\.companyId/);
    expect(src).toMatch(/router\.use\(authGuard\)/);

    // Destructuring companyId out of the body is how the hole was written.
    expect(src).not.toMatch(/const \{[^}]*\bcompanyId\b[^}]*\} = req\.body/);
  });

  it('resolves tenancy from app_metadata, which the client cannot write', () => {
    const guard = stripComments(
      readFileSync(join(__dirname, '..', 'middleware', 'authGuard.ts'), 'utf8'),
    );

    // Supabase lets a signed-in user update their own user_metadata. Reading
    // company_id or role from there would let anyone move themselves into
    // another tenant.
    expect(guard).toMatch(/app_metadata/);
    expect(guard).not.toMatch(/user_metadata\?\.company_id/);
    expect(guard).not.toMatch(/user_metadata\?\.role/);
  });

  it('does not hand out a stub founder in production', () => {
    const guard = stripComments(
      readFileSync(join(__dirname, '..', 'middleware', 'authGuard.ts'), 'utf8'),
    );

    // The offline development fallback returns a founder with no token at all.
    // If Supabase config were ever missing in production, that would be an open
    // door on every guarded route.
    expect(guard).toMatch(/isPlaceholder && process\.env\.NODE_ENV !== 'production'/);
  });
});
