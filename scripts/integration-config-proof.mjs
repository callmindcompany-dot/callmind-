/**
 * Proves an integration can now be saved, and that a telecaller cannot read the
 * credentials.
 *
 * Before this change, clicking Save on any integration failed twice over.
 * Probed against the live database as a signed-in founder:
 *
 *   INSERT team_settings (company_id, indiamart_config)
 *       -> 42703 column "indiamart_config" of relation "team_settings" does not exist
 *   INSERT team_settings (company_id, assignment_mode)
 *       -> 42501 new row violates row-level security policy
 *
 * The first is what the customer met: useIntegrationSettings upserted nine
 * columns that team_settings does not have. The second waited behind it,
 * because the table had RLS on and not one policy.
 *
 * Everything runs as `authenticated` with a request.jwt.claims `sub`, and each
 * case is a transaction that is rolled back, so the database is unchanged when
 * this exits.
 *
 * One trap worth recording, because the first version of this script fell into
 * it and reported a telecaller successfully writing credentials. The live
 * helpers do not read the JWT:
 *
 *   get_my_role()       -> SELECT role       FROM public.users WHERE id = auth.uid()::text
 *   get_my_company_id() -> SELECT company_id FROM public.users WHERE id = auth.uid()::text
 *
 * AGENTS.md and 20260718_secure_rls.sql both describe them as reading
 * auth.jwt()->'app_metadata', and the database disagrees with both. So putting
 * app_metadata.role = 'telecaller' in the claims proves nothing -- the function
 * ignores it and looks the real user up, who is a founder. A telecaller has to
 * be a real row in public.users, which is what this script now creates inside
 * the transaction it rolls back.
 */
import 'dotenv/config';
import fs from 'fs';
import { Client } from 'pg';

const MIGRATION = 'supabase/migrations/20260819000100_integration_credentials.sql';

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` -- ${detail}` : ''}`);
  ok ? pass++ : fail++;
};

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

await db.query(fs.readFileSync(MIGRATION, 'utf8'));
console.log(`applied ${MIGRATION}\n`);

const me = (await db.query(`SELECT id, company_id FROM public.users LIMIT 1;`)).rows[0];
const OTHER_COMPANY = 'proof-other-company';

const TELECALLER_ID = '00000000-0000-4000-8000-00000000beef';

/**
 * Runs sql as a signed-in user, then rolls back.
 *
 * `role: 'telecaller'` seeds a real users row first, because get_my_role()
 * reads that table rather than the token -- see the note at the top.
 */
async function asUser(sql, { role = 'founder', companyId = me.company_id } = {}) {
  await db.query('BEGIN');
  try {
    let uid = me.id;

    if (role !== 'founder') {
      uid = TELECALLER_ID;
      await db.query(
        `INSERT INTO public.users (id, company_id, email, name, role, status)
         VALUES ($1, $2, 'proof-telecaller@example.invalid', 'Proof Telecaller', $3, 'active')
         ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, company_id = EXCLUDED.company_id`,
        [uid, companyId, role],
      );
    }

    await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify({ sub: uid, role: 'authenticated' })}'`);
    await db.query("SET LOCAL ROLE authenticated");
    const r = await db.query(sql);
    return { rows: r.rows, rowCount: r.rowCount };
  } catch (e) {
    return { error: `${e.code} ${e.message}` };
  } finally {
    await db.query('ROLLBACK');
  }
}

const SAVE = (company = me.company_id) => `
  INSERT INTO public.integration_credentials (company_id, provider, config, is_active)
  VALUES ('${company}', 'indiamart', '{"apiKey":"glusr-test","mobile":"9999999999"}'::jsonb, true)
  ON CONFLICT (company_id, provider) DO UPDATE
    SET config = EXCLUDED.config, is_active = EXCLUDED.is_active
  RETURNING provider;`;

console.log('--- the founder saving an integration (what was impossible) ---');
const saved = await asUser(SAVE());
check('the save succeeds', saved.rowCount === 1, saved.error || `${saved.rowCount} row`);

// The write above was rolled back, so the read has to happen in the same
// transaction as its own write to prove a round trip.
const roundTrip = await (async () => {
  await db.query('BEGIN');
  try {
    const claims = { sub: me.id, role: 'authenticated', app_metadata: { company_id: me.company_id, role: 'founder' } };
    await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify(claims)}'`);
    await db.query("SET LOCAL ROLE authenticated");
    await db.query(SAVE());
    const r = await db.query(`SELECT config->>'apiKey' AS key, is_active FROM public.integration_credentials WHERE provider='indiamart';`);
    return r.rows[0];
  } finally {
    await db.query('ROLLBACK');
  }
})();
check('what was saved reads back', roundTrip?.key === 'glusr-test' && roundTrip?.is_active === true,
  JSON.stringify(roundTrip ?? null));

console.log('\n--- the telecaller (credentials are not theirs to see) ---');
const tcRead = await asUser(`SELECT provider FROM public.integration_credentials;`, { role: 'telecaller' });
check('cannot read credentials', (tcRead.rows?.length ?? 0) === 0, tcRead.error || `${tcRead.rowCount} rows`);

const tcWrite = await asUser(SAVE(), { role: 'telecaller' });
check('cannot write credentials', Boolean(tcWrite.error), tcWrite.error || 'WROTE THEM');

console.log('\n--- another tenant ---');
const cross = await asUser(SAVE(OTHER_COMPANY));
check('cannot write into another company', Boolean(cross.error), cross.error || 'WROTE THEM');

console.log('\n--- team_settings: preferences readable, writes admin-only ---');
const prefsRead = await asUser(`SELECT company_id FROM public.team_settings;`, { role: 'telecaller' });
check('a telecaller can read preferences', (prefsRead.rows?.length ?? 0) === 1,
  prefsRead.error || `${prefsRead.rowCount} rows`);

const prefsWrite = await asUser(
  `UPDATE public.team_settings SET assignment_mode='RoundRobin' WHERE company_id='${me.company_id}' RETURNING company_id;`,
  { role: 'telecaller' });
check('a telecaller cannot change them', (prefsWrite.rowCount ?? 0) === 0,
  prefsWrite.error || `${prefsWrite.rowCount} rows`);

const adminWrite = await asUser(
  `UPDATE public.team_settings SET assignment_mode='RoundRobin' WHERE company_id='${me.company_id}' RETURNING company_id;`);
check('an admin can', adminWrite.rowCount === 1, adminWrite.error || `${adminWrite.rowCount} rows`);

const aliases = await asUser(
  `UPDATE public.team_settings SET field_aliases='{"phone":["mob"]}'::jsonb WHERE company_id='${me.company_id}' RETURNING company_id;`);
check('field_aliases has a column to go in', adminWrite.rowCount === 1 && !aliases.error,
  aliases.error || 'ok');

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
