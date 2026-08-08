/**
 * Proof that a follow-up scheduled on the web reaches the telecaller's phone.
 *
 *   node scripts/callback-loop-proof.mjs
 *
 * The mobile app used to derive its callbacks from the `calls` table, so a
 * callback scheduled from the web -- which writes `public.callbacks` -- never
 * appeared on the phone at all. Both now read the same table, keyed on the
 * agent's email in assigned_to. This checks that, as the authenticated role,
 * and rolls everything back.
 */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query('BEGIN');

const CO = 'cb_co_' + Date.now();
const AGENT = '44444444-4444-4444-8444-444444444444';
const OTHER = '55555555-5555-4555-8555-555555555555';
const AGENT_EMAIL = 'agent@proof.test';
const OTHER_EMAIL = 'other@proof.test';

await c.query(`INSERT INTO public.companies (id,name,plan,plan_status,seat_limit) VALUES ($1,'CB Co','trial','trialing',5)`, [CO]);
for (const [id, email] of [[AGENT, AGENT_EMAIL], [OTHER, OTHER_EMAIL]]) {
  await c.query(`INSERT INTO public.users (id,company_id,email,role,status) VALUES ($1,$2,$3,'telecaller','active')`, [id, CO, email]);
}
await c.query(`INSERT INTO public.leads (id,company_id,name,phone,assigned_to,is_deleted) VALUES ($1,$2,'Ravi Kumar','9876543210',$3,false)`, ['lead_' + CO, CO, AGENT]);

// The web schedules a follow-up for tomorrow at 11, through the service role.
const due = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
await c.query(
  `INSERT INTO public.callbacks (company_id, lead_id, assigned_to, reminder_date, notes, status)
   VALUES ($1,$2,$3,$4,'Discussed home loan. Call back.','Pending')`,
  [CO, 'lead_' + CO, AGENT_EMAIL, due]);

// Now be the phone.
async function asAgent(uid, email, label) {
  await c.query('SAVEPOINT s');
  await c.query('SET LOCAL ROLE authenticated');
  await c.query('SELECT set_config($1,$2,true)', ['request.jwt.claims',
    JSON.stringify({ sub: uid, role: 'authenticated', email, app_metadata: { company_id: CO, role: 'telecaller' } })]);
  const r = await c.query(
    `SELECT cb.reminder_date, cb.notes, l.name AS lead_name
       FROM public.callbacks cb LEFT JOIN public.leads l ON l.id = cb.lead_id
      WHERE cb.company_id=$1 AND cb.assigned_to=$2 AND cb.status='Pending'
      ORDER BY cb.reminder_date`, [CO, email]);
  await c.query('ROLLBACK TO SAVEPOINT s');
  await c.query('RESET ROLE');
  return { who: label, sees: r.rowCount, lead: r.rows[0]?.lead_name ?? '—' };
}

const results = [
  await asAgent(AGENT, AGENT_EMAIL, 'the assigned agent'),
  await asAgent(OTHER, OTHER_EMAIL, 'a different agent'),
];
console.table(results);

const ok = results[0].sees === 1 && results[0].lead === 'Ravi Kumar' && results[1].sees === 0;
console.log('\n' + (ok
  ? 'PASS — the follow-up scheduled on the web reaches its agent, and only that agent'
  : 'FAIL — see the table above'));

await c.query('ROLLBACK');
await c.end();
if (!ok) process.exitCode = 1;
