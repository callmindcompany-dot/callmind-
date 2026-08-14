/**
 * Proves the four report views answer, and answer correctly.
 *
 * ReportsPage has always had modules for Agent Performance, Conversion Funnel,
 * Calling Performance and Source Quality, whose hooks select from four
 * relations that did not exist. The hooks throw; the page drops the error and
 * renders an empty chart. Four broken reports have been passing as four quiet
 * ones.
 *
 * The company database holds four leads and no calls, so the views cannot be
 * judged against it. This seeds a realistic week -- three telecallers, four
 * lead sources, a few hundred calls -- checks every figure against a number
 * computed independently, and ROLLS THE WHOLE THING BACK. Nothing is left
 * behind; the assertions at the end verify that.
 *
 * The seed is also what the chart designs are drawn against, so the shapes on
 * screen are shapes this data really produces.
 */
import 'dotenv/config';
import fs from 'fs';
import { Client } from 'pg';

/**
 * Every migration that defines one of these views, in the order Postgres must
 * see them.
 *
 * This used to apply only the first file. Applying one migration in isolation
 * is not a no-op when a later one redefines the same object: running this
 * proof silently reverted conversion_funnel and lead_source_yield to their
 * dateless shapes, and then passed -- including an assertion on a
 * conversion_rate column that the current schema does not have. The suite went
 * green by restoring the thing it was meant to be testing.
 *
 * Anything added later that touches these views belongs on this list.
 */
const MIGRATIONS = [
  'supabase/migrations/20260820000000_report_views.sql',
  'supabase/migrations/20260820000300_datable_report_views.sql',
];

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

for (const migration of MIGRATIONS) {
  await db.query(fs.readFileSync(migration, 'utf8'));
  console.log(`applied ${migration}`);
}
console.log('');

// The proof must be checking the schema the app ships, not one it just built
// out of a stale file. If a later migration adds a column to either view and
// is missing from MIGRATIONS above, this is what says so.
for (const [view, column] of [
  ['conversion_funnel', 'date'],
  ['lead_source_yield', 'converted_count'],
  ['lead_source_yield', 'date'],
]) {
  const found = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`, [view, column]);
  check(`${view} has ${column} after the migrations run`, found.rowCount === 1);
}

const me = (await db.query(`SELECT id, company_id FROM public.users LIMIT 1;`)).rows[0];
const CO = me.company_id;

// Everything from here is inside one transaction that is rolled back.
await db.query('BEGIN');
try {
  // The seat trigger refused the first attempt at this -- "Seat limit reached
  // (3 of 3 used)" -- which is the plan enforcement from the billing work doing
  // its job, against a trial company. Lifted inside the transaction so the seed
  // can have a realistic team; rolled back with everything else.
  await db.query(
    `UPDATE public.companies SET plan='pro', plan_status='active', seat_limit=50 WHERE id=$1;`,
    [CO],
  );

  // ---- three telecallers -------------------------------------------------
  const agents = [
    ['00000000-0000-4000-8000-00000000a001', 'Sneha Patil'],
    ['00000000-0000-4000-8000-00000000a002', 'Rohit Deshmukh'],
    ['00000000-0000-4000-8000-00000000a003', 'Aarti Kulkarni'],
  ];
  for (const [id, name] of agents) {
    await db.query(
      `INSERT INTO public.users (id, company_id, email, name, role, status)
       VALUES ($1,$2,$3,$4,'telecaller','active')`,
      [id, CO, `${id}@seed.invalid`, name],
    );
  }

  // ---- leads across four sources and five stages -------------------------
  const sources = ['IndiaMart', 'Justdial', 'TradeIndia', 'Facebook Ads'];
  const stages = ['New', 'Contacted', 'Interested', 'Negotiation', 'Won', 'Lost'];
  // Deliberately uneven: IndiaMart is loud and cheap, TradeIndia is quiet and
  // valuable. That is the shape the reports have to make visible.
  const perSource = { IndiaMart: 120, Justdial: 60, TradeIndia: 25, 'Facebook Ads': 45 };
  const valueRate = { IndiaMart: 0.04, Justdial: 0.10, TradeIndia: 0.32, 'Facebook Ads': 0.07 };

  let seeded = 0;
  const seededValued = {};
  for (const src of sources) {
    seededValued[src] = 0;
    for (let i = 0; i < perSource[src]; i++) {
      const valued = i / perSource[src] < valueRate[src];
      if (valued) seededValued[src]++;
      // Only leads with a deal value are Won, so the funnel and the yield
      // report tell the same story instead of two different ones.
      const stage = valued ? 'Won' : stages[i % 4 === 3 ? 5 : i % 4];
      const daysAgo = i % 14;
      await db.query(
        `INSERT INTO public.leads
           (id, company_id, name, phone, source, status, is_deleted, created_at,
            first_contact_at, deal_value, city, assigned_to)
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, false,
                 now() - ($6 || ' days')::interval,
                 now() - ($6 || ' days')::interval + ($7 || ' minutes')::interval,
                 $8, $9, $10)`,
        [
          CO, `Seed Lead ${src} ${i}`, `+9190000${String(seeded).padStart(5, '0')}`,
          src, stage, daysAgo,
          // Speed to first contact: IndiaMart answered fast, TradeIndia slowly.
          src === 'IndiaMart' ? 3 + (i % 9) : 40 + (i % 200),
          valued ? 25000 + (i % 7) * 15000 : null,
          ['Pune', 'Mumbai', 'Nashik', 'Nagpur'][i % 4],
          agents[i % 3][0],
        ],
      );
      seeded++;
    }
  }

  // ---- calls, clustered in the working day -------------------------------
  const busyHours = [10, 11, 12, 15, 16, 17, 18];
  let calls = 0, connected = 0, interested = 0;
  for (let d = 0; d < 7; d++) {
    for (const h of busyHours) {
      const n = 2 + ((d + h) % 4);
      for (let k = 0; k < n; k++) {
        // Agent and outcome must be driven by different expressions. The first
        // version used (d+h+k)%3 for both, so agents[0] was never connected and
        // her average talk time came out as a clean, believable 0s. A seed whose
        // variables are secretly the same variable produces charts that look
        // fine and mean nothing.
        const agent = agents[(d * 7 + h * 3 + k) % 3][0];
        const isConnected = (d + h * 2 + k * 5) % 3 !== 0;
        const isInterested = isConnected && (d * 3 + h + k * 2) % 5 === 0;
        if (isConnected) connected++;
        if (isInterested) interested++;
        await db.query(
          `INSERT INTO public.calls
             (id, company_id, agent_id, phone, duration, outcome, interest, timestamp)
           -- calls.id is UUID; leads.id is TEXT. They genuinely differ, so the
           -- cast that is required there is an error here.
           --
           -- $6 cast explicitly: without it Postgres infers it as a date, makes
           -- date - date = integer, and then integer + interval has no operator.
           VALUES (gen_random_uuid(), $1, $2, '+919000000000', $3, $4, $5,
                   (now()::date - $6::int) + ($7 || ' hours')::interval)`,
          [
            CO, agent,
            String(isConnected ? 40 + ((d * h + k) % 260) : 0),
            isConnected ? 'Connected' : 'No Answer',
            isInterested ? 'Interested' : 'Not Interested',
            d, h,
          ],
        );
        calls++;
      }
    }
  }

  console.log(`seeded ${seeded} leads, ${calls} calls, ${agents.length} telecallers\n`);

  // ================= the four views =================
  console.log('--- hourly_call_density ---');
  const hcd = await db.query(
    `SELECT hour, SUM(call_count)::int AS n FROM public.hourly_call_density
     WHERE company_id=$1 GROUP BY hour ORDER BY hour;`, [CO]);
  const hourTotal = hcd.rows.reduce((s, r) => s + r.n, 0);
  check('every call is counted exactly once', hourTotal === calls, `${hourTotal} of ${calls}`);
  check('only working hours appear', hcd.rows.every((r) => busyHours.includes(r.hour)),
    hcd.rows.map((r) => `${r.hour}:00=${r.n}`).join(' '));

  console.log('\n--- conversion_funnel ---');
  // The view is one row per (status, day) now, so the days are summed the same
  // way the hook does it.
  const cf = await db.query(
    `SELECT status, SUM(count)::int AS count FROM public.conversion_funnel
     WHERE company_id=$1 GROUP BY status ORDER BY 2 DESC;`, [CO]);
  const funnelTotal = cf.rows.reduce((s, r) => s + r.count, 0);
  const liveLeads = (await db.query(
    `SELECT count(*)::int AS n FROM public.leads WHERE company_id=$1 AND is_deleted=false;`, [CO])).rows[0].n;
  check('stages add up to the live leads', funnelTotal === liveLeads, `${funnelTotal} of ${liveLeads}`);
  console.log('        ' + cf.rows.map((r) => `${r.status}=${r.count}`).join('  '));

  console.log('\n--- agent_performance ---');
  const ap = await db.query(
    `SELECT agent_name,
            SUM(total_dials)::int AS dials,
            SUM(connected)::int   AS conn,
            SUM(conversions)::int AS conv,
            ROUND(AVG(talk_time_avg))::int AS avg_talk
     FROM public.agent_performance WHERE company_id=$1
     GROUP BY agent_name ORDER BY dials DESC;`, [CO]);
  check('all three telecallers appear, named', ap.rows.length === 3 && ap.rows.every((r) => r.agent_name),
    ap.rows.map((r) => r.agent_name).join(', '));
  check('dials reconcile with the calls table',
    ap.rows.reduce((s, r) => s + r.dials, 0) === calls);
  check('connected reconciles', ap.rows.reduce((s, r) => s + r.conn, 0) === connected,
    `${ap.rows.reduce((s, r) => s + r.conn, 0)} of ${connected}`);
  check('conversions reconcile', ap.rows.reduce((s, r) => s + r.conv, 0) === interested,
    `${ap.rows.reduce((s, r) => s + r.conv, 0)} of ${interested}`);
  // duration is TEXT; the guarded cast must not raise and must not be zero.
  check('average talk time is a real number', ap.rows.every((r) => r.avg_talk > 0),
    ap.rows.map((r) => `${r.agent_name}:${r.avg_talk}s`).join(' '));
  // Printed in full because the chart designs are drawn against these exact
  // figures -- a demo built on numbers nobody produced is the thing this
  // codebase keeps having to remove.
  console.log('        per agent: ' + ap.rows.map((r) =>
    `${r.agent_name} dials=${r.dials} conn=${r.conn} conv=${r.conv} talk=${r.avg_talk}s`).join(' | '));

  // A non-numeric duration must not take the report down.
  await db.query('SAVEPOINT dirty');
  await db.query(
    `INSERT INTO public.calls (id, company_id, agent_id, phone, duration, outcome, interest, timestamp)
     VALUES (gen_random_uuid(), $1, $2, '+919000000000', '2:35', 'Connected', 'Interested', now());`,
    [CO, agents[0][0]]);
  let survived = true;
  try {
    await db.query(`SELECT * FROM public.agent_performance WHERE company_id=$1;`, [CO]);
  } catch { survived = false; }
  await db.query('ROLLBACK TO SAVEPOINT dirty');
  check('a duration like "2:35" does not break the view', survived);

  console.log('\n--- lead_source_yield ---');
  // The view returns counts per day and no rate at all. A rate cannot be
  // summed across days -- 10% and 40% is not 50%, and averaging them is not
  // 25% unless both days carried the same number of leads -- so the division
  // happens once, here, exactly as the hook does it.
  const lsy = await db.query(
    `SELECT source,
            SUM(lead_count)::int      AS lead_count,
            SUM(converted_count)::int AS converted_count
     FROM public.lead_source_yield WHERE company_id=$1
     GROUP BY source ORDER BY 2 DESC;`, [CO]);
  const rate = (r) => r.lead_count > 0
    ? Math.round((100 * r.converted_count / r.lead_count) * 10) / 10
    : 0;

  check('every source is listed', lsy.rows.length >= sources.length,
    lsy.rows.map((r) => `${r.source}=${r.lead_count}(${rate(r)}%)`).join('  '));

  const loud = lsy.rows.find((r) => r.source === 'IndiaMart');
  const quiet = lsy.rows.find((r) => r.source === 'TradeIndia');
  check('the biggest source is not the best one',
    loud.lead_count > quiet.lead_count && rate(loud) < rate(quiet),
    `IndiaMart ${loud.lead_count} @ ${rate(loud)}%  vs  TradeIndia ${quiet.lead_count} @ ${rate(quiet)}%`);

  // The rate has to be arithmetic, not a vibe.
  const expected = Math.round((100 * seededValued.TradeIndia / perSource.TradeIndia) * 10) / 10;
  check('the rate matches the seeded truth', rate(quiet) === expected,
    `computed ${rate(quiet)}%, seed says ${expected}%`);

  // Summing per-day rates instead of per-day counts is the mistake this shape
  // exists to prevent. If the two ever agree here, the seed has stopped
  // spanning multiple days and this check has gone quiet.
  const perDay = await db.query(
    `SELECT lead_count, converted_count FROM public.lead_source_yield
     WHERE company_id=$1 AND source='TradeIndia';`, [CO]);
  if (perDay.rows.length > 1) {
    const avgOfRates = perDay.rows.reduce((s, r) =>
      s + (r.lead_count > 0 ? 100 * r.converted_count / r.lead_count : 0), 0) / perDay.rows.length;
    check('averaging the daily rates gives a different, wrong answer',
      Math.round(avgOfRates * 10) / 10 !== rate(quiet),
      `average of daily rates ${Math.round(avgOfRates * 10) / 10}% vs correct ${rate(quiet)}%`);
  } else {
    check('the seed spans more than one day, so the rate check means something', false,
      'only one day of TradeIndia leads was seeded');
  }

  // Printed because the chart designs quote rupee figures, and a demo that
  // quotes money nobody computed is the thing this codebase keeps removing.
  console.log('\n--- money, per source ---');
  const money = await db.query(`
    SELECT COALESCE(NULLIF(TRIM(source),''),'Unknown') AS source,
           COUNT(*) FILTER (WHERE COALESCE(deal_value,0) > 0)::int AS won,
           COALESCE(SUM(deal_value) FILTER (WHERE deal_value > 0),0)::bigint AS value,
           COUNT(*) FILTER (WHERE first_contact_at IS NOT NULL)::int AS contacted,
           ROUND(AVG(EXTRACT(EPOCH FROM (first_contact_at - created_at))/60)
                 FILTER (WHERE first_contact_at IS NOT NULL))::int AS avg_first_min
    FROM public.leads WHERE company_id=$1 AND is_deleted=false
    GROUP BY 1 ORDER BY value DESC;`, [CO]);
  for (const r of money.rows) {
    console.log(`        ${String(r.source).padEnd(14)} won=${String(r.won).padStart(2)}  value=Rs${String(r.value).padStart(7)}  contacted=${String(r.contacted).padStart(3)}  first call avg=${r.avg_first_min}min`);
  }
  const grand = money.rows.reduce((s, r) => s + Number(r.value), 0);
  console.log(`        TOTAL value Rs${grand}`);

  console.log('\n--- tenancy ---');
  const inv = await db.query(`
    SELECT c.relname, (c.reloptions::text LIKE '%security_invoker=on%') AS ok
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN
      ('hourly_call_density','conversion_funnel','agent_performance','lead_source_yield');`);
  check('all four run as the caller, not the owner', inv.rows.every((r) => r.ok),
    inv.rows.map((r) => `${r.relname}:${r.ok ? 'invoker' : 'OWNER — LEAKS'}`).join(' '));

} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- nothing survived ---');
const after = await db.query(`
  SELECT (SELECT count(*)::int FROM public.leads) AS leads,
         (SELECT count(*)::int FROM public.calls) AS calls,
         (SELECT count(*)::int FROM public.users) AS users;`);
check('leads back to 4', after.rows[0].leads === 4, `${after.rows[0].leads}`);
check('calls back to 0', after.rows[0].calls === 0, `${after.rows[0].calls}`);
check('users back to 1', after.rows[0].users === 1, `${after.rows[0].users}`);

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
