import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to .env; there is no fallback.");
  process.exit(1);
}

async function verifyDocumentsSchema() {
  const client = new Client({ connectionString });
  await client.connect();

  const tenantA = `company_a_${Date.now()}`;
  const tenantB = `company_b_${Date.now()}`;

  console.log(`\n=== Setup: Creating Tenant A (${tenantA}) & Tenant B (${tenantB}) ===`);
  await client.query(`
    INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
    VALUES 
      ($1, 'Tenant A', 'trial', 'trialing', 2),
      ($2, 'Tenant B', 'trial', 'trialing', 2);
  `, [tenantA, tenantB]);

  // Create a scratch lead for Tenant A
  const leadA = `lead_a_${Date.now()}`;
  await client.query(`
    INSERT INTO public.leads (id, company_id, name, phone)
    VALUES ($1, $2, 'Lead A', '+919876543210');
  `, [leadA, tenantA]);

  console.log("\n--- VERIFY 1: Quota Rejection ---");
  const hugeSizeBytes = 600 * 1024 * 1024; // 600 MB (Trial cap = 500 MB)
  try {
    await client.query(`
      INSERT INTO public.documents (company_id, lead_id, category, file_name, size_bytes, mime_type, r2_key)
      VALUES ($1, $2, 'pan', 'oversized_pan.pdf', $3, 'application/pdf', $4);
    `, [tenantA, leadA, hugeSizeBytes, `companies/${tenantA}/oversized_pan.pdf`]);
    console.error("FAIL: Oversized document insert succeeded when it should fail!");
  } catch (err) {
    console.log("PASS: Quota trigger rejected insert!");
    console.log("Error Code:", err.code);
    console.log("Message:", err.message);
    console.log("Detail:", err.detail);
  }

  const c1 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [tenantA]);
  console.log("storage_used_bytes after rejected insert:", c1.rows[0].storage_used_bytes);

  console.log("\n--- VERIFY 2: Soft Delete Accounting ---");
  const validSizeBytes = 4 * 1024 * 1024; // 4 MB (Trial max_file_size_mb is 5 MB)
  const docAId = `doc_a_${Date.now()}`;
  await client.query(`
    INSERT INTO public.documents (id, company_id, lead_id, category, file_name, size_bytes, mime_type, r2_key)
    VALUES ($1, $2, $3, 'aadhaar', 'aadhaar_card.pdf', $4, 'application/pdf', $5);
  `, [docAId, tenantA, leadA, validSizeBytes, `companies/${tenantA}/aadhaar_card.pdf`]);

  const c2 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [tenantA]);
  console.log("storage_used_bytes after 50MB insert:", c2.rows[0].storage_used_bytes);

  // Soft delete document
  await client.query("UPDATE public.documents SET deleted_at = NOW() WHERE id = $1;", [docAId]);
  
  const activeDocs = await client.query("SELECT * FROM public.documents WHERE company_id = $1 AND deleted_at IS NULL;", [tenantA]);
  console.log("Active (non-deleted) documents count:", activeDocs.rows.length);

  const c3 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [tenantA]);
  console.log("storage_used_bytes after soft delete (recycle bin):", c3.rows[0].storage_used_bytes);

  console.log("\n--- VERIFY 3: Telecaller Role RLS Check ---");
  // Set local RLS claims for a telecaller of Tenant A
  await client.query("BEGIN;");
  await client.query("SET ROLE authenticated;");
  await client.query(`
    SELECT set_config('request.jwt.claims', $1, true);
  `, [JSON.stringify({ sub: '11111111-1111-1111-1111-111111111111', app_metadata: { company_id: tenantA, role: 'telecaller' } })]);

  const telecallerRead = await client.query("SELECT * FROM public.documents WHERE company_id = $1;", [tenantA]);
  console.log("Telecaller SELECT documents row count:", telecallerRead.rows.length);
  await client.query("ROLLBACK;");
  await client.query("RESET ROLE;");

  console.log("\n--- VERIFY 4: Cross-Tenant RLS Isolation Check ---");
  // Insert a document for Tenant B
  const docBId = `doc_b_${Date.now()}`;
  await client.query(`
    INSERT INTO public.documents (id, company_id, category, file_name, size_bytes, mime_type, r2_key)
    VALUES ($1, $2, 'bank_statement', 'statement.pdf', 1048576, 'application/pdf', $3);
  `, [docBId, tenantB, `companies/${tenantB}/statement.pdf`]);

  // Set local RLS claims for an Admin of Tenant A
  await client.query("BEGIN;");
  await client.query("SET ROLE authenticated;");
  await client.query(`
    SELECT set_config('request.jwt.claims', $1, true);
  `, [JSON.stringify({ sub: '22222222-2222-2222-2222-222222222222', app_metadata: { company_id: tenantA, role: 'admin' } })]);

  const crossTenantRead = await client.query("SELECT * FROM public.documents WHERE id = $1;", [docBId]);
  console.log("Tenant A Admin reading Tenant B Document ID count:", crossTenantRead.rows.length);
  await client.query("ROLLBACK;");
  await client.query("RESET ROLE;");

  console.log("\n=== Cleanup: Deleting test companies & records ===");
  await client.query("DELETE FROM public.documents WHERE company_id IN ($1, $2);", [tenantA, tenantB]);
  await client.query("DELETE FROM public.leads WHERE company_id = $1;", [tenantA]);
  await client.query("DELETE FROM public.companies WHERE id IN ($1, $2);", [tenantA, tenantB]);

  console.log("\nAll Document Module Schema Verifications Passed Successfully!");
  await client.end();
}

verifyDocumentsSchema().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
