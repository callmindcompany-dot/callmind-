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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract company ID from path (e.g. /webhook-receiver/[company_id])
    const url = new URL(req.url)
    const companyId = url.pathname.split("/").pop()
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Company ID is required in path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 1. Fetch configurations
    const { data: settings, error: fetchError } = await supabase
      .from("team_settings")
      .select("webhook_config, googleads_config, field_aliases")
      .eq("company_id", companyId)
      .maybeSingle()

    if (fetchError || !settings) {
      return new Response(
        JSON.stringify({ success: false, error: "Company settings not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
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
    if (Array.isArray(payload.user_column_data)) {
      source = "GoogleAds"

      // Validate Google Ads Verify Token
      const gConfig = settings.googleads_config as { googleVerifyToken?: string; isActive?: boolean } | null
      if (gConfig?.googleVerifyToken) {
        const gKey = String(payload.google_key || "")
        if (gKey !== gConfig.googleVerifyToken) {
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
        assigned_to: "unassigned",
        is_deleted: false,
        is_unseen: true,
      })
      .select("id")
      .single()

    if (insertError) throw insertError

    // 6. Update sync stats for Google Ads (if applicable)
    if (source === "GoogleAds") {
      const gConfig = settings.googleads_config as { googleWebhookUrl?: string; googleVerifyToken?: string; isActive?: boolean } | null
      await supabase
        .from("team_settings")
        .update({
          googleads_config: {
            ...gConfig,
            lastSyncedAt: new Date().toISOString(),
            lastSyncCount: (gConfig as any)?.lastSyncCount ? (gConfig as any).lastSyncCount + 1 : 1,
            lastSyncErrors: [],
          }
        })
        .eq("company_id", companyId)
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

    return new Response(
      JSON.stringify({ success: true, lead_id: newLead.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (err: unknown) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
