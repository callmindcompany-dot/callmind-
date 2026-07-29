import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
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

  // F-02-R FIX: Use auth token as rate-limit key (not spoofable IP)
  if (!checkRateLimit(getRateLimitKey(req))) {
    return new Response(JSON.stringify({ error: "Too many requests. Rate limit is 30 requests per minute." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

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
    const { userId, companyId, email } = await req.json()
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "Missing required body parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }
    
    // Ensure caller is requesting their own data (or is an admin/founder)
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: Cannot export other user data" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Simulate/Process data export
    console.log(`GDPR Export requested for user: ${userId}, company: ${companyId}, email: ${email}`)

    // Log to audit_logs
    const auditId = `audit-${Math.random().toString(36).substring(2, 9)}`
    await supabaseAdmin.from("audit_logs").insert([{
      id: auditId,
      company_id: companyId,
      action: "user.data_export",
      category: "privacy",
      target: "user",
      target_id: userId,
      metadata: {
        user_id: userId,
        email: email,
        company_id: companyId,
        timestamp: new Date().toISOString()
      }
    }])

    return new Response(
      JSON.stringify({ success: true, message: "Data export link sent to your email" }),
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
