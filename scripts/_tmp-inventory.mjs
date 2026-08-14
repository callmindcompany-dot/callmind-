/**
 * Read-only. Everything a report could possibly be built from.
 *
 * Written before designing the Reports section, because a report that has no
 * column behind it is the failure mode this whole codebase is full of.
 */
import 'dotenv/config';
import { Client } from 'pg';

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const tables = await db.query(`
  SELECT c.relname AS name, COALESCE(s.n_live_tup, 0) AS rows
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relname = c.relname AND s.schemaname='public'
  WHERE n.nspname='public' AND c.relkind IN ('r','v','m')
  ORDER BY c.relname;
`);

// The tables a report could plausibly be built from.
const INTERESTING = /^(leads|calls|users|attendance|targets|documents|whatsapp|import_logs|integration_runs|audit_logs|companies|agent_status|callbacks|scheduled_messages|automation_|sequences|notifications|branches|lead_)/;

console.log(`${tables.rows.length} tables/views in public\n`);
console.log('--- candidates for reporting ---');
for (const t of tables.rows) {
  if (!INTERESTING.test(t.name)) continue;
  const cols = await db.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position;`, [t.name]);
  console.log(`\n${t.name}  (${t.rows} rows)`);
  console.log('  ' + cols.rows.map((c) => c.column_name).join(', '));
}

console.log('\n\n--- everything else, name and size only ---');
console.log(tables.rows.filter((t) => !INTERESTING.test(t.name))
  .map((t) => `${t.name}(${t.rows})`).join('  '));

await db.end();
