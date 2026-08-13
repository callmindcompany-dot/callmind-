/**
 * Proves the run record works, is scoped to the tenant, and computes the
 * summary the hub will render.
 *
 * Lead ingestion had no memory before this: a poll ran and left nothing behind
 * but the leads themselves, so "why did that lead not arrive?" had no answer
 * and every status on the integrations screen had to be typed rather than read.
 *
 * The interesting case is the failure streak. It is the number that separates
 * a blip from "the key was revoked on Tuesday", and it is the one piece of
 * arithmetic here that could be silently wrong, so it is checked against a
 * sequence built on purpose.
 *
 * Everything runs in transactions that are rolled back.
 */
import 'dotenv/config';
import fs from 'fs';
import { Client } from 'pg';

const MIGRATION = 'supabase/migrations/20260819000300_integration_runs.sql';

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

await db.query(fs.readFileSync(MIGRATION, 'utf8'));
console.log(`applied ${MIGRATION}\n`);

const me = (await db.query(`SELECT id, company_id FROM public.users LIMIT 1;`)).rows[0];
// Must be valid hex. An earlier version ended this in "ru", so the INSERT
// raised 22P02, the SELECT never ran, and "a telecaller sees no runs" passed
// because the query had errored rather than because RLS refused it -- a check
// that could not have failed.
const TELECALLER_ID = '00000000-0000-4000-8000-0000000000fe';

/** get_my_role() reads public.users, not the JWT, so a telecaller must be real. */
async function asUser(sql, { role = 'founder', companyId = me.company_id } = {}) {
  let uid = me.id;
  if (role !== 'founder') {
    uid = TELECALLER_ID;
    await db.query(
      `INSERT INTO public.users (id, company_id, email, name, role, status)
       VALUES ($1, $2, 'runs-proof@example.invalid', 'Runs Proof', $3, 'active')
       ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role`,
      [uid, companyId, role],
    );
  }
  await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify({ sub: uid, role: 'authenticated' })}'`);
  await db.query("SET LOCAL ROLE authenticated");
  try {
    const r = await db.query(sql);
    return { rows: r.rows, rowCount: r.rowCount };
  } catch (e) {
    return { error: `${e.code} ${e.message}` };
  }
}

const run = (provider, outcome, minutesAgo, created = 0) => `
  INSERT INTO public.integration_runs
    (company_id, provider, trigger, started_at, finished_at, outcome, leads_created)
  VALUES ('${me.company_id}', '${provider}', 'schedule',
          now() - INTERVAL '${minutesAgo} minutes',
          now() - INTERVAL '${minutesAgo} minutes',
          ${outcome === null ? 'NULL' : `'${outcome}'`}, ${created});`;

console.log('--- shape ---');
await db.query('BEGIN');
try {
  await db.query(run('indiamart', 'success', 30, 4));
  const r = await db.query(`SELECT outcome, leads_created FROM public.integration_runs WHERE provider='indiamart';`);
  check('a run can be recorded', r.rows.length === 1 && r.rows[0].leads_created === 4);

  // Savepoints: a raised constraint aborts the transaction, and every later
  // statement then fails with 25P02 regardless of what it was testing.
  const rejects = async (sql) => {
    await db.query('SAVEPOINT probe');
    try {
      await db.query(sql);
      return null;
    } catch (e) {
      return e.code;
    } finally {
      await db.query('ROLLBACK TO SAVEPOINT probe');
    }
  };

  const bad = await rejects(
    `INSERT INTO public.integration_runs (company_id, provider) VALUES ('${me.company_id}', 'myspace');`);
  check('an unknown provider is refused', bad === '23514', bad ?? 'accepted it');

  const badOutcome = await rejects(
    `INSERT INTO public.integration_runs (company_id, provider, outcome) VALUES ('${me.company_id}', 'indiamart', 'fine');`);
  check('an unknown outcome is refused', badOutcome === '23514', badOutcome ?? 'accepted it');

  const badTrigger = await rejects(
    `INSERT INTO public.integration_runs (company_id, provider, trigger) VALUES ('${me.company_id}', 'indiamart', 'telepathy');`);
  check('an unknown trigger is refused', badTrigger === '23514', badTrigger ?? 'accepted it');
} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- the failure streak ---');
await db.query('BEGIN');
try {
  // Oldest to newest: ok, ok, fail, fail, fail. The streak is 3, not 5 and not 1.
  await db.query(run('justdial', 'success', 100, 2));
  await db.query(run('justdial', 'success', 80, 1));
  await db.query(run('justdial', 'failed', 60));
  await db.query(run('justdial', 'failed', 40));
  await db.query(run('justdial', 'failed', 20));

  const s = await asUser(`SELECT * FROM public.integration_run_summary() WHERE provider='justdial';`);
  const row = s.rows?.[0];
  check('counts only the runs since the last good one', row?.consecutive_fails === 3,
    s.error || `got ${row?.consecutive_fails}`);
  check('remembers when it last worked', row?.last_success_at !== null, String(row?.last_success_at));
  check('reports the newest outcome', row?.last_outcome === 'failed', String(row?.last_outcome));
  check('sums leads in the last 24h', Number(row?.leads_24h) === 3, String(row?.leads_24h));
  check('counts failures in the last 24h', Number(row?.failures_24h) === 3, String(row?.failures_24h));
} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- a recovered source stops looking broken ---');
await db.query('BEGIN');
try {
  await db.query(run('tradeindia', 'failed', 60));
  await db.query(run('tradeindia', 'failed', 40));
  await db.query(run('tradeindia', 'success', 10, 7));

  const s = await asUser(`SELECT * FROM public.integration_run_summary() WHERE provider='tradeindia';`);
  const row = s.rows?.[0];
  check('the streak resets after a success', row?.consecutive_fails === 0, String(row?.consecutive_fails));
  check('but the day still shows the failures', Number(row?.failures_24h) === 2, String(row?.failures_24h));
} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- who may read it ---');
await db.query('BEGIN');
try {
  await db.query(run('indiamart', 'failed', 5));
  const admin = await asUser(`SELECT id FROM public.integration_runs;`);
  check('an admin sees the runs', (admin.rows?.length ?? 0) > 0, admin.error || `${admin.rowCount} rows`);
} finally {
  await db.query('ROLLBACK');
}

await db.query('BEGIN');
try {
  await db.query(run('indiamart', 'failed', 5));
  const tc = await asUser(`SELECT id FROM public.integration_runs;`, { role: 'telecaller' });
  // Must be an empty result, not an error. An error here would mean the check
  // proved nothing about RLS -- which is exactly how it passed the first time.
  check('a telecaller sees none (error text can carry a key)',
    !tc.error && (tc.rows?.length ?? 0) === 0,
    tc.error ? `check is vacuous: ${tc.error}` : `${tc.rowCount} rows`);
} finally {
  await db.query('ROLLBACK');
}

await db.query('BEGIN');
try {
  const w = await asUser(
    `INSERT INTO public.integration_runs (company_id, provider, outcome)
     VALUES ('${me.company_id}', 'indiamart', 'success') RETURNING id;`);
  check('nobody can invent a successful run', Boolean(w.error), w.error || 'IT WROTE ONE');
} finally {
  await db.query('ROLLBACK');
}

await db.query('BEGIN');
try {
  await db.query(`
    INSERT INTO public.integration_runs (company_id, provider, outcome)
    VALUES ('some-other-company', 'indiamart', 'failed');`);
  const cross = await asUser(`SELECT id FROM public.integration_runs;`);
  check('another tenant\'s runs are invisible', (cross.rows?.length ?? 0) === 0,
    cross.error || `${cross.rowCount} rows`);
} finally {
  await db.query('ROLLBACK');
}

const leftover = await db.query(`SELECT count(*)::int AS n FROM public.integration_runs;`);
check('the proof left nothing behind', leftover.rows[0].n === 0, `${leftover.rows[0].n} rows`);

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
