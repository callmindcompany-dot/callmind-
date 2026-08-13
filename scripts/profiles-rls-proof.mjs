/**
 * Proves public.profiles stopped being readable by every signed-in user.
 *
 * The threat model is not an anonymous stranger. It is the one AGENTS.md
 * describes: the browser holds an *authenticated* supabase-js client, so any
 * customer with a login could open devtools and query any table RLS does not
 * cover. An anon-key check is close to worthless here -- anon is refused almost
 * everywhere anyway, so it passes whether or not the fix works. (That is not a
 * hypothetical: the first version of this script used one, and its positive
 * control failed, which is how the weakness was caught.)
 *
 * So this impersonates a signed-in user the way Postgres itself does: SET ROLE
 * authenticated plus a request.jwt.claims sub, which is exactly what auth.uid()
 * reads. And it demonstrates the hole first -- RLS is switched off inside a
 * transaction that is rolled back, so the failing case is proven without the
 * table ever being exposed outside that transaction.
 */
import 'dotenv/config';
import fs from 'fs';
import { Client } from 'pg';

const MIGRATION = 'supabase/migrations/20260819000000_profiles_rls.sql';

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const before = await db.query(
  `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass;`,
);
console.log(`\nRLS before this run: ${before.rows[0].relrowsecurity ? 'on' : 'OFF'}`);

await db.query(fs.readFileSync(MIGRATION, 'utf8'));
console.log(`applied ${MIGRATION}`);

const ids = (await db.query(`SELECT id FROM public.profiles ORDER BY id LIMIT 2;`)).rows;
const [me, someoneElse] = ids.map((r) => r.id);
const total = (await db.query(`SELECT count(*)::int AS n FROM public.profiles;`)).rows[0].n;

/** Runs `sql` as an authenticated user, in a transaction that is rolled back. */
async function asUser(uid, sql, { rlsOff = false } = {}) {
  await db.query('BEGIN');
  try {
    if (rlsOff) await db.query('ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY');
    await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify({ sub: uid, role: 'authenticated' })}'`);
    await db.query("SET LOCAL ROLE authenticated");
    return await db.query(sql);
  } finally {
    await db.query('ROLLBACK'); // undoes the role, the claims and any RLS change
  }
}

// ---- 1. the failing case, so the check below is known to be able to fail ----
console.log('\n--- with RLS off (rolled back immediately) ---');
const hole = await asUser(me, `SELECT id, name, phone, email FROM public.profiles;`, {
  rlsOff: true,
});
check(
  'a signed-in user could read every profile',
  hole.rows.length === total,
  `${hole.rows.length} of ${total} rows, incl. ${hole.rows.filter((r) => r.phone || r.email).length} with a phone or email`,
);

const stillOn = await db.query(
  `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.profiles'::regclass;`,
);
check('the rollback restored RLS', stillOn.rows[0].relrowsecurity === true);

// ---- 2. the same query, with the fix in place -------------------------------
console.log('\n--- with RLS on ---');
const own = await asUser(me, `SELECT id FROM public.profiles;`);
check(
  'a signed-in user reads only their own row',
  own.rows.length === 1 && own.rows[0].id === me,
  `${own.rows.length} of ${total} rows`,
);

const other = await asUser(someoneElse, `SELECT id FROM public.profiles;`);
check(
  'a different user reads a different single row',
  other.rows.length === 1 && other.rows[0].id === someoneElse,
  `${other.rows.length} of ${total} rows`,
);

// ---- 3. writes ---------------------------------------------------------------
console.log('\n--- writes ---');
const wrote = await asUser(
  me,
  `UPDATE public.profiles SET name = 'rls-proof' WHERE id = '${someoneElse}' RETURNING id;`,
);
check("cannot rewrite somebody else's profile", wrote.rows.length === 0);

// The tenancy escape the dropped policy allowed: no WITH CHECK meant a user
// could change their own role and organization_id.
const escaped = await asUser(
  me,
  `UPDATE public.profiles SET role = 'admin' WHERE id = '${me}' RETURNING id;`,
);
check('cannot promote themselves', escaped.rows.length === 0);

// ---- 4. structure -----------------------------------------------------------
console.log('\n--- policies ---');
const pol = await db.query(
  `SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='profiles';`,
);
check('exactly one policy', pol.rows.length === 1, pol.rows.map((p) => p.policyname).join(', '));
check('SELECT only', pol.rows.every((p) => p.cmd === 'SELECT'));
check('no role-less "admin" policy left', !pol.rows.some((p) => /admin/i.test(p.policyname)));

const after = await db.query(`SELECT count(*)::int AS n FROM public.profiles;`);
check('nobody was deleted', after.rows[0].n === total, `${after.rows[0].n} rows`);

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
