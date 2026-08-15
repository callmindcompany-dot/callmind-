/**
 * Proof for 20260821000000_post_call_form_options.sql.
 *
 * The claims worth proving are the ones that protect Reports: a stored value
 * can never change, an option can never be deleted, and one tenant cannot see
 * or touch another's form.
 *
 * Everything runs inside a transaction that is rolled back.
 */
import 'dotenv/config';
import { Client } from 'pg';

const db = new Client({ connectionString: process.env.DATABASE_URL });
let pass = 0, fail = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}\n          expected ${e}\n          actual   ${a}`); }
}

/** Runs a statement inside a savepoint and reports the SQLSTATE it raised. */
async function refuses(sql, params = []) {
  await db.query('SAVEPOINT s');
  try {
    await db.query(sql, params);
    await db.query('ROLLBACK TO SAVEPOINT s');
    return null;                       // it was allowed
  } catch (e) {
    await db.query('ROLLBACK TO SAVEPOINT s');
    return { code: e.code, message: e.message, detail: e.detail };
  }
}

const CO_A = 'pcfproof-a-0001';
const CO_B = 'pcfproof-b-0001';
const ADMIN_A = '44444444-4444-4444-8444-444444444444';
const AGENT_A = '55555555-5555-4555-8555-555555555555';

try {
  await db.connect();
  await db.query('BEGIN');

  for (const [co, name] of [[CO_A, 'Proof A'], [CO_B, 'Proof B']]) {
    await db.query(`INSERT INTO companies (id, name, plan, plan_status, seat_limit)
                    VALUES ($1, $2, 'pro', 'active', 50)`, [co, name]);
  }
  await db.query(`INSERT INTO users (id, company_id, email, name, role, status)
                  VALUES ($1, $2, 'admin@pcfproof.test', 'Admin A', 'admin', 'active'),
                         ($3, $2, 'agent@pcfproof.test', 'Agent A', 'Telecaller', 'active')`,
    [ADMIN_A, CO_A, AGENT_A]);

  // ---- defaults ------------------------------------------------------------
  const seeded = await db.query(`SELECT ensure_post_call_form_defaults($1) AS n`, [CO_A]);
  check('a new company gets the whole form', seeded.rows[0].n, 12);

  const again = await db.query(`SELECT ensure_post_call_form_defaults($1) AS n`, [CO_A]);
  check('running it twice adds nothing', again.rows[0].n, 0);

  const kinds = await db.query(
    `SELECT kind, count(*)::int n FROM post_call_form_options
     WHERE company_id = $1 GROUP BY kind ORDER BY kind`, [CO_A]);
  check('five outcomes, four presets, three interests',
    Object.fromEntries(kinds.rows.map(r => [r.kind, r.n])),
    { followup: 4, interest: 3, outcome: 5 });

  // The defaults must reproduce today's behaviour exactly, or existing calls
  // stop matching the reports built on them.
  const values = await db.query(
    `SELECT value FROM post_call_form_options
     WHERE company_id = $1 AND kind = 'outcome' ORDER BY sort_order`, [CO_A]);
  check('outcome values are exactly what the app writes today',
    values.rows.map(r => r.value),
    ['Connected', 'No Answer', 'Busy', 'Invalid Number', 'Wrong Number']);

  // ---- the rule ------------------------------------------------------------
  const renamed = await db.query(
    `UPDATE post_call_form_options SET label = 'बोलणं झालं'
     WHERE company_id = $1 AND kind = 'outcome' AND value = 'Connected'
     RETURNING value, label`, [CO_A]);
  check('the label can be anything, in any language',
    renamed.rows[0], { value: 'Connected', label: 'बोलणं झालं' });

  const changedValue = await refuses(
    `UPDATE post_call_form_options SET value = 'बोलणं झालं'
     WHERE company_id = $1 AND kind = 'outcome' AND value = 'Connected'`, [CO_A]);
  check('but the stored value cannot be changed', changedValue?.code, 'P0001');
  check('and it says why, machine-readably',
    JSON.parse(changedValue.detail).code, 'IMMUTABLE_VALUE');

  const changedKind = await refuses(
    `UPDATE post_call_form_options SET kind = 'interest'
     WHERE company_id = $1 AND kind = 'outcome' AND value = 'Busy'`, [CO_A]);
  check('nor can an option change which column it writes to', changedKind?.code, 'P0001');

  // The delete guard is checked further down, as an ordinary tenant.
  //
  // It was checked here first and passed for the wrong reason: this harness
  // connects as the database owner, and the trigger deliberately lets postgres
  // and service_role through so that deleting a company still cascades and
  // support can repair a mistake. A guard tested as superuser proves nothing
  // about the person it exists to stop.

  const off = await db.query(
    `UPDATE post_call_form_options SET is_active = false
     WHERE company_id = $1 AND value = 'Busy' RETURNING is_active`, [CO_A]);
  check('deactivating works', off.rows[0].is_active, false);

  // ---- shape ---------------------------------------------------------------
  const dupe = await refuses(
    `INSERT INTO post_call_form_options (company_id, kind, value, label)
     VALUES ($1, 'outcome', 'Connected', 'Second one')`, [CO_A]);
  check('two chips cannot store the same value', dupe?.code, '23505');

  const noOffset = await refuses(
    `INSERT INTO post_call_form_options (company_id, kind, value, label)
     VALUES ($1, 'followup', 'someday', 'Someday')`, [CO_A]);
  check('a follow-up preset without an offset is refused', noOffset?.code, '23514');

  const strayStage = await refuses(
    `INSERT INTO post_call_form_options (company_id, kind, value, label, maps_to_stage)
     VALUES ($1, 'outcome', 'Voicemail', 'Voicemail', 'Hot')`, [CO_A]);
  check('only an interest may map to a stage', strayStage?.code, '23514');

  const badColor = await refuses(
    `INSERT INTO post_call_form_options (company_id, kind, value, label, color)
     VALUES ($1, 'outcome', 'Voicemail', 'Voicemail', 'teal')`, [CO_A]);
  check('a colour that is not a hex value is refused', badColor?.code, '23514');

  const blank = await refuses(
    `INSERT INTO post_call_form_options (company_id, kind, value, label)
     VALUES ($1, 'outcome', '   ', 'Blank')`, [CO_A]);
  check('a blank value is refused', blank?.code, '23514');

  // Adding an option must work, or none of this is configurable.
  const added = await db.query(
    `INSERT INTO post_call_form_options (company_id, kind, value, label, color, sort_order)
     VALUES ($1, 'outcome', 'Voicemail', 'Left a voicemail', '#7c3aed', 6)
     RETURNING value`, [CO_A]);
  check('a company can add its own option', added.rows[0].value, 'Voicemail');

  // ---- tenancy -------------------------------------------------------------
  await db.query(`SELECT ensure_post_call_form_defaults($1)`, [CO_B]);

  await db.query(`SET LOCAL ROLE authenticated`);
  await db.query(`SELECT set_config('request.jwt.claims',
    json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`, [AGENT_A]);

  const mine = await db.query(`SELECT count(*)::int n FROM post_call_form_options`);
  check('a telecaller sees their own company\'s form', mine.rows[0].n > 0, true);

  const theirs = await db.query(
    `SELECT count(*)::int n FROM post_call_form_options WHERE company_id = $1`, [CO_B]);
  check('and none of another company\'s', theirs.rows[0].n, 0);

  const agentWrite = await refuses(
    `UPDATE post_call_form_options SET label = 'Changed by a telecaller'
     WHERE company_id = $1 AND value = 'Connected'`, [CO_A]);
  // RLS makes the row invisible to the UPDATE rather than raising, so zero
  // rows changed is the refusal. Checked as a count, not as an error.
  const stillNamed = await db.query(
    `SELECT label FROM post_call_form_options WHERE company_id = $1 AND value = 'Connected'`, [CO_A]);
  check('a telecaller cannot rewrite the form',
    { raised: agentWrite === null ? 'no error' : agentWrite.code, label: stillNamed.rows[0].label },
    { raised: 'no error', label: 'बोलणं झालं' });

  await db.query(`SELECT set_config('request.jwt.claims',
    json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`, [ADMIN_A]);
  const adminWrite = await db.query(
    `UPDATE post_call_form_options SET label = 'Spoke to them'
     WHERE company_id = $1 AND value = 'Connected' RETURNING label`, [CO_A]);
  check('an admin can', adminWrite.rows[0]?.label, 'Spoke to them');

  const crossTenant = await db.query(
    `UPDATE post_call_form_options SET label = 'Stolen'
     WHERE company_id = $1 RETURNING id`, [CO_B]);
  check('but not another company\'s form', crossTenant.rowCount, 0);

  // ---- deleting is refused twice over -------------------------------------
  //
  // Two independent layers stop it, and they fail differently, so both are
  // checked. The first attempt at this test expected the trigger's P0001 and
  // got nothing, because RLS gets there first: there is no DELETE policy, so
  // the row is simply not visible to a DELETE and zero rows are removed. No
  // error, and the option survives.
  const rlsDelete = await db.query(
    `DELETE FROM post_call_form_options WHERE company_id = $1 AND value = 'Busy'`, [CO_A]);
  check('RLS alone removes nothing, without raising', rlsDelete.rowCount, 0);

  const survived = await db.query(
    `SELECT count(*)::int n FROM post_call_form_options
     WHERE company_id = $1 AND value = 'Busy'`, [CO_A]);
  check('the option is still there', survived.rows[0].n, 1);

  await db.query(`RESET ROLE`);

  // Now the backstop, on its own. A permissive DELETE policy is added inside
  // this transaction to model somebody adding one later -- which is exactly
  // when a silent delete would start orphaning historical calls. The trigger
  // has to refuse even then.
  await db.query(`CREATE POLICY tmp_delete_probe ON public.post_call_form_options
                  FOR DELETE TO authenticated USING (true)`);
  await db.query(`SET LOCAL ROLE authenticated`);
  await db.query(`SELECT set_config('request.jwt.claims',
    json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)`, [ADMIN_A]);

  const triggerDelete = await refuses(
    `DELETE FROM post_call_form_options WHERE company_id = $1 AND value = 'Busy'`, [CO_A]);
  check('and the trigger refuses even with a delete policy in place',
    triggerDelete?.code, 'P0001');
  check('telling the caller to deactivate instead',
    triggerDelete ? JSON.parse(triggerDelete.detail).code : null, 'DEACTIVATE_INSTEAD');

  await db.query(`RESET ROLE`);
  await db.query(`DROP POLICY tmp_delete_probe ON public.post_call_form_options`);
  await db.query('ROLLBACK');

  const left = await db.query(
    `SELECT count(*)::int n FROM companies WHERE id IN ($1, $2)`, [CO_A, CO_B]);
  check('database left as found', left.rows[0].n, 0);

} catch (err) {
  fail++;
  console.error('\n  HARNESS ERROR —', err.message);
  try { await db.query('RESET ROLE'); await db.query('ROLLBACK'); } catch {}
} finally {
  await db.end();
}

console.log(`\n  ${pass}/${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
