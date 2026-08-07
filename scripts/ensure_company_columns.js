import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Ensuring company columns exist...");
  await client.query(`
    ALTER TABLE public.companies
      ADD COLUMN IF NOT EXISTS plan             TEXT DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS plan_status      TEXT DEFAULT 'trialing',
      ADD COLUMN IF NOT EXISTS plan_expires_at  TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS seat_limit       INTEGER DEFAULT 2,
      ADD COLUMN IF NOT EXISTS billing_cycle    TEXT DEFAULT 'monthly',
      ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS storage_addon_gb   INTEGER DEFAULT 0;
  `);

  console.log("Columns ensured!");
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
