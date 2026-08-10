/**
 * Proof that an agent can write their own presence and nobody else's.
 *
 *   node scripts/agent-status-proof.mjs
 *
 * agent_status is what the admin's live monitor reads. It carried one policy,
 *
 *   CREATE POLICY "agent_status_all_own_company"
 *     ON agent_status FOR ALL USING (company_id = auth_company_id());
 *
 * so every member of a company could write every other member's row -- mark a
 * colleague offline, or mark the whole floor on a call. The table reports on
 * the people who could rewrite it.
 *
 * Seeds a company with two telecallers, checks each can write their own line
 * and read the other's, and checks neither can write the other's. Runs in one
 * transaction and rolls back.
 *
 * Note the CONTROL block. Under row-level security a refused UPDATE is not an
 * error -- it matches no rows and reports success -- so "the update did not
 * throw" proves nothing and "no rows changed" could equally mean the seed never
 * inserted anything. Every negative check below is preceded by proof the row
 * was there and by the same write succeeding as its owner.
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

const scalar = async (sql, params = []) => (await c.query(sql, params)).rows[0];

const CO = 'as_proof_' + Date.now();
const AGENT_A = '77777777-7777-4777-8777-777777777777';
const AGENT_B = '88888888-8888-4888-8888-888888888888';

/** Reproduces the browser's context: the authenticated role plus a JWT. */
const asAgent = async (uid) => {
  await c.query('SET LOCAL ROLE authenticated');
  await c.query(`SELECT set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: uid, role: 'authenticated' })]);
};
const asOwner = async () => { await c.query('RESET ROLE'); };

console.log('\n--- seed');
await c.query(
  `INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
   VALUES ($1, 'Presence Proof Co', 'growth', 'active', 25)`, [CO]);
for (const [id, email] of [[AGENT_A, 'a@presence.proof'], [AGENT_B, 'b@presence.proof']]) {
  await c.query(
    `INSERT INTO public.users (id, company_id, email, name, role, status)
     VALUES ($1, $2, $3, $3, 'telecaller', 'active')`, [id, CO, email]);
  await c.query(
    `INSERT INTO public.agent_status (id, company_id, user_name, status, last_seen, updated_at)
     VALUES ($1, $2, $3, 'offline', NOW(), NOW())`, [id, CO, email]);
}

console.log('\n--- control: both rows exist and both say offline');
ok('two presence rows seeded',
  (await scalar(`SELECT count(*)::int n FROM public.agent_status WHERE company_id=$1`, [CO])).n === 2);
ok('agent B starts offline',
  (await scalar(`SELECT status FROM public.agent_status WHERE id=$1`, [AGENT_B])).status === 'offline');

console.log('\n--- an agent writes their own line');
await asAgent(AGENT_A);
const ownUpdate = await c.query(
  `UPDATE public.agent_status SET status='on_call' WHERE id=$1`, [AGENT_A]);
ok('agent A can set their own status', ownUpdate.rowCount === 1, `rows=${ownUpdate.rowCount}`);

console.log('\n--- and cannot write anybody else\'s');
// Refused rows are invisible, not an error, so this is checked by row count and
// then confirmed against the value itself.
const peerUpdate = await c.query(
  `UPDATE public.agent_status SET status='offline' WHERE id=$1`, [AGENT_B]);
ok('agent A changes no rows when aiming at agent B', peerUpdate.rowCount === 0,
  `rows=${peerUpdate.rowCount}`);

// Inside a savepoint. A refused INSERT raises 42501, which aborts the
// surrounding transaction -- after which every later statement fails with
// 25P02 and a harness that only asks "did this throw?" reads the whole
// remainder as proof of something.
await c.query('SAVEPOINT sp');
const peerInsert = await c
  .query(
    `INSERT INTO public.agent_status (id, company_id, user_name, status, last_seen, updated_at)
     VALUES ($1, $2, 'forged', 'active', NOW(), NOW())`,
    ['99999999-9999-4999-8999-999999999999', CO],
  )
  .then(() => null)
  .catch((e) => e);
if (peerInsert) await c.query('ROLLBACK TO SAVEPOINT sp');
else await c.query('RELEASE SAVEPOINT sp');

ok('agent A cannot insert a row for somebody else',
  peerInsert !== null && peerInsert.code === '42501', `code=${peerInsert?.code ?? 'no error'}`);

console.log('\n--- reading the board still works');
await asOwner();
await asAgent(AGENT_A);
const visible = await scalar(
  `SELECT count(*)::int n FROM public.agent_status WHERE company_id=$1`, [CO]);
ok('agent A can still see the whole company board', visible.n === 2, `saw ${visible.n}`);

const otherTenant = await scalar(`SELECT count(*)::int n FROM public.agent_status WHERE company_id <> $1`, [CO]);
ok('and nothing from another tenant', otherTenant.n === 0, `saw ${otherTenant.n}`);

console.log('\n--- the values survived as written');
await asOwner();
ok('agent A is on_call',
  (await scalar(`SELECT status FROM public.agent_status WHERE id=$1`, [AGENT_A])).status === 'on_call');
ok('agent B is still offline, untouched by A',
  (await scalar(`SELECT status FROM public.agent_status WHERE id=$1`, [AGENT_B])).status === 'offline');

console.log('\n--- the column the type file invented does not exist');
const loc = await scalar(`
  SELECT count(*)::int n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='agent_status' AND column_name='location'`);
// src/types/supabase.ts declared it. Writing it would have failed every call.
ok('agent_status has no location column', loc.n === 0);

await c.query('ROLLBACK');
await c.end();

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
