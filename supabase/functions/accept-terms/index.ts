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
    const { userId, companyId, pageSlug, version, language } = await req.json()
    if (!userId || !pageSlug || !version) {
      return new Response(JSON.stringify({ error: "Missing required body parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Ensure caller is accepting terms for themselves
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden: Cannot accept terms for another user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get client IP address
    const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0].trim()
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || "127.0.0.1";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the target published legal page content for backup snapshot
    let { data: pageData, error: pageError } = await supabaseAdmin
      .from("legal_pages")
      .select("content")
      .eq("slug", pageSlug)
      .eq("version", version)
      .eq("language", language || "English")
      .eq("status", "published")
      .maybeSingle()

    // Fallback if translation version doesn't exist but master English exists
    if (!pageData && language !== "English") {
      const { data: engData } = await supabaseAdmin
        .from("legal_pages")
        .select("content")
        .eq("slug", pageSlug)
        .eq("version", version)
        .eq("language", "English")
        .eq("status", "published")
        .maybeSingle()
      
      if (engData) {
        pageData = engData
      }
    }

    // Insert user acceptance with snapshot and real client IP
    const { data: acceptanceRecord, error: insertError } = await supabaseAdmin
      .from("user_acceptances")
      .insert([{
        user_id: userId,
        company_id: companyId || null,
        page_slug: pageSlug,
        version,
        ip_address: clientIp,
        accepted_content: pageData?.content || null
      }])
      .select()
      .single()

    if (insertError) throw insertError

    console.log(`Accepted terms: user=${userId}, page=${pageSlug}, version=${version}, ip=${clientIp}`)

    return new Response(
      JSON.stringify(acceptanceRecord),
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
