/**
 * Proves the polling schedule exists, reports itself honestly, and refuses to
 * pretend when it is not configured.
 *
 * The fault being closed: IntegrationHub said "Live / Auto-Sync Active" and
 * docs/LEAD_WORKFLOW.md said "runs every 10 mins", while the four poll
 * functions were only ever invoked by a Sync Now button. Nothing scheduled
 * them, because pg_cron was not installed.
 *
 * The whole point of integration_sync_status() is that the hub can no longer
 * type its own status, so this checks the reported status flips with reality
 * rather than checking that a string is present somewhere.
 */
import 'dotenv/config';
import fs from 'fs';
import { Client } from 'pg';

const MIGRATION = 'supabase/migrations/20260819000200_integration_poll_schedule.sql';

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

console.log('--- extensions ---');
const ext = await db.query(
  `SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net') ORDER BY extname;`,
);
check('pg_cron and pg_net are installed', ext.rows.length === 2,
  ext.rows.map((r) => r.extname).join(', '));

console.log('\n--- before any secret exists, nothing pretends ---');
const hadSecrets = (await db.query(
  `SELECT count(*)::int AS n FROM vault.decrypted_secrets WHERE name IN ('project_url','service_role_key');`,
)).rows[0].n;

if (hadSecrets === 0) {
  const status = await db.query(`SELECT provider, is_scheduled FROM public.integration_sync_status() ORDER BY provider;`);
  check('every provider reports unscheduled', status.rows.every((r) => r.is_scheduled !== true),
    status.rows.map((r) => `${r.provider}:${r.is_scheduled ?? 'null'}`).join(' '));

  // The refusal has to be loud. A poll that silently does nothing is the
  // original fault wearing a different hat.
  let refused = null;
  try {
    await db.query(`SELECT public.run_integration_poll('indiamart');`);
  } catch (e) {
    refused = `${e.code} ${e.message}`;
  }
  check('polling refuses loudly without its secrets', Boolean(refused), refused ?? 'IT RETURNED QUIETLY');

  let schedRefused = null;
  try {
    await db.query(`SELECT public.schedule_integration_polls();`);
  } catch (e) {
    schedRefused = e.message;
  }
  check('scheduling refuses and names what is missing',
    Boolean(schedRefused && /vault secret/i.test(schedRefused)), schedRefused ?? 'IT SCHEDULED ANYWAY');
} else {
  check('secrets already present, skipping the unconfigured case', true, `${hadSecrets} secret(s)`);
}

console.log('\n--- with secrets, the schedule appears and is reported ---');
// Done in a transaction and rolled back: this writes a placeholder secret, so
// it must not survive, and no real key is involved at any point.
await db.query('BEGIN');
try {
  await db.query(`SELECT vault.create_secret('https://proof.invalid', 'project_url');`);
  await db.query(`SELECT vault.create_secret('proof-not-a-real-key', 'service_role_key');`);
  const msg = await db.query(`SELECT public.schedule_integration_polls() AS m;`);
  check('scheduling succeeds', /Scheduled/.test(msg.rows[0].m), msg.rows[0].m);

  const status = await db.query(
    `SELECT provider, schedule, is_scheduled FROM public.integration_sync_status() ORDER BY provider;`,
  );
  check('all four providers now report scheduled', status.rows.every((r) => r.is_scheduled === true),
    status.rows.map((r) => `${r.provider}=${r.schedule}`).join(' '));
  check('the three marketplaces are every 10 minutes',
    status.rows.filter((r) => r.provider !== 'facebook').every((r) => r.schedule === '*/10 * * * *'));

  // The secret must not be sitting in the cron command in plain text.
  const cmd = await db.query(`SELECT command FROM cron.job WHERE jobname = 'poll-indiamart';`);
  check('the cron command carries no key', !/proof-not-a-real-key/.test(cmd.rows[0]?.command ?? ''),
    cmd.rows[0]?.command ?? '(none)');

  const off = await db.query(`SELECT public.unschedule_integration_polls() AS m;`);
  const after = await db.query(`SELECT is_scheduled FROM public.integration_sync_status();`);
  check('unscheduling takes the claim away again', after.rows.every((r) => r.is_scheduled !== true),
    off.rows[0].m);
} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- a customer cannot trigger other tenants polls ---');
await db.query('BEGIN');
try {
  await db.query("SET LOCAL ROLE authenticated");
  let denied = null;
  try {
    await db.query(`SELECT public.run_integration_poll('indiamart');`);
  } catch (e) {
    denied = `${e.code} ${e.message.split('\n')[0]}`;
  }
  check('run_integration_poll is not callable by authenticated', Boolean(denied), denied ?? 'IT RAN');
} finally {
  await db.query('ROLLBACK');
}

const leftover = await db.query(
  `SELECT count(*)::int AS n FROM vault.decrypted_secrets WHERE decrypted_secret = 'proof-not-a-real-key';`,
);
check('the placeholder secret did not survive', leftover.rows[0].n === 0);

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
