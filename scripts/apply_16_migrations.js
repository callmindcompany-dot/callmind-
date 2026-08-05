import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Vrushabh09%40@db.aojhpnrkmunstzjvvppb.supabase.co:5432/postgres";

const MIGRATIONS = [
  '20260801000000_enterprise_notification_center.sql',
  '20260801010000_enterprise_global_search.sql',
  '20260801020000_enterprise_branch_hierarchy.sql',
  '20260801030000_attendance_and_targets_rls.sql',
  '20260802000000_plan_columns_consolidation.sql',
  '20260802000100_plan_limits_seed.sql',
  '20260802000200_plan_enforcement.sql',
  '20260803000000_document_storage_phase1.sql',
  '20260803000100_documents.sql',
  '20260804000000_security_rls_remediation.sql',
  '20260805000000_lead_sla_reassignment.sql',
  '20260806000000_call_idempotency.sql',
  '20260807000000_attendance_gps.sql',
  '20260808000000_integration_health.sql',
  '20260809000000_whatsapp_inbox.sql',
  '20260810000000_rbac_permissions.sql'
];

async function applyMigrations() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("=== APPLYING 16 MIGRATIONS IN STRICT SEQUENCE ===\n");
  const appliedLog = [];

  for (const filename of MIGRATIONS) {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', filename);
    if (!fs.existsSync(filePath)) {
      console.error(`[ERROR] File not found: ${filePath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Applying: ${filename}...`);

    try {
      await client.query(sql);
      console.log(`  -> SUCCESS: ${filename}`);
      appliedLog.push({ filename, status: 'SUCCESS' });
    } catch (err) {
      console.error(`\n[CRITICAL FAILURE] Migration failed: ${filename}`);
      console.error(`Error details:`, err.message);
      console.error(`Code:`, err.code);
      console.error(`Detail:`, err.detail);
      console.error(`Position:`, err.position);
      appliedLog.push({ filename, status: 'FAILED', error: err.message });
      console.log("\nSTOPPING EXECUTION IMMEDIATELY AS INSTRUCTED.");
      await client.end();
      process.exit(1);
    }
  }

  console.log("\n=== ALL 16 MIGRATIONS APPLIED SUCCESSFULLY ===\n");

  console.log("=== RUNNING POST-MIGRATION VERIFICATION QUERIES ===\n");

  try {
    // 1. plan_limits
    const q1 = await client.query(`
      SELECT id, monthly_price, annual_price, max_seats, storage_gb_per_seat, storage_flat_mb
      FROM public.plan_limits ORDER BY monthly_price;
    `);
    console.log("--- 1. public.plan_limits ---");
    console.table(q1.rows);

    // 2. Triggers (trg_*)
    const q2 = await client.query(`
      SELECT tgname, tgrelid::regclass FROM pg_trigger
      WHERE NOT tgisinternal AND tgname LIKE 'trg_%' ORDER BY 2, 1;
    `);
    console.log("\n--- 2. Triggers (trg_*) ---");
    console.table(q2.rows);

    // 3. Security definer functions
    const q3 = await client.query(`
      SELECT proname, prosecdef, proconfig FROM pg_proc
      WHERE proname IN ('get_company_limits','consume_ai_credit','enforce_seat_limit',
                        'enforce_lead_limit','protect_billing_columns',
                        'enforce_storage_limit','update_company_storage_used');
    `);
    console.log("\n--- 3. Function Security (prosecdef & proconfig) ---");
    console.table(q3.rows);

    // 4. Document tables
    const q4 = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name LIKE 'document%';
    `);
    console.log("\n--- 4. Document Tables ---");
    console.table(q4.rows);

    // 5. lead_sources check
    const q5 = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name = 'lead_sources';
    `);
    console.log("\n--- 5. lead_sources table check ---");
    console.log(`lead_sources table exists: ${q5.rows.length > 0 ? 'YES' : 'NO'}`);

    // 6. Post row counts
    const cComp = await client.query("SELECT count(*) FROM public.companies;");
    const cUsers = await client.query("SELECT count(*) FROM public.users;");
    const cLeads = await client.query("SELECT count(*) FROM public.leads;");
    console.log("\n--- 6. Post-migration Row Counts ---");
    console.log(`public.companies: ${cComp.rows[0].count}`);
    console.log(`public.users:     ${cUsers.rows[0].count}`);
    console.log(`public.leads:     ${cLeads.rows[0].count}`);

  } catch (verErr) {
    console.error("Verification query error:", verErr);
  } finally {
    await client.end();
  }
}

applyMigrations();
