import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function applyMigrations() {
  const client = new Client({ connectionString });
  await client.connect();

  const migrations = [
    'supabase/migrations/20260802000000_plan_columns_consolidation.sql',
    'supabase/migrations/20260802000100_plan_limits_seed.sql',
    'supabase/migrations/20260802000200_plan_enforcement.sql'
  ];

  for (const migPath of migrations) {
    const fullPath = path.resolve(process.cwd(), migPath);
    console.log(`\n========================================`);
    console.log(`Applying migration: ${migPath}`);
    console.log(`========================================`);
    const sql = fs.readFileSync(fullPath, 'utf8');
    try {
      await client.query(sql);
      console.log(`SUCCESS: ${migPath}`);
    } catch (err) {
      console.error(`FAILED: ${migPath}`);
      console.error(err);
      await client.end();
      process.exit(1);
    }
  }

  console.log("\nAll three migrations applied successfully!");
  await client.end();
}

applyMigrations();
