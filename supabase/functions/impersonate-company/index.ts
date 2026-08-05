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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // 1. Validate caller session using Anon Client
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Validate caller role using Service Role Client (to read users table)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, email")
      .eq("id", user.id)
      .single();

    // Impersonation is a platform-owner capability, so it must be gated on the
    // platform owner allow-list -- not on `role`.
    //
    // `role: 'founder'` is assigned to whoever signs up and creates a company
    // (src/AuthContext.tsx), so every customer has one. Checking only the role
    // let any customer's founder pass this gate and then name any company_id in
    // the body, receiving a magic link into that tenant as its owner. This is
    // the same allow-list that gates the Founder Hub (hasFounderHubAccess).
    const platformOwners = (Deno.env.get("INTERNAL_TEAM_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Fail closed: an unset allow-list must not read as "everyone".
    if (platformOwners.length === 0) {
      console.error("[impersonate-company] INTERNAL_TEAM_EMAILS is not configured");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const callerEmail = (profile?.email ?? "").toLowerCase();

    if (profileError || !callerEmail || !platformOwners.includes(callerEmail)) {
      console.error("[impersonate-company] Blocked impersonation attempt", {
        caller: user.id,
        callerEmail,
        role: profile?.role,
      });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Extract target company_id from request body
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "Missing company_id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Query target user belonging to company
    // Prefer admin user (role = 'founder') first, fallback to standard user
    let targetUserQuery = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("company_id", company_id)
      .eq("role", "founder")
      .limit(1)
      .maybeSingle();

    if (!targetUserQuery.data) {
      targetUserQuery = await supabaseAdmin
        .from("users")
        .select("id, email")
        .eq("company_id", company_id)
        .limit(1)
        .maybeSingle();
    }

    const targetUser = targetUserQuery.data;
    if (!targetUser) {
      return new Response(JSON.stringify({ error: "No user accounts found for target company" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Generate dynamic login link using Auth Admin API
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email,
      options: {
        redirectTo: `${appUrl}/dashboard`
      }
    });

    if (linkError || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: "Failed to generate impersonation link: " + (linkError?.message || "Invalid payload") }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. Log impersonation event in platform audit logs
    const auditId = `audit-${Math.random().toString(36).substring(2, 9)}`;
    await supabaseAdmin.from("audit_logs").insert([{
      id: auditId,
      company_id: company_id,
      action: "founder.impersonate",
      category: "security",
      target: "company",
      target_id: company_id,
      metadata: {
        admin_id: user.id,
        admin_email: profile.email,
        target_user_id: targetUser.id,
        target_user_email: targetUser.email,
        timestamp: new Date().toISOString()
      }
    }]);

    const actionLink = linkData.properties.action_link;
    const cookieString = `impersonate_token=${encodeURIComponent(actionLink)}; Path=/; Max-Age=300; HttpOnly; Secure; SameSite=Strict`;
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Set-Cookie": cookieString
        } 
      }
    );
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
})
