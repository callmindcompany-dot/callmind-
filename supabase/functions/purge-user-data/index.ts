import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://callmind.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Rate Limiting Enforcement (Max 30 requests/minute per user)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
  
  if (!checkRateLimit(authHeader)) {
    return new Response(JSON.stringify({ error: "Too many requests. Rate limit is 30 requests per minute." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {


    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    // Validate caller session using Anon Client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Extract body parameters
    const { userId, companyId } = await req.json()
    if (!userId || !companyId) {
      return new Response(JSON.stringify({ error: "Missing required body parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }
    
    // Ensure caller is requesting their own data deletion
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: Cannot delete other user data" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Nullify lead assignments (leads are company data, not user PII)
    const { error: leadsErr } = await supabaseAdmin.from("leads")
      .update({ assigned_to: null })
      .eq("company_id", companyId).eq("assigned_to", userId);
    if (leadsErr) throw leadsErr;

    // 2. Delete call logs created by this user
    const { error: callsErr } = await supabaseAdmin.from("calls").delete()
      .eq("company_id", companyId).eq("created_by", userId);
    if (callsErr) throw callsErr;

    // 3. Delete attendance records (direct PII)
    const { error: attendanceErr } = await supabaseAdmin.from("attendance_logs").delete()
      .eq("company_id", companyId).eq("user_id", userId);
    if (attendanceErr) throw attendanceErr;

    // 4. Delete audit_log entries referencing this user
    const { error: auditLogsErr } = await supabaseAdmin.from("audit_logs").delete()
      .eq("company_id", companyId).contains("metadata", { user_id: userId });
    if (auditLogsErr) throw auditLogsErr;

    // 5. Anonymize users row FIRST (before auth delete)
    // Critical ordering: if auth delete succeeds but this fails, the row becomes an
    // uncleanable orphan with real PII. Anonymize first so PII is cleared regardless.
    const { error: userUpdateErr } = await supabaseAdmin
      .from("users")
      .update({
        email: `purged-${userId}@deleted.callmind`,
        name: "Deleted User",
        phone: null
      })
      .eq("id", userId);
    if (userUpdateErr) throw userUpdateErr;

    // 6. Delete auth user last (irreversible — only after all DB cleanup succeeds)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw authErr;

    // Log to audit_logs
    const auditId = `audit-${Math.random().toString(36).substring(2, 9)}`
    await supabaseAdmin.from("audit_logs").insert([{
      id: auditId,
      company_id: companyId,
      action: "user.data_purge",
      category: "privacy",
      target: "user",
      target_id: userId,
      metadata: {
        user_id: userId,
        company_id: companyId,
        timestamp: new Date().toISOString()
      }
    }])

    return new Response(
      JSON.stringify({ success: true, message: "All data permanently deleted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
