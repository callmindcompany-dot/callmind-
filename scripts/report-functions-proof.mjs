/**
 * Proof for 20260820000200_fix_report_functions.sql.
 *
 * All three functions raised on every call before this migration, and
 * ReportsPage drops hook errors, so each rendered as an empty module. An empty
 * module is also what a correct-but-quiet function looks like, which is why
 * these assertions seed data that must come back rather than checking the
 * functions merely execute.
 *
 * Everything runs in one transaction that is rolled back.
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

const CO = 'fnproof-co-0001';
const AGENT = '33333333-3333-4333-8333-333333333333';

try {
  await db.connect();
  await db.query('BEGIN');

  await db.query(`INSERT INTO companies (id, name, plan, plan_status, seat_limit)
                  VALUES ($1, 'Fn Proof Co', 'pro', 'active', 50)`, [CO]);
  await db.query(`INSERT INTO users (id, company_id, email, name, display_name, role, status)
                  VALUES ($1, $2, 'tat@fnproof.test', 'Meera Joshi', 'Meera Joshi', 'Telecaller', 'active')`,
    [AGENT, CO]);

  // ---- get_stale_leads ----------------------------------------------------
  // Four leads, each on a different side of every condition the function has.
  const leads = [
    ['fresh',    2,    false],  // contacted 2 days ago  -> not stale
    ['old',      30,   false],  // contacted 30 days ago -> stale
    ['never',    null, false],  // never contacted       -> stale, listed first
    ['deleted',  30,   true],   // stale but deleted     -> must not appear
  ];
  for (const [key, daysAgo, deleted] of leads) {
    await db.query(
      `INSERT INTO leads (id, company_id, name, phone, status, assigned_to, is_deleted,
                          created_at, last_contact_at)
       VALUES ($1, $2, $3, $4, 'New', $5, $6,
               now() - interval '60 days',
               CASE WHEN $7::int IS NULL THEN NULL ELSE now() - ($7::int || ' days')::interval END)`,
      [`fnproof-${key}`, CO, `Lead ${key}`, `77000000${key.length}`, AGENT, deleted, daysAgo]);
  }

  const stale = await db.query(`SELECT id FROM get_stale_leads($1) ORDER BY 1`, [CO]);
  check('stale leads: only the two that are genuinely stale',
    stale.rows.map(r => r.id).sort(), ['fnproof-never', 'fnproof-old']);

  const staleOrder = await db.query(`SELECT id FROM get_stale_leads($1)`, [CO]);
  check('never-contacted lead is listed first', staleOrder.rows[0].id, 'fnproof-never');

  // The cutoff is a parameter, so widening it must change the answer. If this
  // matched the default the parameter would be decorative.
  const wide = await db.query(`SELECT count(*)::int n FROM get_stale_leads($1, 1)`, [CO]);
  check('a 1-day cutoff catches the recently contacted lead too', wide.rows[0].n, 3);

  // ---- get_agent_tat ------------------------------------------------------
  // Two leads first-called 10 and 30 minutes after they arrived. Average must
  // be 20. A third is called before its lead existed -- a backdated import --
  // and a negative wait averaged in would give 10, which is a believable
  // number and wrong.
  //
  // These are dated 100 days back so they sit outside both comparison windows
  // below. The first version of this file put them two hours ago, where they
  // silently added three calls to the current period and made the comparison
  // expectations look wrong when the function was right.
  await db.query(`INSERT INTO leads (id, company_id, name, phone, status, assigned_to, is_deleted, created_at)
                  VALUES ('fnproof-t1', $1, 'T1', '7700001', 'New', $2, false, now() - interval '100 days'),
                         ('fnproof-t2', $1, 'T2', '7700002', 'New', $2, false, now() - interval '100 days'),
                         ('fnproof-t3', $1, 'T3', '7700003', 'New', $2, false, now() - interval '100 days')`,
    [CO, AGENT]);
  await db.query(`INSERT INTO calls (id, company_id, agent_id, lead_id, phone, outcome, duration, timestamp)
                  VALUES (gen_random_uuid(), $1, $2, 'fnproof-t1', '7700001', 'Connected', '30', now() - interval '100 days' + interval '10 minutes'),
                         (gen_random_uuid(), $1, $2, 'fnproof-t2', '7700002', 'Connected', '30', now() - interval '100 days' + interval '30 minutes'),
                         (gen_random_uuid(), $1, $2, 'fnproof-t3', '7700003', 'Connected', '30', now() - interval '101 days')`,
    [CO, AGENT]);

  const tat = await db.query(`SELECT agent_name, avg_tat_minutes::float AS m, leads_measured
                              FROM get_agent_tat($1)`, [CO]);
  check('turnaround averages only the two real waits',
    { name: tat.rows[0]?.agent_name, minutes: tat.rows[0]?.m, measured: tat.rows[0]?.leads_measured },
    { name: 'Meera Joshi', minutes: 20, measured: 2 });

  // ---- get_comparison_metrics --------------------------------------------
  // 3 calls in the current week, 2 in the one before. One connected in each.
  await db.query(`INSERT INTO calls (id, company_id, agent_id, phone, outcome, interest, duration, timestamp)
    VALUES (gen_random_uuid(), $1, $2, '7011', 'Connected', 'Interested',     '30', now() - interval '2 days'),
           (gen_random_uuid(), $1, $2, '7012', 'No Answer', NULL,             '0',  now() - interval '3 days'),
           (gen_random_uuid(), $1, $2, '7013', 'Busy',      NULL,             '0',  now() - interval '4 days'),
           (gen_random_uuid(), $1, $2, '7014', 'Connected', 'Not Interested', '30', now() - interval '9 days'),
           (gen_random_uuid(), $1, $2, '7015', 'No Answer', NULL,             '0',  now() - interval '10 days')`,
    [CO, AGENT]);

  const cmp = await db.query(
    `SELECT * FROM get_comparison_metrics($1, now()-interval '7 days', now(),
                                              now()-interval '14 days', now()-interval '7 days')`, [CO]);
  const m = cmp.rows[0];
  check('call counts split across the two windows',
    { cur: m.current_calls, prev: m.previous_calls }, { cur: 3, prev: 2 });
  check('conversions count interested calls, not a guessed won status',
    { cur: m.current_conversions, prev: m.previous_conversions }, { cur: 1, prev: 0 });
  check('connect rate is a percentage of dials in each window',
    { cur: Number(m.current_connect_rate), prev: Number(m.previous_connect_rate) },
    { cur: 33.3, prev: 50 });

  // No dials at all must read as 0, not as an empty cell.
  const empty = await db.query(
    `SELECT * FROM get_comparison_metrics($1, now()-interval '900 days', now()-interval '800 days',
                                              now()-interval '1000 days', now()-interval '900 days')`, [CO]);
  check('a window with no calls reports zero rather than null',
    Number(empty.rows[0].current_connect_rate), 0);

  // ---- tenancy ------------------------------------------------------------
  for (const fn of ['get_stale_leads', 'get_agent_tat', 'get_comparison_metrics']) {
    const sec = await db.query(
      `SELECT prosecdef, proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND proname = $1`, [fn]);
    check(`${fn} runs as invoker so RLS still applies`, sec.rows[0].prosecdef, false);
    check(`${fn} pins search_path`,
      (sec.rows[0].proconfig ?? []).some(c => c.startsWith('search_path=')), true);
  }

  await db.query('ROLLBACK');
  const left = await db.query(`SELECT count(*)::int n FROM companies WHERE id = $1`, [CO]);
  check('database left as found', left.rows[0].n, 0);

} catch (err) {
  fail++;
  console.error('\n  HARNESS ERROR —', err.message);
  try { await db.query('ROLLBACK'); } catch {}
} finally {
  await db.end();
}

console.log(`\n  ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
