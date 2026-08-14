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

const MIGRATION = 'supabase/migrations/20260820000000_report_views.sql';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

await db.query(fs.readFileSync(MIGRATION, 'utf8'));
console.log(`applied ${MIGRATION}\n`);

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
  const cf = await db.query(
    `SELECT status, count FROM public.conversion_funnel WHERE company_id=$1 ORDER BY count DESC;`, [CO]);
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
  const lsy = await db.query(
    `SELECT source, lead_count, conversion_rate FROM public.lead_source_yield
     WHERE company_id=$1 ORDER BY lead_count DESC;`, [CO]);
  check('every source is listed', lsy.rows.length >= sources.length,
    lsy.rows.map((r) => `${r.source}=${r.lead_count}(${r.conversion_rate}%)`).join('  '));

  const loud = lsy.rows.find((r) => r.source === 'IndiaMart');
  const quiet = lsy.rows.find((r) => r.source === 'TradeIndia');
  check('the biggest source is not the best one',
    loud.lead_count > quiet.lead_count && Number(loud.conversion_rate) < Number(quiet.conversion_rate),
    `IndiaMart ${loud.lead_count} @ ${loud.conversion_rate}%  vs  TradeIndia ${quiet.lead_count} @ ${quiet.conversion_rate}%`);

  // The rate has to be arithmetic, not a vibe.
  const expected = Math.round((100 * seededValued.TradeIndia / perSource.TradeIndia) * 10) / 10;
  check('the rate matches the seeded truth', Number(quiet.conversion_rate) === expected,
    `view says ${quiet.conversion_rate}%, seed says ${expected}%`);

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
