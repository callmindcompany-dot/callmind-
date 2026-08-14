/**
 * Proof for 20260820000100_chart_views.sql — call_outcome_summary,
 * followup_status, pipeline_value.
 *
 * Everything runs inside one transaction that is rolled back, so the live
 * database is unchanged. The closing checks confirm that.
 *
 * Every expected figure is computed here in JavaScript from the seed plan, not
 * read back out of the view. A view checked against itself proves nothing.
 */
import 'dotenv/config';
import { Client } from 'pg';

const db = new Client({ connectionString: process.env.DATABASE_URL });
let pass = 0, fail = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n          expected ${e}\n          actual   ${a}`); }
}

const CO = 'chartproof-co-0001';
const AGENTS = [
  { id: '11111111-1111-4111-8111-1111111111aa', name: 'Sneha Patil' },
  { id: '22222222-2222-4222-8222-2222222222bb', name: 'Rohit Deshmukh' },
];

// --- the seed plan, described once so expectations derive from it -----------
// 60 calls. outcome and interest are driven by deliberately different
// expressions; deriving both from one counter is how an earlier seed produced a
// telecaller who was never once connected and a believable 0s talk time.
const CALLS = Array.from({ length: 60 }, (_, i) => ({
  agent: AGENTS[(i * 7) % 2],
  outcome: ['Connected', 'No Answer', 'Busy', 'Connected'][(i * 3) % 4],
  interest: ['Interested', 'Not Interested', 'Call Back Later'][(i * 5) % 3],
}));

// 40 callbacks: a mix of due-later, already-late, done and paused.
const CALLBACKS = Array.from({ length: 40 }, (_, i) => ({
  status: ['Pending', 'Pending', 'Completed', 'Paused'][i % 4],
  daysOut: i % 2 === 0 ? 5 : -5,   // negative = reminder_date already passed
}));

// 50 leads across four stages, with committed and estimated money kept apart.
const LEADS = Array.from({ length: 50 }, (_, i) => ({
  status: ['New', 'Contacted', 'Interested', 'Won'][i % 4],
  deal: i % 4 === 3 ? 25000 : 0,          // only Won leads carry a deal value
  budget: i % 5 === 0 ? 10000 : 0,
}));

const bump = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

try {
  await db.connect();
  await db.query('BEGIN');

  await db.query(`INSERT INTO companies (id, name, plan, plan_status, seat_limit)
                  VALUES ($1, 'Chart Proof Co', 'pro', 'active', 50)`, [CO]);
  for (const a of AGENTS) {
    await db.query(`INSERT INTO users (id, company_id, email, name, display_name, role, status)
                    VALUES ($1, $2, $3, $4, $4, 'Telecaller', 'active')`,
      [a.id, CO, `${a.id}@chartproof.test`, a.name]);
  }

  for (const [i, c] of CALLS.entries()) {
    await db.query(
      `INSERT INTO calls (id, company_id, agent_id, phone, outcome, interest, duration, timestamp)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, '45', now() - ($6::int || ' hours')::interval)`,
      [CO, c.agent.id, `80000000${String(i).padStart(2, '0')}`, c.outcome, c.interest, i % 20]);
  }

  for (const [i, cb] of CALLBACKS.entries()) {
    await db.query(
      `INSERT INTO callbacks (id, company_id, assigned_to, status, reminder_date)
       VALUES ($1, $2, $3, $4, now() + ($5::int || ' days')::interval)`,
      [`cbproof-${i}`, CO, AGENTS[0].id, cb.status, cb.daysOut]);
  }

  for (const [i, l] of LEADS.entries()) {
    await db.query(
      `INSERT INTO leads (id, company_id, name, phone, status, deal_value, estimated_budget, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
      [`leadproof-${i}`, CO, `Lead ${i}`, `90000000${String(i).padStart(2, '0')}`,
       l.status, l.deal, l.budget]);
  }

  // ---- 2. call_outcome_summary -------------------------------------------
  const expOutcome = {}, expInterest = {};
  for (const c of CALLS) {
    bump(expOutcome, c.outcome);
    if (c.outcome === 'Connected') bump(expInterest, c.interest);
  }

  const outRows = await db.query(
    `SELECT label, SUM(count)::int AS n FROM call_outcome_summary
     WHERE company_id = $1 AND kind = 'outcome' GROUP BY label ORDER BY label`, [CO]);
  check('outcome buckets', Object.fromEntries(outRows.rows.map(r => [r.label, r.n])),
        Object.fromEntries(Object.entries(expOutcome).sort()));

  const intRows = await db.query(
    `SELECT label, SUM(count)::int AS n FROM call_outcome_summary
     WHERE company_id = $1 AND kind = 'interest' GROUP BY label ORDER BY label`, [CO]);
  check('interest buckets', Object.fromEntries(intRows.rows.map(r => [r.label, r.n])),
        Object.fromEntries(Object.entries(expInterest).sort()));

  // The point of splitting the two: interest is only counted on connected
  // calls, so its total must equal the connected count, not the dial count.
  const intTotal = intRows.rows.reduce((s, r) => s + r.n, 0);
  check('interest counted only on connected calls', intTotal, expOutcome['Connected']);
  check('interest total is not the dial count', intTotal !== CALLS.length, true);

  // ---- 4. followup_status -------------------------------------------------
  const expFollow = {};
  for (const cb of CALLBACKS) {
    const bucket = cb.status === 'Completed' ? 'Completed'
                 : cb.status === 'Paused'    ? 'Paused'
                 : cb.daysOut < 0            ? 'Overdue'
                 : 'Due';
    bump(expFollow, bucket);
  }

  const fRows = await db.query(
    `SELECT bucket, SUM(count)::int AS n FROM followup_status
     WHERE company_id = $1 GROUP BY bucket ORDER BY bucket`, [CO]);
  check('follow-up buckets', Object.fromEntries(fRows.rows.map(r => [r.bucket, r.n])),
        Object.fromEntries(Object.entries(expFollow).sort()));

  // Overdue is derived, so it has to be non-zero here or the derivation is
  // untested — and it must not be a status anybody can write.
  check('overdue is populated', expFollow['Overdue'] > 0, true);
  const badStatus = await db.query(
    `SELECT 1 FROM callbacks WHERE company_id = $1 AND status = 'Overdue'`, [CO]);
  check('no row actually stores status Overdue', badStatus.rowCount, 0);

  await db.query('SAVEPOINT s1');
  let rejected = false;
  try {
    await db.query(`INSERT INTO callbacks (id, company_id, status, reminder_date)
                    VALUES ('cbproof-bad', $1, 'Overdue', now())`, [CO]);
  } catch { rejected = true; }
  await db.query('ROLLBACK TO SAVEPOINT s1');
  check('database refuses status Overdue', rejected, true);

  // ---- 5. pipeline_value --------------------------------------------------
  const expPipe = {};
  for (const l of LEADS) {
    expPipe[l.status] ??= { lead_count: 0, committed: 0, estimated: 0 };
    expPipe[l.status].lead_count++;
    expPipe[l.status].committed += l.deal;
    expPipe[l.status].estimated += l.budget;
  }

  const pRows = await db.query(
    `SELECT status, lead_count, committed_value::int AS committed, estimated_value::int AS estimated
     FROM pipeline_value WHERE company_id = $1 ORDER BY status`, [CO]);
  check('pipeline by stage',
    Object.fromEntries(pRows.rows.map(r => [r.status,
      { lead_count: r.lead_count, committed: r.committed, estimated: r.estimated }])),
    Object.fromEntries(Object.entries(expPipe).sort()));

  // Committed and estimated must stay separate. If the view ever adds them the
  // two totals become equal and this catches it.
  const totC = pRows.rows.reduce((s, r) => s + r.committed, 0);
  const totE = pRows.rows.reduce((s, r) => s + r.estimated, 0);
  check('committed total', totC, LEADS.reduce((s, l) => s + l.deal, 0));
  check('estimated total', totE, LEADS.reduce((s, l) => s + l.budget, 0));
  check('the two money columns are not the same number', totC !== totE, true);

  // A deleted lead must leave the pipeline.
  await db.query(`UPDATE leads SET is_deleted = true WHERE id = 'leadproof-3'`);
  const afterDel = await db.query(
    `SELECT lead_count, committed_value::int AS committed FROM pipeline_value
     WHERE company_id = $1 AND status = 'Won'`, [CO]);
  check('deleted lead leaves the pipeline',
    { lead_count: afterDel.rows[0].lead_count, committed: afterDel.rows[0].committed },
    { lead_count: expPipe['Won'].lead_count - 1, committed: expPipe['Won'].committed - 25000 });

  // ---- tenancy ------------------------------------------------------------
  for (const v of ['call_outcome_summary', 'followup_status', 'pipeline_value']) {
    const opt = await db.query(
      `SELECT c.reloptions FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = $1`, [v]);
    check(`${v} runs as invoker`,
      (opt.rows[0]?.reloptions ?? []).includes('security_invoker=on'), true);
  }

  await db.query('ROLLBACK');

  const left = await db.query(
    `SELECT (SELECT count(*) FROM companies WHERE id = $1) AS co,
            (SELECT count(*) FROM callbacks WHERE company_id = $1) AS cb,
            (SELECT count(*) FROM leads     WHERE company_id = $1) AS ld`, [CO]);
  check('database left as found', left.rows[0], { co: '0', cb: '0', ld: '0' });

} catch (err) {
  fail++;
  console.error('\n  HARNESS ERROR —', err.message);
  try { await db.query('ROLLBACK'); } catch {}
} finally {
  await db.end();
}

console.log(`\n  ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
