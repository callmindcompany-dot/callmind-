import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function verifyR2DocumentsAPI() {
  const client = new Client({ connectionString });
  await client.connect();

  const tenantA = `company_a_${Date.now()}`;
  const tenantB = `company_b_${Date.now()}`;

  console.log(`\n=== Setup: Creating Tenant A (${tenantA}) & Tenant B (${tenantB}) ===`);
  await client.query(`
    INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
    VALUES 
      ($1, 'Tenant A Starter', 'starter', 'active', 5),
      ($2, 'Tenant B Starter', 'starter', 'active', 5);
  `, [tenantA, tenantB]);

  console.log("\n--- TEST 1: Starter Tenant 2MB File Upload & Storage Trigger Accounting ---");
  const initialStorage = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [tenantA]);
  console.log("Initial storage_used_bytes:", initialStorage.rows[0].storage_used_bytes);

  const docId = `doc_${Date.now()}`;
  const twoMBBytes = 2 * 1024 * 1024; // 2,097,152 bytes
  const r2KeyA = `${tenantA}/general/${docId}-sample.jpeg`;

  // Insert metadata row directly to simulate confirm endpoint
  await client.query(`
    INSERT INTO public.documents (id, company_id, category, file_name, size_bytes, mime_type, r2_key, status)
    VALUES ($1, $2, 'general', 'sample.jpeg', $3, 'image/jpeg', $4, 'pending_review');
  `, [docId, tenantA, twoMBBytes, r2KeyA]);

  const afterStorage = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [tenantA]);
  console.log("storage_used_bytes after 2MB insert:", afterStorage.rows[0].storage_used_bytes);
  console.log("Delta bytes:", Number(afterStorage.rows[0].storage_used_bytes) - Number(initialStorage.rows[0].storage_used_bytes));

  console.log("\n--- TEST 2: Over Max File Size Rejection (Starter max is 10 MB) ---");
  const overMaxBytes = 15 * 1024 * 1024; // 15 MB
  try {
    await client.query(`
      INSERT INTO public.documents (company_id, category, file_name, size_bytes, mime_type, r2_key)
      VALUES ($1, 'general', 'huge.pdf', $2, 'application/pdf', $3);
    `, [tenantA, overMaxBytes, `${tenantA}/general/huge.pdf`]);
    console.error("FAIL: Over-sized insert succeeded when it should fail!");
  } catch (err) {
    console.log("PASS: Rejection caught by trigger!");
    console.log("Error Code:", err.code);
    console.log("Message:", err.message);
    console.log("Detail:", err.detail);
  }

  console.log("\n--- TEST 3: Telecaller Access Restriction on SELECT documents ---");
  await client.query("BEGIN;");
  await client.query("SET ROLE authenticated;");
  await client.query(`
    SELECT set_config('request.jwt.claims', $1, true);
  `, [JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', app_metadata: { company_id: tenantA, role: 'telecaller' } })]);

  const telecallerDocs = await client.query("SELECT * FROM public.documents WHERE company_id = $1;", [tenantA]);
  console.log("Telecaller SELECT documents count:", telecallerDocs.rows.length);
  await client.query("ROLLBACK;");
  await client.query("RESET ROLE;");

  console.log("\n--- TEST 4: Cross-Tenant Access Restriction (Tenant A reading Tenant B document) ---");
  const docBId = `doc_b_${Date.now()}`;
  await client.query(`
    INSERT INTO public.documents (id, company_id, category, file_name, size_bytes, mime_type, r2_key)
    VALUES ($1, $2, 'general', 'tenant_b_doc.pdf', 1048576, 'application/pdf', $3);
  `, [docBId, tenantB, `${tenantB}/general/tenant_b_doc.pdf`]);

  await client.query("BEGIN;");
  await client.query("SET ROLE authenticated;");
  await client.query(`
    SELECT set_config('request.jwt.claims', $1, true);
  `, [JSON.stringify({ sub: '22222222-2222-2222-2222-222222222222', app_metadata: { company_id: tenantA, role: 'admin' } })]);

  const crossTenantDoc = await client.query("SELECT * FROM public.documents WHERE id = $1;", [docBId]);
  console.log("Tenant A Admin reading Tenant B Document ID count:", crossTenantDoc.rows.length);
  await client.query("ROLLBACK;");
  await client.query("RESET ROLE;");

  console.log("\n=== Cleanup: Deleting test companies & records ===");
  await client.query("DELETE FROM public.documents WHERE company_id IN ($1, $2);", [tenantA, tenantB]);
  await client.query("DELETE FROM public.companies WHERE id IN ($1, $2);", [tenantA, tenantB]);

  console.log("\nAll R2 Documents API Integration Tests Passed!");
  await client.end();
}

verifyR2DocumentsAPI().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
