/**
 * Proof that leads are visible only to the agent they are assigned to.
 *
 *   node scripts/leads-scope-proof.mjs
 *
 * Seeds a company with an admin and two telecallers, four leads between them,
 * checks what each role can see and delete, and rolls the whole thing back.
 * Nothing is left behind.
 *
 * The rule comes from the product specification: a telecaller sees the leads
 * assigned to them, not the company's whole book. Until 20260817000000 the
 * database did not enforce it -- every policy on `leads` tested company_id and
 * nothing else, so the restriction existed only in the queries the app happened
 * to send, and any agent could read the rest from the console.
 *
 * Note on ids: auth.uid() is uuid, so anything fed through the JWT `sub` has to
 * parse as one. The first version of this used readable string ids and failed
 * inside get_my_company_id with "invalid input syntax for type uuid" -- which is
 * worth knowing before you assume a policy is broken.
 */
import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query('BEGIN');

const CO = 'proof_co_' + Date.now();
// auth.uid() is uuid, so every id fed through the JWT `sub` must parse as one.
const ADMIN = '33333333-3333-4333-8333-333333333333';
const AGENT_A = '11111111-1111-4111-8111-111111111111';
const AGENT_B = '22222222-2222-4222-8222-222222222222';

// Seed a company with two telecallers and four leads. All inside the
// transaction, all rolled back at the end.
await c.query(`INSERT INTO public.companies (id, name, plan, plan_status, seat_limit) VALUES ($1,'Proof Co','trial','trialing',5)`, [CO]);
for (const [id, role] of [[ADMIN,'admin'], [AGENT_A,'telecaller'], [AGENT_B,'telecaller']]) {
  await c.query(`INSERT INTO public.users (id, company_id, email, role, status) VALUES ($1,$2,$3,$4,'active')`,
    [id, CO, id + '@proof.test', role]);
}
const leads = [['l_a1', AGENT_A], ['l_a2', AGENT_A], ['l_b1', AGENT_B], ['l_none', null]];
for (const [id, owner] of leads) {
  await c.query(`INSERT INTO public.leads (id, company_id, name, phone, assigned_to, is_deleted) VALUES ($1,$2,$3,'900000000',$4,false)`,
    [id + '_' + CO, CO, id, owner]);
}

async function as(userId, role, label) {
  await c.query('SAVEPOINT s');
  await c.query('SET LOCAL ROLE authenticated');
  await c.query('SELECT set_config($1,$2,true)', ['request.jwt.claims',
    JSON.stringify({ sub: userId, role: 'authenticated', app_metadata: { company_id: CO, role } })]);
  const r = await c.query(`SELECT name FROM public.leads WHERE company_id=$1 ORDER BY name`, [CO]);
  const del = await c.query(`DELETE FROM public.leads WHERE company_id=$1`, [CO]);
  await c.query('ROLLBACK TO SAVEPOINT s');
  await c.query('RESET ROLE');
  return { label, sees: r.rows.map(x => x.name), canDelete: del.rowCount };
}

const results = [
  await as(AGENT_A, 'telecaller', 'telecaller A'),
  await as(AGENT_B, 'telecaller', 'telecaller B'),
  await as(ADMIN,   'admin',      'admin'),
];
console.table(results.map(r => ({ who: r.label, sees: r.sees.join(', ') || '(none)', deleted: r.canDelete })));

const ok =
  JSON.stringify(results[0].sees) === JSON.stringify(['l_a1','l_a2']) &&
  JSON.stringify(results[1].sees) === JSON.stringify(['l_b1']) &&
  results[2].sees.length === 4 &&
  results[0].canDelete === 0 && results[1].canDelete === 0 && results[2].canDelete === 4;

console.log('\n' + (ok ? 'PASS — each agent sees only their own; admin sees all; only admin can delete'
                       : 'FAIL — see the table above'));
await c.query('ROLLBACK');
await c.end();
if (!ok) process.exitCode = 1;
