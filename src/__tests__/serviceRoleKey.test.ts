import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { roleOfSupabaseKey } from '../lib/dbAdapter';

/**
 * The server has to know whether it can act as the service role.
 *
 * It could not, and nothing said so. SUPABASE_SERVICE_ROLE_KEY held the anon
 * key — the same string as VITE_SUPABASE_ANON_KEY, byte for byte — and
 * dbAdapter read
 *
 *   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
 *
 * so a missing service key silently produced a client with none of the
 * privileges its name promised. `supabaseAdmin` had the rights of a logged-out
 * visitor.
 *
 * Everything privileged went through it: inbound lead ingestion from IndiaMART
 * and Meta Ads, the payment write-back after a verified Razorpay signature, the
 * admin routes, and the hourly trial-expiry job. Row-level security refused
 * them and the failures were caught and logged, so the product looked like it
 * was running.
 *
 * It surfaced through trial expiry. expire_trials() is refused by
 * trg_protect_billing_columns unless the caller is service_role, so the cron
 * raised "Subscription details can only be changed by completing a payment"
 * every hour into a swallowed catch, and eight companies sat in `trialing`
 * past their end date.
 */

const ROOT = process.cwd();

/** A JWT with the given role claim. Signature is irrelevant — nothing verifies it. */
const fakeKey = (role: string) => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ iss: 'supabase', role })}.sig`;
};

describe('service role key', () => {
  it('reads the role out of a Supabase key', () => {
    expect(roleOfSupabaseKey(fakeKey('service_role'))).toBe('service_role');
    expect(roleOfSupabaseKey(fakeKey('anon'))).toBe('anon');
  });

  it('says nothing about keys it cannot read', () => {
    // The newer sb_secret_... keys are opaque, so no conclusion is possible and
    // the check must not claim one.
    expect(roleOfSupabaseKey('sb_secret_abc123')).toBeNull();
    expect(roleOfSupabaseKey('')).toBeNull();
    expect(roleOfSupabaseKey('not.a.jwt')).toBeNull();
  });

  it('never lets the anon key count as service role', () => {
    const adapter = fs
      .readFileSync(path.join(ROOT, 'src/lib/dbAdapter.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    // The client may still fall back so the module loads without a service key.
    // What must never fall back is the flag that says whether it is privileged
    // — the silence was the bug, not the fallback.
    const flag = adapter.match(/SERVICE_ROLE_CONFIGURED\s*=[\s\S]*?;/)?.[0] ?? '';
    expect(flag, 'SERVICE_ROLE_CONFIGURED not found').not.toBe('');
    expect(flag).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(
      flag,
      'the privilege flag must not consider the anon key',
    ).not.toContain('VITE_SUPABASE_ANON_KEY');
  });

  it('refuses to start in production without one', () => {
    const server = fs
      .readFileSync(path.join(ROOT, 'server.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    expect(server).toContain('SERVICE_ROLE_CONFIGURED');
    // A server that cannot settle a payment should not be taking them.
    expect(server).toMatch(/if \(!SERVICE_ROLE_CONFIGURED\)/);
    expect(server).toMatch(/NODE_ENV === 'production'\) throw new Error/);
  });

  it('tells the two keys apart even when they look alike', () => {
    // The real .env held the same string in both variables. Nothing checks the
    // developer's .env here on purpose: a machine-specific misconfiguration
    // that turns the suite permanently red teaches people to ignore it, and
    // the enforcement point for a bad .env is the server refusing to boot,
    // which the test above covers. This checks the discrimination itself.
    const anonKey = fakeKey('anon');
    expect(roleOfSupabaseKey(anonKey)).not.toBe('service_role');
    expect(roleOfSupabaseKey(fakeKey('authenticated'))).not.toBe('service_role');
    expect(roleOfSupabaseKey(fakeKey('service_role'))).toBe('service_role');
  });

  it('documents the variable in .env.example', () => {
    const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    expect(example).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});
