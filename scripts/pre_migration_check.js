import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("=== QUERY 1: companies columns ===");
  const res1 = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(res1.rows, null, 2));

  console.log("\n=== QUERY 2: plan & plan_status distribution ===");
  try {
    const res2 = await client.query(`
      SELECT plan, plan_status, count(*) FROM public.companies GROUP BY 1,2;
    `);
    console.log(JSON.stringify(res2.rows, null, 2));
  } catch (err) {
    console.log("Failed to query plan_status column:", err.message);
    console.log("Trying query with plan column only:");
    const res2alt = await client.query(`
      SELECT plan, count(*) FROM public.companies GROUP BY 1;
    `);
    console.log(JSON.stringify(res2alt.rows, null, 2));
  }

  console.log("\n=== QUERY 3: Row counts ===");
  const res3a = await client.query(`SELECT count(*) FROM public.companies;`);
  const res3b = await client.query(`SELECT count(*) FROM public.users;`);
  const res3c = await client.query(`SELECT count(*) FROM public.leads;`);
  
  console.log(`public.companies: ${res3a.rows[0].count}`);
  console.log(`public.users: ${res3b.rows[0].count}`);
  console.log(`public.leads: ${res3c.rows[0].count}`);

  // Take JSON backup of companies, users, leads counts & schemas
  const companiesBackup = await client.query(`SELECT * FROM public.companies;`);
  const backupPath = path.join(process.cwd(), 'scripts', `companies_backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(companiesBackup.rows, null, 2));
  console.log(`\nBackup of public.companies saved to: ${backupPath}`);

  await client.end();
}

run().catch(err => {
  console.error("Error executing queries:", err);
  process.exit(1);
});
