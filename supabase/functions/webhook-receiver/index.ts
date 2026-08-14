import { Sentry } from "../_shared/sentry.ts";
/**
 * webhook-receiver  –  Supabase Edge Function
 *
 * Inbound webhook listener for third-party integrations (e.g. Zapier, Make, custom scripts)
 * and Google Ads Lead Form extensions.
 * Receives JSON lead payloads, validates HMAC signature or Google Verify Token, parses fields,
 * creates leads, and records sync history.
 */

import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
import { startRun, finishRun, type RunHandle, type RunOutcome } from "../_shared/runLog.ts";
import { pickAssignee } from "../_shared/assignLead.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// Helper to compute HMAC SHA256 signature in Deno
async function verifySignature(secret: string, payload: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(payload)

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )

    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    )

    return await crypto.subtle.verify(
      "HMAC",
      cryptoKey,
      signatureBuffer,
      messageData
    )
  } catch (err) {
    Sentry.captureException(err);
    console.error("Signature verification error:", err)
    return false
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://callmind.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-callmind-signature",
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

  // Opened once the sender is identified, closed in the finally below so a
  // rejected signature and a dropped payload are recorded as well as a
  // successful one -- those are the runs somebody will come looking for.
  let run: RunHandle | null = null
  let runSupabase: ReturnType<typeof createClient> | null = null
  let runOutcome: RunOutcome = "failed"
  let runError: string | undefined
  let runCreated = 0
  let runDuplicate = 0

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    runSupabase = supabase

    // Extract company ID from path (e.g. /webhook-receiver/[company_id])
    const url = new URL(req.url)
    const companyId = url.pathname.split("/").pop()
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Company ID is required in path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Fetch configurations.
    //
    // This selected webhook_config and googleads_config from team_settings.
    // Neither column has ever existed there, so the query failed and every
    // inbound webhook was answered "Company settings not found" -- which took
    // down the one lead path that does not depend on a scheduler. Website form
    // submissions, custom webhooks and Google Ads lead forms were all lost at
    // this line.
    //
    // Credentials moved to integration_credentials in
    // 20260819000100_integration_credentials.sql; field_aliases is a mapping
    // rather than a secret and stays on team_settings with the other lead
    // preferences.
    const [credsRes, prefsRes] = await Promise.all([
      supabase
        .from("integration_credentials")
        .select("provider, config, is_active")
        .eq("company_id", companyId)
        .in("provider", ["webhook", "googleads"]),
      supabase
        .from("team_settings")
        .select("field_aliases")
        .eq("company_id", companyId)
        .maybeSingle(),
    ])

    if (credsRes.error || prefsRes.error) {
      return new Response(
        JSON.stringify({ success: false, error: "Company settings could not be read" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const credentialFor = (provider: string) => {
      const row = (credsRes.data || []).find((r) => r.provider === provider)
      if (!row || row.is_active === false) return null
      return (row.config || {}) as Record<string, unknown>
    }

    const settings = {
      webhook_config: credentialFor("webhook"),
      googleads_config: credentialFor("googleads"),
      field_aliases: prefsRes.data?.field_aliases ?? {},
    }

    const rawBody = await req.text()
    const signature = req.headers.get("X-CallMind-Signature") || ""

    // 2. Parse JSON Body
    let payload: Record<string, any> = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let name = ""
    let phone = ""
    let email = ""
    let city = ""
    let budget = ""
    let propPref = ""
    const extras: Record<string, unknown> = {}
    let source = "Webhook"

    // 3. Determine if Google Ads payload
    //
    // The shape decides which provider this run belongs to, so the run is
    // opened here -- before the verify-token check below, so a rejected token
    // is recorded rather than vanishing.
    if (Array.isArray(payload.user_column_data)) source = "GoogleAds"
    run = await startRun(
      supabase,
      companyId,
      source === "GoogleAds" ? "googleads" : "webhook",
      "push",
    )

    if (Array.isArray(payload.user_column_data)) {

      // Validate Google Ads Verify Token
      const gConfig = settings.googleads_config as { googleVerifyToken?: string; isActive?: boolean } | null
      if (gConfig?.googleVerifyToken) {
        const gKey = String(payload.google_key || "")
        if (gKey !== gConfig.googleVerifyToken) {
          runError = "Invalid Google Ads verify token"
          return new Response(
            JSON.stringify({ success: false, error: "Invalid Google Ads verify token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }

      // Parse Google Ads lead structure
      for (const col of payload.user_column_data) {
        const colId = String(col.column_id || "").toUpperCase()
        const colName = String(col.column_name || "").toLowerCase()
        const val = String(col.string_value || "")

        if (colId === "FULL_NAME" || colName.includes("name")) {
          name = val
        } else if (colId === "PHONE_NUMBER" || colName.includes("phone") || colName.includes("mobile")) {
          phone = val
        } else if (colId === "EMAIL" || colName.includes("email") || colName.includes("mail")) {
          email = val
        } else if (colId === "CITY" || colName.includes("city")) {
          city = val
        } else {
          extras[col.column_name || col.column_id] = val
        }
      }
      if (payload.campaign_id) extras["google_campaign_id"] = payload.campaign_id
      if (payload.form_id) extras["google_form_id"] = payload.form_id
    } else {
      // Normal Webhook Signature Verification
      const webhookConfig = settings.webhook_config as { secret?: string } | null
      if (webhookConfig?.secret && signature) {
        const isValid = await verifySignature(webhookConfig.secret, rawBody, signature)
        if (!isValid) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid webhook signature" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
      }

      // Normalize standard keys using field aliases
      const aliases = (settings.field_aliases as Record<string, string[]>) || {}
      const findMappedValue = (fieldKey: string, defaultKeys: string[]): string => {
        const allowedKeys = new Set([...defaultKeys, ...(aliases[fieldKey] || [])].map(k => k.toLowerCase().replace(/[^a-z0-9]/g, "")))
        for (const [k, v] of Object.entries(payload)) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, "")
          if (allowedKeys.has(cleanK)) {
            return String(v)
          }
        }
        return ""
      }

      name = findMappedValue("name", ["name", "fullname", "customername", "client"])
      phone = findMappedValue("phone", ["phone", "mobile", "contact", "phonenumber", "cell"])
      email = findMappedValue("email", ["email", "emailaddress", "mail"])
      city = findMappedValue("city", ["city", "location", "address"])
      budget = findMappedValue("budget", ["budget", "price", "investment", "pricelimit"])
      propPref = findMappedValue("propertyPreference", ["property", "propertypreference", "preference", "unit"])

      for (const [k, v] of Object.entries(payload)) {
        const lowercaseK = k.toLowerCase()
        if (
          !lowercaseK.includes("name") &&
          !lowercaseK.includes("phone") &&
          !lowercaseK.includes("mobile") &&
          !lowercaseK.includes("email") &&
          !lowercaseK.includes("city") &&
          !lowercaseK.includes("budget") &&
          !lowercaseK.includes("property")
        ) {
          extras[k] = v
        }
      }
    }

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 4. Check for duplicates
    const cleanPhone = phone.replace(/\D/g, "").slice(-10)
    const { data: duplicate } = await supabase
      .from("leads")
      .select("id")
      .eq("company_id", companyId)
      .eq("phone", phone)
      .eq("is_deleted", false)
      .maybeSingle()

    if (duplicate) {
      // A duplicate is a normal outcome, not a failure -- the sender did
      // nothing wrong and nothing is broken. Recording it as failed would put
      // a red mark on a healthy source every time a customer enquires twice.
      runOutcome = "success"
      runDuplicate = 1
      return new Response(
        JSON.stringify({ success: false, error: "Duplicate lead detected" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 5. Create new lead
    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        name: name || `${source} Lead`,
        phone: phone,
        email: email || null,
        city: city || null,
        estimated_budget: budget || null,
        description: propPref || null,
        notes: Object.entries(extras).map(([k, v]) => `${k}: ${v}`).join(" | ") || `Inbound ${source} Lead`,
        source: source,
        status: "New Lead",
        company_id: companyId,
        // Was the literal "unassigned". The Routing setting says it circulates
        // leads among telecallers; this path ignored it entirely.
        assigned_to: await pickAssignee(supabase, companyId, source),
        is_deleted: false,
        is_unseen: true,
      })
      .select("id")
      .single()

    if (insertError) throw insertError

    // 6. Update sync stats for Google Ads (if applicable)
    if (source === "GoogleAds") {
      const gConfig = (settings.googleads_config || {}) as Record<string, unknown>
      await supabase
        .from("integration_credentials")
        .update({
          config: {
            ...gConfig,
            lastSyncedAt: new Date().toISOString(),
            lastSyncCount: typeof gConfig.lastSyncCount === "number" ? gConfig.lastSyncCount + 1 : 1,
            lastSyncErrors: [],
          },
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("provider", "googleads")
    }

    // 7. Log history
    await supabase.from("import_logs").insert({
      company_id: companyId,
      filename: `${source} Webhook Ingestion (${new Date().toLocaleDateString("en-IN")})`,
      row_count: 1,
      status: "completed",
    })

    await supabase.from("audit_logs").insert({
      company_id: companyId,
      action: `${source.toUpperCase()}_LEAD_RECEIVED`,
      category: "integration",
      target: `${source} Webhook Receiver`,
      details: `Lead imported successfully: ${name} (${phone})`,
      timestamp: new Date().toISOString(),
    })

    runOutcome = "success"
    runCreated = 1

    return new Response(
      JSON.stringify({ success: true, lead_id: newLead.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err: unknown) {
    console.error(err);
    Sentry.captureException(err);
    runError = String((err as { message?: string })?.message ?? err)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } finally {
    // Every path that got far enough to identify the sender is recorded,
    // including the ones that returned early. A webhook that was rejected is
    // precisely what somebody will be looking for later.
    if (run && runSupabase) {
      await finishRun(runSupabase, run, {
        outcome: runOutcome,
        leadsCreated: runCreated,
        leadsDuplicate: runDuplicate,
        error: runError,
      })
    }
  }
})
