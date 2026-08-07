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

  console.log("Creating get_company_limits function...");
  await client.query(`
    CREATE OR REPLACE FUNCTION public.get_company_limits(p_company_id TEXT)
    RETURNS public.plan_limits
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $$
      SELECT pl.*
      FROM public.companies c
      JOIN public.plan_limits pl
        ON pl.id = CASE
                     WHEN c.plan_status IN ('expired', 'cancelled') THEN 'trial'
                     ELSE COALESCE(c.plan, 'trial')
                   END
      WHERE c.id = p_company_id;
    $$;

    REVOKE ALL ON FUNCTION public.get_company_limits(TEXT) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.get_company_limits(TEXT) TO authenticated, service_role;
  `);

  console.log("get_company_limits created successfully!");
  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
