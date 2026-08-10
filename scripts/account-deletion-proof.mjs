/**
 * Proof that deleting an account removes the person and keeps the company's work.
 *
 *   node scripts/account-deletion-proof.mjs
 *
 * Seeds a company with a founder and two telecallers, gives each telecaller
 * leads and one of them calls, attendance, a saved search and an announcement
 * read receipt, deletes that telecaller's account, and checks what survived.
 * Everything runs inside one transaction and is rolled back; nothing is left.
 *
 * Three things this harness does deliberately, because earlier proof scripts in
 * this repository passed while proving nothing:
 *
 *   Savepoints around every check. A failed statement aborts the surrounding
 *   transaction, after which every later query fails too -- and a harness that
 *   only asks "did this throw?" reads a whole aborted block as success.
 *
 *   Error codes are asserted, not just failure. "It threw" is satisfied by a
 *   typo in a table name. The refusals below assert P0001 and the specific
 *   DETAIL code, so a broken guard cannot pass as a working one.
 *
 *   CONTROL checks first. Every "row is gone" assertion is preceded by proof
 *   that the row was there. Otherwise a seed that silently failed to insert
 *   would satisfy the whole suite.
 */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query('BEGIN');

let pass = 0;
let fail = 0;

const ok = (label, condition, detail = '') => {
  if (condition) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? '  -- ' + detail : ''}`); }
};

/** Run inside a savepoint so a raised exception does not poison what follows. */
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

const scalar = async (sql, params = []) => (await c.query(sql, params)).rows[0];

// auth.uid() is uuid, so every id fed through the JWT `sub` must parse as one.
const CO = 'del_proof_' + Date.now();
const FOUNDER = '44444444-4444-4444-8444-444444444444';
const AGENT_A = '55555555-5555-4555-8555-555555555555';
const AGENT_B = '66666666-6666-4666-8666-666666666666';
const EMAIL_A = 'agent_a@deletion.proof';

const asUser = async (uid) => {
  await c.query(`SELECT set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: uid, role: 'authenticated' })]);
};

console.log('\n--- seed');

await c.query(
  `INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
   VALUES ($1, 'Deletion Proof Co', 'growth', 'active', 25)`, [CO]);

for (const [id, email, role] of [
  [FOUNDER, 'founder@deletion.proof', 'founder'],
  [AGENT_A, EMAIL_A, 'telecaller'],
  [AGENT_B, 'agent_b@deletion.proof', 'telecaller'],
]) {
  // auth.users first: handle_new_user() may fire off it and create the profile.
  await c.query(
    `INSERT INTO auth.users (instance_id, id, aud, role, email,
                             encrypted_password, email_confirmed_at, created_at, updated_at)
     VALUES ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
             $2, '', NOW(), NOW(), NOW())`, [id, email]);
  await c.query(
    `INSERT INTO public.users (id, company_id, email, name, role, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     ON CONFLICT (id) DO UPDATE SET company_id = EXCLUDED.company_id,
       email = EXCLUDED.email, role = EXCLUDED.role, status = 'active'`,
    [id, CO, email, email.split('@')[0], role]);
}

// Two leads for A, one for B. B's is the control: it must be untouched.
for (const [id, owner] of [['dl_a1', AGENT_A], ['dl_a2', AGENT_A], ['dl_b1', AGENT_B]]) {
  await c.query(
    `INSERT INTO public.leads (id, company_id, name, phone, status, assigned_to, is_deleted)
     VALUES ($1, $2, $3, '9000000000', 'new', $4, false)`, [id, CO, id, owner]);
}

await c.query(
  `INSERT INTO public.calls (id, company_id, agent_id, created_by, lead_name, phone)
   VALUES (gen_random_uuid(), $1, $2, $2, 'Called by A', '9000000000')`, [CO, AGENT_A]);

await c.query(
  `INSERT INTO public.attendance_logs (id, company_id, user_id, type, timestamp)
   VALUES ('dl_att_1', $1, $2, 'punch_in', NOW())`, [CO, AGENT_A]);

await c.query(
  `INSERT INTO public.saved_searches (company_id, user_id, name, query_text)
   VALUES ($1, $2, 'A search', 'test')`, [CO, AGENT_A]);

// The two that carry NOT NULL user columns and no foreign key: they neither
// cascade nor block, so without an explicit DELETE they would simply survive
// the account being removed. These are the reason the function names them.
await c.query(
  `INSERT INTO public.announcement_reads (user_id) VALUES ($1)`, [AGENT_A]);

await c.query(
  `INSERT INTO public.support_chat_history (company_id, user_id, role, message)
   VALUES ($1, $2, 'user', 'personal message')`, [CO, AGENT_A]);

console.log('\n--- control: the rows exist before deletion');

ok('agent A has 2 leads',
  (await scalar(`SELECT count(*)::int n FROM public.leads WHERE assigned_to=$1`, [AGENT_A])).n === 2);
ok('agent A has a call record',
  (await scalar(`SELECT count(*)::int n FROM public.calls WHERE agent_id=$1`, [AGENT_A])).n === 1);
ok('agent A has an attendance row',
  (await scalar(`SELECT count(*)::int n FROM public.attendance_logs WHERE user_id=$1`, [AGENT_A])).n === 1);
ok('agent A has a saved search',
  (await scalar(`SELECT count(*)::int n FROM public.saved_searches WHERE user_id=$1`, [AGENT_A])).n === 1);
ok('agent A has an announcement read receipt',
  (await scalar(`SELECT count(*)::int n FROM public.announcement_reads WHERE user_id=$1`, [AGENT_A])).n === 1);
ok('agent A has support chat history',
  (await scalar(`SELECT count(*)::int n FROM public.support_chat_history WHERE user_id=$1`, [AGENT_A])).n === 1);
ok('agent A has an auth row',
  (await scalar(`SELECT count(*)::int n FROM auth.users WHERE id=$1`, [AGENT_A])).n === 1);

console.log('\n--- refusals');

await asUser(AGENT_A);

const wrongWord = await attempt(() => c.query(`SELECT public.delete_my_account('delete')`));
ok('lowercase "delete" is refused', !wrongWord.ok && wrongWord.code === 'P0001',
  `code=${wrongWord.code}`);
ok('  ...with CONFIRM_MISMATCH', (wrongWord.detail || '').includes('CONFIRM_MISMATCH'),
  `detail=${wrongWord.detail}`);

const noArg = await attempt(() => c.query(`SELECT public.delete_my_account(NULL)`));
ok('NULL confirmation is refused', !noArg.ok && noArg.code === 'P0001', `code=${noArg.code}`);

await asUser(FOUNDER);
const lastAdmin = await attempt(() => c.query(`SELECT public.delete_my_account('DELETE')`));
ok('sole administrator with members is refused',
  !lastAdmin.ok && lastAdmin.code === 'P0001', `code=${lastAdmin.code}`);
ok('  ...with LAST_ADMIN', (lastAdmin.detail || '').includes('LAST_ADMIN'),
  `detail=${lastAdmin.detail}`);
ok('  ...and the founder still exists',
  (await scalar(`SELECT count(*)::int n FROM public.users WHERE id=$1`, [FOUNDER])).n === 1);

console.log('\n--- preview');

await asUser(AGENT_A);
const prev = await attempt(() => c.query(`SELECT public.account_deletion_preview() AS p`));
ok('preview runs', prev.ok, prev.message);
if (prev.ok) {
  const p = prev.result.rows[0].p;
  ok('preview reports 2 leads to return', p.leads_to_return === 2, JSON.stringify(p));
  ok('preview reports 1 call kept', p.calls_kept === 1, JSON.stringify(p));
  ok('preview is not blocked for a telecaller', p.blocked === null, JSON.stringify(p));
}

console.log('\n--- deletion');

const del = await attempt(() => c.query(`SELECT public.delete_my_account('DELETE') AS r`));
ok('deletion succeeds', del.ok, del.message);
if (del.ok) {
  ok('reports 2 leads returned', del.result.rows[0].r.leads_returned === 2,
    JSON.stringify(del.result.rows[0].r));
}

console.log('\n--- the person is gone');

ok('profile row deleted',
  (await scalar(`SELECT count(*)::int n FROM public.users WHERE id=$1`, [AGENT_A])).n === 0);
ok('sign-in deleted',
  (await scalar(`SELECT count(*)::int n FROM auth.users WHERE id=$1`, [AGENT_A])).n === 0);
ok('saved search deleted (cascade)',
  (await scalar(`SELECT count(*)::int n FROM public.saved_searches WHERE user_id=$1`, [AGENT_A])).n === 0);
ok('attendance deleted (cascade)',
  (await scalar(`SELECT count(*)::int n FROM public.attendance_logs WHERE user_id=$1`, [AGENT_A])).n === 0);
ok('announcement read receipt deleted (no cascade -- explicit)',
  (await scalar(`SELECT count(*)::int n FROM public.announcement_reads WHERE user_id=$1`, [AGENT_A])).n === 0);
ok('support chat deleted (no cascade -- explicit)',
  (await scalar(`SELECT count(*)::int n FROM public.support_chat_history WHERE user_id=$1`, [AGENT_A])).n === 0);

console.log('\n--- the company keeps its work');

ok('both leads still exist',
  (await scalar(`SELECT count(*)::int n FROM public.leads WHERE id IN ('dl_a1','dl_a2')`)).n === 2);
ok('both leads are now unassigned',
  (await scalar(`SELECT count(*)::int n FROM public.leads WHERE id IN ('dl_a1','dl_a2') AND assigned_to IS NULL`)).n === 2);
ok("the other agent's lead is untouched",
  (await scalar(`SELECT count(*)::int n FROM public.leads WHERE id='dl_b1' AND assigned_to=$1`, [AGENT_B])).n === 1);
ok('the call record survives',
  (await scalar(`SELECT count(*)::int n FROM public.calls WHERE company_id=$1`, [CO])).n === 1);
ok('...with the agent unlinked',
  (await scalar(`SELECT count(*)::int n FROM public.calls WHERE company_id=$1 AND agent_id IS NULL`, [CO])).n === 1);

console.log('\n--- the deletion is recorded without recording who');

const logRow = await scalar(
  `SELECT count(*)::int n FROM public.account_deletion_log
    WHERE email_sha256 = encode(sha256(convert_to(lower($1),'UTF8')),'hex')`, [EMAIL_A]);
ok('a log row matches the hash of the deleted address', logRow.n === 1);
ok('the log stores no address',
  (await scalar(`SELECT count(*)::int n FROM information_schema.columns
                  WHERE table_schema='public' AND table_name='account_deletion_log'
                    AND column_name IN ('email','name','phone')`)).n === 0);

await c.query('ROLLBACK');
await c.end();

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
