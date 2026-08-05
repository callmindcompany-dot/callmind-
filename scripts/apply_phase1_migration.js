import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = "postgresql://postgres:Vrushabh09%40@db.aojhpnrkmunstzjvvppb.supabase.co:5432/postgres";

async function applyPhase1() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Applying Phase 1 Migration: 20260803000000_document_storage_phase1.sql");
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260803000000_document_storage_phase1.sql'), 'utf8');
  
  try {
    await client.query(sql);
    console.log("SUCCESS: Phase 1 migration applied cleanly!");
  } catch (err) {
    console.error("FAILED Phase 1 migration:", err);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

applyPhase1();
