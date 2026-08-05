import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Vrushabh09%40@db.aojhpnrkmunstzjvvppb.supabase.co:5432/postgres";

async function runPreCheck() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("=== PRE-MIGRATION DATABASE BACKUP & CHECK ===\n");

  try {
    // 1. Columns of companies
    const res1 = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='companies'
      ORDER BY ordinal_position;
    `);
    console.log("--- 1. public.companies columns ---");
    console.table(res1.rows);

    // 2. companies group by plan, plan_status
    const res2 = await client.query(`
      SELECT plan, plan_status, count(*) FROM public.companies GROUP BY 1,2;
    `);
    console.log("\n--- 2. public.companies (plan, plan_status) count ---");
    console.table(res2.rows);

    // 3. Tables list
    const res3 = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' ORDER BY 1;
    `);
    console.log("\n--- 3. Existing Tables in public schema ---");
    console.table(res3.rows);

    // 4. Row counts
    const resComp = await client.query("SELECT count(*) FROM public.companies;");
    const resUsers = await client.query("SELECT count(*) FROM public.users;");
    let resLeads = { rows: [{ count: '0 (table might not exist)' }] };
    try {
      resLeads = await client.query("SELECT count(*) FROM public.leads;");
    } catch (e) {
      console.log("Leads table error:", e.message);
    }

    console.log("\n--- 4. Core Table Row Counts ---");
    console.log(`public.companies: ${resComp.rows[0].count}`);
    console.log(`public.users:     ${resUsers.rows[0].count}`);
    console.log(`public.leads:     ${resLeads.rows[0].count}`);

    // Create a backup snapshot of existing tables structure and counts
    const backupData = {
      timestamp: new Date().toISOString(),
      tables: res3.rows.map(r => r.table_name),
      companiesColumns: res1.rows,
      companiesDistribution: res2.rows,
      counts: {
        companies: resComp.rows[0].count,
        users: resUsers.rows[0].count,
        leads: resLeads.rows[0].count
      }
    };

    const backupDir = path.resolve(process.cwd(), 'scratch');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupPath = path.join(backupDir, `db_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    console.log(`\nBackup snapshot created at: ${backupPath}`);

  } catch (err) {
    console.error("Pre-check failed:", err);
  } finally {
    await client.end();
  }
}

runPreCheck();
