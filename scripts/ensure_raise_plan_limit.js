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

  console.log("Creating raise_plan_limit function...");
  await client.query(`
    CREATE OR REPLACE FUNCTION public.raise_plan_limit(
      p_metric  TEXT,
      p_used    BIGINT,
      p_limit   BIGINT,
      p_message TEXT
    )
    RETURNS VOID
    LANGUAGE plpgsql
    VOLATILE
    AS $$
    BEGIN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = p_message,
        DETAIL  = json_build_object(
          'code',   'PLAN_LIMIT',
          'metric', p_metric,
          'used',   p_used,
          'limit',  p_limit
        )::text;
    END;
    $$;
  `);

  console.log("raise_plan_limit created successfully!");
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
