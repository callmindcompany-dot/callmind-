import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Leftovers from proof scripts that did not roll back. Named by their prefixes
// so nothing real can match: a real company id is a uuid.
const { rows } = await c.query(`
  SELECT id, name, plan_status FROM public.companies
   WHERE id LIKE 'test_company_%' OR id LIKE 'company_a_%' OR id LIKE 'company_b_%'
   ORDER BY id`);
console.log(`found ${rows.length} test companies:`);
for (const r of rows) console.log(`  ${r.id}  ${r.name}  ${r.plan_status}`);

if (process.argv[2] !== 'delete') {
  console.log('\n(dry run — pass "delete" to remove them)');
  await c.end();
  process.exit(0);
}

await c.query('BEGIN');
const ids = rows.map((r) => r.id);
for (const t of ['leads', 'users', 'calls', 'callbacks', 'attendance_logs', 'targets', 'agent_status']) {
  const r = await c.query(`DELETE FROM public.${t} WHERE company_id = ANY($1)`, [ids]);
  if (r.rowCount) console.log(`  deleted ${r.rowCount} from ${t}`);
}
const co = await c.query(`DELETE FROM public.companies WHERE id = ANY($1)`, [ids]);
console.log(`  deleted ${co.rowCount} companies`);
await c.query('COMMIT');

const { rows: left } = await c.query(`
  SELECT id, plan, plan_status, trial_ends_at FROM public.companies ORDER BY created_at`);
console.log('\nremaining companies:');
for (const r of left) console.log(`  ${r.id}  ${r.plan}/${r.plan_status}  trial_ends=${r.trial_ends_at ?? '-'}`);
await c.end();
