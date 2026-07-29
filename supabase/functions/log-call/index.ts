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
    const { 
      companyId, 
      userId, 
      leadName, 
      phone, 
      duration, 
      status, 
      type, 
      interest, 
      aiSummary, 
      scheduledTime 
    } = await req.json()

    if (!companyId || !userId || !leadName || !phone || !status || !type) {
      return new Response(JSON.stringify({ error: "Missing required body parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Verify caller is logging their own call
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: Cannot log call on behalf of another user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Call the database function using Admin Client (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error: rpcError } = await supabaseAdmin.rpc("log_manual_call", {
      p_company_id: companyId,
      p_user_id: userId,
      p_user_email: user.email || "",
      p_lead_name: leadName,
      p_phone: phone,
      p_duration: duration || "0m 0s",
      p_status: status,
      p_type: type,
      p_interest: interest || "Pending",
      p_ai_summary: aiSummary,
      p_scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null
    })

    if (rpcError) {
      console.error("[log-call] RPC execution error:", rpcError)
      return new Response(JSON.stringify({ success: false, error: rpcError.message }), {
        status: 200, // Return standard payload response
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err: unknown) {
    console.error(err);
    Sentry.captureException(err);
    const errorMessage = 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
