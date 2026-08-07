/**
 * Bypass proof — run against a real database.
 *
 *   node scripts/bypass-proof.mjs
 *
 * Connects as the `authenticated` role carrying a JWT that names one company,
 * which is exactly what supabase-js sends from the browser and what
 * get_my_company_id() reads. Everything runs inside a transaction that is
 * rolled back, so it changes nothing.
 *
 * Three things this got wrong before they were fixed, worth keeping in mind if
 * you extend it:
 *
 *   Every attempt needs its own savepoint. The first rejection aborts the
 *   transaction, and every statement after it then fails with "current
 *   transaction is aborted" — which reads as a pass and proves nothing.
 *
 *   The CONTROL checks matter as much as the blocks. A table with RLS on and no
 *   policies denies everything, so it passes every isolation test while the
 *   product is completely broken. That is exactly what `companies` was.
 *
 *   Check the reason, not just the row count. "cannot upgrade my own plan — no
 *   rows affected" looked like the billing trigger working; it was actually no
 *   UPDATE policy existing at all. Assert the P0001 the trigger raises.
 *
 * Set PROOF_COMPANY_ID / PROOF_USER_ID / PROOF_OTHER_COMPANY_ID to point it at
 * different tenants.
 */
import 'dotenv/config';
import pg from 'pg';

const MINE  = process.env.PROOF_COMPANY_ID       || 'a46f1f3d-3426-490a-94d0-0f38c4392598';
const MYUID = process.env.PROOF_USER_ID          || MINE;
const OTHER = process.env.PROOF_OTHER_COMPANY_ID || 'comp_demo_company';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query('BEGIN');

// Become the browser: the `authenticated` role carrying a JWT that says which
// company we belong to. This is what supabase-js sends and what
// get_my_company_id() reads.
await c.query('SET LOCAL ROLE authenticated');
await c.query('SELECT set_config($1, $2, true)', [
  'request.jwt.claims',
  JSON.stringify({
    sub: MYUID, role: 'authenticated', email: process.env.PROOF_EMAIL || 'proof@example.test',
    app_metadata: { company_id: MINE, role: 'founder' },
  }),
]);

const pass = [], fail = [];
const record = (ok, label, detail = '') =>
  (ok ? pass : fail).push(label + (detail ? ' — ' + detail : ''));

// Every attempt runs inside its own savepoint. Without one the first rejection
// aborts the whole transaction and every statement after it fails with
// "current transaction is aborted" — which looks like a pass and proves
// nothing. Three of them did exactly that on the first run.
let n = 0;
async function attempt(label, sql, params = [], expect = 'blocked') {
  const sp = 'sp' + n++;
  await c.query('SAVEPOINT ' + sp);
  try {
    const r = await c.query(sql, params);
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    if (expect === 'blocked') {
      record(r.rowCount === 0, label, r.rowCount ? `ALLOWED ${r.rowCount} row(s)` : 'no rows affected');
    } else {
      record(true, label, `${r.rowCount ?? r.rows.length} row(s)`);
    }
    return r;
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    const msg = e.message.split('\n')[0].slice(0, 70);
    record(expect === 'blocked', label, (expect === 'blocked' ? 'rejected: ' : 'ERROR: ') + msg);
    return null;
  }
}

// --- A. cross-tenant reads must return nothing ------------------------------
const TABLES = ['leads','calls','callbacks','users','invoices','subscriptions',
  'support_tickets','support_chat_history','company_settings','announcements',
  'automation_logs','import_logs','message_templates','join_requests','invites',
  'agent_status','cleanup_logs','cofounders','notifications','documents',
  'audit_logs','trial_events','webhook_logs','automation_rules','scheduled_messages'];

for (const t of TABLES) {
  const sp = 'r' + n++;
  await c.query('SAVEPOINT ' + sp);
  try {
    const r = await c.query(`SELECT count(*)::int AS n FROM public.${t} WHERE company_id <> $1`, [MINE]);
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    record(r.rows[0].n === 0, `read other tenants' ${t}`, r.rows[0].n ? `LEAK: ${r.rows[0].n} rows` : '');
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    record(true, `read other tenants' ${t}`, 'blocked: ' + e.message.slice(0, 50));
  }
}

// --- B. my own data must still be readable ----------------------------------
// A policy that denies everything would pass every test above. These are the
// control: isolation is only correct if the tenant can still see itself.
await attempt('CONTROL: can read my own company', `SELECT * FROM public.companies WHERE id = $1`, [MINE], 'allowed');
await attempt('CONTROL: can read my own user row', `SELECT * FROM public.users WHERE company_id = $1`, [MINE], 'allowed');
await attempt('CONTROL: can read plan_limits', `SELECT * FROM public.plan_limits`, [], 'allowed');
await attempt('CONTROL: can see myself in the tenants view', `SELECT * FROM public.organization_tenants_view`, [], 'allowed');

// --- C. plan tampering ------------------------------------------------------
await attempt('cannot upgrade my own plan', `UPDATE public.companies SET plan='pro' WHERE id=$1`, [MINE]);
await attempt('cannot raise my own seat_limit', `UPDATE public.companies SET seat_limit=999 WHERE id=$1`, [MINE]);
await attempt('cannot mark myself active', `UPDATE public.companies SET plan_status='active' WHERE id=$1`, [MINE]);
await attempt('cannot edit plan_limits', `UPDATE public.plan_limits SET max_seats=9999 WHERE id='starter'`);
await attempt('cannot insert a new plan', `INSERT INTO public.plan_limits (id,name,monthly_price,annual_price) VALUES ('free','x',0,0)`);

// --- D. cross-tenant writes -------------------------------------------------
await attempt('cannot write a lead into another tenant',
  `INSERT INTO public.leads (id, company_id, name, phone) VALUES (gen_random_uuid()::text,$1,'x','1')`, [OTHER]);
await attempt('cannot delete another tenants leads', `DELETE FROM public.leads WHERE company_id=$1`, [OTHER]);
await attempt('cannot forge an audit log for another tenant',
  `INSERT INTO public.audit_logs (company_id, action, details) VALUES ($1,'FORGED','{}'::jsonb)`, [OTHER]);

// --- E. platform content ----------------------------------------------------
await attempt('cannot rewrite the terms of service', `UPDATE public.legal_pages SET content='defaced' WHERE slug='terms'`);
await attempt('cannot delete legal history', `DELETE FROM public.legal_pages_history WHERE true`);
await attempt('cannot flip a platform feature flag',
  `UPDATE public.feature_flags SET updated_at = now() WHERE true`);
await attempt('cannot delete video tutorials', `DELETE FROM public.video_tutorials WHERE true`);

// The billing guard, tested for the right reason.
// Before companies had an UPDATE policy these came back "no rows affected",
// which proved only that no policy allowed the write. Now that one does, this
// is the trigger being asked directly.
for (const [label, sql] of [
  ['trigger rejects a plan change',        `UPDATE public.companies SET plan='pro' WHERE id=$1`],
  ['trigger rejects a seat_limit change',  `UPDATE public.companies SET seat_limit=999 WHERE id=$1`],
  ['trigger rejects a plan_status change', `UPDATE public.companies SET plan_status='active' WHERE id=$1`],
]) {
  const sp = 't' + n++;
  await c.query('SAVEPOINT ' + sp);
  try {
    await c.query(sql, [MINE]);
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    record(false, label, 'ALLOWED');
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    record(e.code === 'P0001', label, `${e.code}: ${e.message.slice(0, 60)}`);
  }
}

// And a change the tenant is allowed to make, so the policy is not simply
// denying everything.
{
  const sp = 't' + n++;
  await c.query('SAVEPOINT ' + sp);
  try {
    const r = await c.query(`UPDATE public.companies SET name = name WHERE id = $1`, [MINE]);
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    record(r.rowCount === 1, 'CONTROL: can still edit my own company profile', `${r.rowCount} row(s)`);
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT ' + sp);
    record(false, 'CONTROL: can still edit my own company profile', 'ERROR: ' + e.message.slice(0, 60));
  }
}

await c.query('ROLLBACK');
await c.end();

console.log(`\nPASS ${pass.length}   FAIL ${fail.length}\n`);
pass.forEach(p => console.log('  PASS  ' + p));
if (fail.length) { console.log(''); fail.forEach(f => console.log('  FAIL  ' + f)); process.exitCode = 1; }
