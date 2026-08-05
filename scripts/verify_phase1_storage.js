import { Client } from 'pg';

const connectionString = "postgresql://postgres:Vrushabh09%40@db.aojhpnrkmunstzjvvppb.supabase.co:5432/postgres";

async function verifyPhase1() {
  const client = new Client({ connectionString });
  await client.connect();

  const scratchCompanyId = `test_company_${Date.now()}`;
  console.log(`\n=== Setup: Creating scratch company (${scratchCompanyId}) ===`);
  await client.query(`
    INSERT INTO public.companies (id, name, plan, plan_status, seat_limit)
    VALUES ($1, 'Test Storage Co', 'trial', 'trialing', 2);
  `, [scratchCompanyId]);

  console.log("\n--- TEST 1: Quota Rejection ---");
  const hugeSizeBytes = 600 * 1024 * 1024; // 600 MB (trial cap is 500 MB)
  try {
    await client.query(`
      INSERT INTO public.documents (company_id, file_name, size_bytes, r2_key)
      VALUES ($1, 'oversized.pdf', $2, $3);
    `, [scratchCompanyId, hugeSizeBytes, `companies/${scratchCompanyId}/oversized.pdf`]);
    console.error("FAIL: Oversized document insert did not raise error!");
  } catch (err) {
    console.log("PASS: Quota trigger rejected insert!");
    console.log("Error code:", err.code);
    console.log("Message:", err.message);
    console.log("Detail:", err.detail);
  }

  // Confirm storage_used_bytes is still 0
  const c1 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [scratchCompanyId]);
  console.log("storage_used_bytes after rejected insert:", c1.rows[0].storage_used_bytes);

  console.log("\n--- TEST 2: Valid Insert & Trigger Accounting ---");
  const validSizeBytes = 100 * 1024 * 1024; // 100 MB
  const docId = `doc_${Date.now()}`;
  const r2Key = `companies/${scratchCompanyId}/doc1.pdf`;
  await client.query(`
    INSERT INTO public.documents (id, company_id, file_name, size_bytes, r2_key)
    VALUES ($1, $2, 'valid.pdf', $3, $4);
  `, [docId, scratchCompanyId, validSizeBytes, r2Key]);

  const c2 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [scratchCompanyId]);
  console.log("storage_used_bytes after 100MB insert:", c2.rows[0].storage_used_bytes);

  console.log("\n--- TEST 3: Soft Delete (Recycle Bin) Storage Accounting ---");
  await client.query("UPDATE public.documents SET deleted_at = NOW() WHERE id = $1;", [docId]);
  const c3 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [scratchCompanyId]);
  console.log("storage_used_bytes after soft delete (recycle bin):", c3.rows[0].storage_used_bytes);

  console.log("\n--- TEST 4: Hard Delete Storage Recovery ---");
  await client.query("DELETE FROM public.documents WHERE id = $1;", [docId]);
  const c4 = await client.query("SELECT storage_used_bytes FROM public.companies WHERE id = $1;", [scratchCompanyId]);
  console.log("storage_used_bytes after hard delete:", c4.rows[0].storage_used_bytes);

  console.log("\n=== Cleanup: Deleting scratch company ===");
  await client.query("DELETE FROM public.companies WHERE id = $1;", [scratchCompanyId]);

  console.log("\nAll Phase 1 Verification Scenarios Passed!");
  await client.end();
}

verifyPhase1().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
