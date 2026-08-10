/**
 * Proof that a telecaller can add a lead, and that the plan stops them.
 *
 *   node scripts/lead-form-proof.mjs
 *
 * There was no way to add a lead from the phone. Leads arrived by webhook or by
 * an admin importing a file, so a referral or a walk-in number went on paper and
 * the call made from it never reached the CRM. LeadFormScreen is the way in;
 * this checks the shape it writes against the real schema, that row-level
 * security lets an agent write it, and that trg_enforce_lead_limit refuses once
 * the plan is full rather than letting the write through.
 *
 * All inside one transaction, rolled back.
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
    return { ok: false, code: e.code, message: e.message, detail: e.detail };
  }
};

const scalar = async (sql, p = []) => (await c.query(sql, p)).rows[0];

const CO = 'form_proof_' + Date.now();
const AGENT = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

const asAgent = async () => {
  await c.query('SET LOCAL ROLE authenticated');
  await c.query(`SELECT set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: AGENT, role: 'authenticated', app_metadata: { company_id: CO, role: 'telecaller' } })]);
};
const asOwner = async () => { await c.query('RESET ROLE'); };

console.log('\n--- seed: a trial company at its lead limit');

// trial is the smallest plan, so its lead limit is the easiest to reach.
const limitRow = await scalar(`SELECT lead_limit FROM public.plan_limits WHERE id='trial'`);
// Number(), because lead_limit is bigint and node-postgres hands bigints back
// as strings. Without this the comparison below reads 500 === '500' and fails
// while printing "(500 of 500)" -- a test that looks right and is not.
const LEAD_LIMIT = limitRow?.lead_limit == null ? null : Number(limitRow.lead_limit);
console.log(`  plan_limits.trial.lead_limit = ${LEAD_LIMIT ?? 'unlimited'}`);

await c.query(
  `INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
   VALUES ($1, 'Form Proof Co', 'trial', 'trialing', 5)`, [CO]);
await c.query(
  `INSERT INTO public.users (id, company_id, email, name, role, status)
   VALUES ($1, $2, 'agent@form.proof', 'Form Agent', 'telecaller', 'active')`, [AGENT, CO]);

console.log('\n--- the shape LeadFormScreen writes');

await asAgent();
const created = await attempt(() => c.query(
  `INSERT INTO public.leads
     (id, company_id, name, phone, email, address, comment, status, priority,
      source, assigned_to, is_deleted, is_unseen)
   VALUES ($1,$2,'Referral From Customer','+919812345678','r@x.test','Satara',
           'Asked us to call back about the loan','New','Medium',
           'added_by_agent',$3,false,false)`,
  ['m_proof_1', CO, AGENT]));
ok('an agent can insert a lead for their own company', created.ok,
  `${created.code} ${created.message}`);

await asOwner();
const row = await scalar(`SELECT name, assigned_to, source, status, priority FROM public.leads WHERE id='m_proof_1'`);
ok('it lands assigned to the agent who added it', row?.assigned_to === AGENT, `assigned_to=${row?.assigned_to}`);
ok('with the source recorded', row?.source === 'added_by_agent', `source=${row?.source}`);
ok('and starts as New', row?.status === 'New', `status=${row?.status}`);

console.log('\n--- editing it');

await asAgent();
const edited = await attempt(() => c.query(
  `UPDATE public.leads SET name='Corrected Name', email='fixed@x.test', updated_at=NOW()
    WHERE id='m_proof_1' AND company_id=$1`, [CO]));
ok('an agent can correct the details', edited.ok && edited.result.rowCount === 1,
  `rows=${edited.result?.rowCount} ${edited.code ?? ''}`);

await asOwner();
ok('the correction stuck',
  (await scalar(`SELECT name FROM public.leads WHERE id='m_proof_1'`))?.name === 'Corrected Name');

console.log('\n--- CONTROL: another tenant is refused');

await c.query(
  `INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
   VALUES ($1, 'Other Co', 'trial', 'trialing', 5)`, [CO + '_other']);
await asAgent();
const crossTenant = await attempt(() => c.query(
  `INSERT INTO public.leads (id, company_id, name, phone, status, is_deleted)
   VALUES ('m_proof_x', $1, 'Should Not Exist', '+919000000000', 'New', false)`,
  [CO + '_other']));
// If this passes, the insert policy is not scoping by company and the whole
// screen is a tenancy hole rather than a feature.
ok('an agent cannot write a lead into another company',
  !crossTenant.ok && crossTenant.code === '42501', `code=${crossTenant.code ?? 'no error'}`);

console.log('\n--- the plan limit');

if (LEAD_LIMIT === null) {
  console.log('  trial has no lead limit, so there is nothing to breach');
} else {
  await asOwner();

  // Fill to exactly the limit, in one statement.
  //
  // The first version looped LEAD_LIMIT times without counting the lead already
  // added above, so the seed itself breached the limit on its last insert and
  // the harness died before reaching the assertion. Worth recording: the
  // trigger is statement-level and not role-gated, so it applies to this
  // connection too -- there is no back door for the seed.
  const already = await scalar(
    `SELECT count(*)::int n FROM public.leads WHERE company_id=$1 AND is_deleted=false`, [CO]);
  const room = LEAD_LIMIT - already.n;
  ok(`the company has room for ${room} more before the limit`, room > 0, `already=${already.n}`);

  const fill = await attempt(() => c.query(
    `INSERT INTO public.leads (id, company_id, name, phone, status, is_deleted)
     SELECT 'm_fill_' || g, $1, 'Filler', '+919000000000', 'New', false
       FROM generate_series(1, $2) g`, [CO, room]));
  ok('filling to exactly the limit is allowed', fill.ok, `${fill.code} ${fill.message}`);

  const count = await scalar(
    `SELECT count(*)::int n FROM public.leads WHERE company_id=$1 AND is_deleted=false`, [CO]);
  ok(`company now sits at the limit (${count.n} of ${LEAD_LIMIT})`, count.n === LEAD_LIMIT);

  await asAgent();
  const overLimit = await attempt(() => c.query(
    `INSERT INTO public.leads (id, company_id, name, phone, status, is_deleted)
     VALUES ('m_proof_over', $1, 'One Too Many', '+919000000001', 'New', false)`, [CO]));
  ok('the next lead is refused', !overLimit.ok, `code=${overLimit.code ?? 'no error'}`);
  ok('  ...with P0001, which the form shows to the agent',
    overLimit.code === 'P0001', `code=${overLimit.code}`);
  ok('  ...and a PLAN_LIMIT detail the form can recognise',
    (overLimit.detail || '').includes('PLAN_LIMIT'), `detail=${overLimit.detail}`);
}

await asOwner();
await c.query('ROLLBACK');
await c.end();

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
