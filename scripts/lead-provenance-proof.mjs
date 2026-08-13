/**
 * Proves the source performance report says something true, and stays inside
 * the tenant.
 *
 * "Leads per source" is the easy half of the answer and the useless half:
 * IndiaMART sending 340 and JustDial sending 90 decides nothing if JustDial's
 * 90 convert and IndiaMART's 340 do not. So the report counts contacted and
 * valued separately, and the arithmetic on those is what could quietly be
 * wrong.
 *
 * It deliberately does not guess which status means "won" -- statuses are per
 * company in team_settings.leads_statuses and leads.status has no CHECK
 * constraint, so any mapping would be a guess printed as a fact.
 */
import 'dotenv/config';
import fs from 'fs';
import { Client } from 'pg';

const MIGRATION = 'supabase/migrations/20260819000400_lead_provenance.sql';

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

const lead = (source, { contacted = false, value = null, days = 1 } = {}) => `
  INSERT INTO public.leads (id, company_id, name, phone, source, status, is_deleted, created_at,
                            first_contact_at, deal_value)
  VALUES (gen_random_uuid()::text, '${me.company_id}', 'Proof', '+919000000000', '${source}',
          'New', false, now() - INTERVAL '${days} days',
          ${contacted ? `now() - INTERVAL '${days} days'` : 'NULL'},
          ${value === null ? 'NULL' : value});`;

async function asUser(sql, companyId = me.company_id) {
  await db.query(`SET LOCAL request.jwt.claims = '${JSON.stringify({ sub: me.id, role: 'authenticated' })}'`);
  await db.query("SET LOCAL ROLE authenticated");
  try {
    const r = await db.query(sql);
    return { rows: r.rows };
  } catch (e) {
    return { error: `${e.code} ${e.message}` };
  }
}

console.log('--- the column ---');
const col = await db.query(`
  SELECT data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='leads' AND column_name='integration_run_id';`);
check('leads carries the run that created it', col.rows[0]?.data_type === 'uuid',
  col.rows[0]?.data_type ?? 'MISSING');

console.log('\n--- volume is not the same as value ---');
await db.query('BEGIN');
try {
  // A high-volume source that converts nothing, and a small one that does.
  for (let i = 0; i < 5; i++) await db.query(lead('LoudMarket', { contacted: true }));
  await db.query(lead('QuietMarket', { contacted: true, value: 40000 }));
  await db.query(lead('QuietMarket', { contacted: true, value: 60000 }));

  const r = await asUser(`SELECT * FROM public.lead_source_performance(30);`);
  const loud = r.rows?.find((x) => x.source === 'LoudMarket');
  const quiet = r.rows?.find((x) => x.source === 'QuietMarket');

  check('counts leads per source', loud?.leads === 5 && quiet?.leads === 2,
    r.error || `loud=${loud?.leads} quiet=${quiet?.leads}`);
  check('counts only leads somebody actually rang', loud?.contacted === 5 && quiet?.contacted === 2);
  check('the loud source shows no value', loud?.valued === 0 && Number(loud?.total_value) === 0,
    `valued=${loud?.valued} value=${loud?.total_value}`);
  check('the quiet one shows what it earned', quiet?.valued === 2 && Number(quiet?.total_value) === 100000,
    `valued=${quiet?.valued} value=${quiet?.total_value}`);
  // Ordered by volume, which is why the report must show value beside it --
  // the biggest row is the one earning nothing.
  check('the biggest row is the one worth least', r.rows?.[0]?.source === 'LoudMarket');
} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- what it excludes ---');
await db.query('BEGIN');
try {
  await db.query(lead('Recent', { contacted: true }));
  await db.query(lead('Ancient', { contacted: true, days: 400 }));
  await db.query(`
    INSERT INTO public.leads (id, company_id, name, phone, source, status, is_deleted, created_at)
    VALUES (gen_random_uuid()::text, '${me.company_id}', 'Deleted', '+919000000001', 'Binned',
            'New', true, now());`);
  await db.query(lead('', { contacted: false }));

  const r = await asUser(`SELECT * FROM public.lead_source_performance(30);`);
  const names = (r.rows ?? []).map((x) => x.source);
  check('respects the window', names.includes('Recent') && !names.includes('Ancient'), names.join(','));
  check('ignores deleted leads', !names.includes('Binned'));
  check('gives blank sources a name rather than dropping them', names.includes('Unknown'));
} finally {
  await db.query('ROLLBACK');
}

console.log('\n--- tenancy ---');
await db.query('BEGIN');
try {
  await db.query(`
    INSERT INTO public.leads (id, company_id, name, phone, source, status, is_deleted, created_at)
    VALUES (gen_random_uuid()::text, 'another-company', 'Theirs', '+919000000002', 'TheirSource',
            'New', false, now());`);
  const r = await asUser(`SELECT * FROM public.lead_source_performance(30);`);
  check('another tenant\'s leads are not counted',
    !(r.rows ?? []).some((x) => x.source === 'TheirSource'),
    r.error || (r.rows ?? []).map((x) => x.source).join(','));
} finally {
  await db.query('ROLLBACK');
}

const leftover = await db.query(`SELECT count(*)::int AS n FROM public.leads WHERE name = 'Proof';`);
check('the proof left nothing behind', leftover.rows[0].n === 0, `${leftover.rows[0].n} rows`);

console.log(`\n${pass} passed, ${fail} failed`);
await db.end();
process.exit(fail === 0 ? 0 : 1);
