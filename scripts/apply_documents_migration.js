import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = "postgresql://postgres:Vrushabh09%40@db.aojhpnrkmunstzjvvppb.supabase.co:5432/postgres";

async function applyDocumentsMigration() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Applying Documents Schema Migration: 20260803000100_documents.sql");
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'supabase/migrations/20260803000100_documents.sql'), 'utf8');
  
  try {
    await client.query(sql);
    console.log("SUCCESS: 20260803000100_documents.sql migration applied cleanly!");
  } catch (err) {
    console.error("FAILED 20260803000100_documents.sql migration:", err);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

applyDocumentsMigration();
