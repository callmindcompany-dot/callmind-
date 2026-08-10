/**
 * Proof that an inbound lead survives being ingested.
 *
 *   node scripts/lead-ingestion-proof.mjs
 *
 * docs/brain.md said "Incoming leads (Meta Ads, IndiaMART, Webhooks) are
 * ingested via Express routes in src/routes/leads.ts". They were not. The
 * insert in processInboundLead named two columns leads has never had --
 * is_new and hold_until -- and the trail insert that followed named four
 * columns import_logs has never had. Every lead from every source failed at the
 * first write, and the release cron that was supposed to free night-held leads
 * wrote hold_until too and had its 42703 demoted to a debug line reading
 * "Leads hold schema pending".
 *
 * This does not import the route -- that would pull in the Express app and the
 * cron timers. It writes the same shapes the code now writes, against the real
 * schema, which is what was actually wrong: not the logic, the column list.
 * Rolled back at the end.
 */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query('BEGIN');

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? '  -- ' + detail : ''}`); }
};

const attempt = async (fn) => {
  await c.query('SAVEPOINT sp');
  try {
    const r = await fn();
    await c.query('RELEASE SAVEPOINT sp');
    return { ok: true, result: r };
  } catch (e) {
    await c.query('ROLLBACK TO SAVEPOINT sp');
    return { ok: false, code: e.code, message: e.message };
  }
};

const CO = 'ingest_proof_' + Date.now();
const LEAD = 'ingest_lead_' + Date.now();

await c.query(
  `INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
   VALUES ($1, 'Ingestion Proof Co', 'growth', 'active', 25)`, [CO]);

console.log('\n--- the shape processInboundLead writes to leads');

const insertLead = await attempt(() => c.query(
  `INSERT INTO public.leads
     (id, company_id, name, phone, email, city, comment, source, status,
      assigned_to, is_unseen, hold_outbound_trigger, created_at)
   VALUES ($1,$2,'Webhook Lead','+919000000000','a@b.c','Pune','from IndiaMART',
           'indiamart','New', NULL, true, false, NOW())`, [LEAD, CO]));
ok('the lead insert succeeds', insertLead.ok, `${insertLead.code} ${insertLead.message}`);

console.log('\n--- CONTROL: the two columns it used to name');

for (const col of ['is_new', 'hold_until']) {
  const present = await c.query(`
    SELECT count(*)::int n FROM information_schema.columns
     WHERE table_schema='public' AND table_name='leads' AND column_name=$1`, [col]);
  // If either of these ever appears, the removal above became unnecessary --
  // and if this assertion is what fails, the fix was the wrong one.
  ok(`leads still has no ${col}, so writing it would still fail`, present.rows[0].n === 0);
}

console.log('\n--- the ingestion trail');

const trail = await attempt(() => c.query(
  `INSERT INTO public.lead_activity_log
     (company_id, lead_id, activity_type, description, created_by)
   VALUES ($1,$2,'lead_ingested','Received from indiamart and left unassigned', NULL)`,
  [CO, LEAD]));
ok('the trail insert succeeds', trail.ok, `${trail.code} ${trail.message}`);

ok('and the row is readable',
  (await c.query(`SELECT count(*)::int n FROM public.lead_activity_log WHERE lead_id=$1`, [LEAD]))
    .rows[0].n === 1);

console.log('\n--- CONTROL: the shape it used to write to import_logs');

const oldTrail = await attempt(() => c.query(
  `INSERT INTO public.import_logs (company_id, source, lead_id, status, assigned_to, routing_reason)
   VALUES ($1,'indiamart',$2,'success',NULL,'Auto-assigned via Round-Robin Rotation')`, [CO, LEAD]));
ok('the old import_logs insert still fails, as it always did',
  !oldTrail.ok && oldTrail.code === '42703', `code=${oldTrail.code ?? 'no error'}`);

console.log('\n--- the night-hold release');

const release = await attempt(() => c.query(
  `UPDATE public.leads SET hold_outbound_trigger = false WHERE id = $1`, [LEAD]));
ok('clearing the hold succeeds', release.ok, `${release.code} ${release.message}`);

const oldRelease = await attempt(() => c.query(
  `UPDATE public.leads SET hold_outbound_trigger = false, hold_until = 'Released' WHERE id = $1`, [LEAD]));
ok('the old release, with hold_until, still fails',
  !oldRelease.ok && oldRelease.code === '42703', `code=${oldRelease.code ?? 'no error'}`);

console.log('\n--- the setting that decides round-robin');

const ts = await c.query(`
  SELECT count(*)::int n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='team_settings' AND column_name='assignment_mode'`);
ok('team_settings.assignment_mode exists', ts.rows[0].n === 1);

const gone = await c.query(`
  SELECT count(*)::int n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='team_settings'
     AND column_name IN ('assignment_rule','active_agent_ids','smart_deduplication',
                         'dedupe_window_days','hold_night_leads','night_hours',
                         'category_agent_map','welcome_template')`);
// These are the eight the code used to read. None has a column, which is why
// assignmentMode resolved to 'Manual' everywhere and the RoundRobin branch was
// unreachable.
ok('and none of the eight it used to read do', gone.rows[0].n === 0, `found ${gone.rows[0].n}`);

await c.query('ROLLBACK');
await c.end();

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
