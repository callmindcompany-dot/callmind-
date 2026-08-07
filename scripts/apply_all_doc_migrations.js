import 'dotenv/config';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function applyAll() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Applying updated plan_limits seed: 20260802000100_plan_limits_seed.sql");
  const sqlSeed = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260802000100_plan_limits_seed.sql'), 'utf8');
  await client.query(sqlSeed);
  console.log("plan_limits seed applied!");

  console.log("Applying documents migration: 20260803000100_documents.sql");
  const sqlDocs = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260803000100_documents.sql'), 'utf8');
  await client.query(sqlDocs);
  console.log("20260803000100_documents.sql applied successfully!");

  await client.end();
}

applyAll().catch(err => {
  console.error("Failed applying migrations:", err);
  process.exit(1);
});
