import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function checkCron() {
  const client = new Client({ connectionString });
  await client.connect();
  const res = await client.query("SELECT * FROM pg_extension WHERE extname = 'pg_cron';");
  console.log('pg_cron extension count:', res.rows.length);
  if (res.rows.length > 0) {
    console.log('pg_cron details:', res.rows[0]);
  }
  await client.end();
}

checkCron().catch(console.error);
