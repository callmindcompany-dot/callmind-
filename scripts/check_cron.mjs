import { Client } from 'pg';

const connectionString = "postgresql://postgres:Vrushabh09%40@db.aojhpnrkmunstzjvvppb.supabase.co:5432/postgres";

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
