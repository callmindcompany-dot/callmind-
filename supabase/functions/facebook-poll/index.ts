import { Sentry } from "../_shared/sentry.ts";
/**
 * facebook-poll  –  Supabase Edge Function
 *
 * Polls the Facebook Graph API for lead form submissions for active setups.
 * Can be invoked:
 *   a) on a cron via pg_cron / external scheduler
 *   b) manually from the admin panel via supabase.functions.invoke()
 *
 * Flow:
 *   1. Fetch all team_settings rows with active facebook_config in Polling mode
 *   2. For each, call Facebook Graph API: GET /v20.0/{form_id}/leads
 *   3. Parse field_data values (name, phone, email, city)
 *   4. Check if lead already exists (by FB lead ID or phone)
 *   5. Insert new leads, log to import_logs
 *   6. Update settings telemetry
 */

import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// ─── Facebook Graph API Response Types ────────────────────────────────────────

interface FacebookFieldData {
  name: string
  values: string[]
}

interface FacebookLead {
  created_time: string
  id: string // Facebook Lead ID
  field_data: FacebookFieldData[]
}

interface FacebookApiResponse {
  data?: FacebookLead[]
  error?: {
    message: string
    type: string
    code: number
    fbtrace_id: string
  }
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://callmind.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Optional manual parameter
    let targetCompanyId: string | null = null
    try {
      const body = await req.json()
      targetCompanyId = body.company_id || null
    } catch {
      // No body
    }

    // 1. Fetch companies with Meta configured.
    //
    // Was team_settings.facebook_config, a column that has never existed, so
    // this query failed on every invocation. Credentials moved to their own
    // admin-only table in 20260819000100_integration_credentials.sql.
    let query = supabase
      .from("integration_credentials")
      .select("company_id, config")
      .eq("provider", "facebook")
      .eq("is_active", true)

    if (targetCompanyId) {
      query = query.eq("company_id", targetCompanyId)
    }

    const { data: companies, error: fetchError } = await query
    if (fetchError) throw fetchError

    const results: Array<{
      company_id: string
      new_leads: number
      skipped_duplicates: number
      errors: string[]
    }> = []

    for (const row of companies || []) {
      const config = row.config as {
        appId?: string
        appSecret?: string
        pageId?: string
        formId?: string
        accessToken?: string
        syncMethod?: 'Webhook' | 'Polling'
        isActive?: boolean
      } | null

      if (!config?.accessToken || !config?.formId) continue
      if (config.isActive === false) continue
      // If triggered by cron/background, skip if in Webhook mode. Manual invokes always run.
      if (!targetCompanyId && config.syncMethod === 'Webhook') continue

      const companyId = row.company_id
      const companyResult = {
        company_id: companyId,
        new_leads: 0,
        skipped_duplicates: 0,
        errors: [] as string[],
      }

      try {
        // 2. Fetch leads from Graph API
        const apiUrl = `https://graph.facebook.com/v20.0/${config.formId}/leads?access_token=${config.accessToken}&limit=50`
        const apiResponse = await fetch(apiUrl)

        if (!apiResponse.ok) {
          companyResult.errors.push(`API HTTP ${apiResponse.status}: ${apiResponse.statusText}`)
          results.push(companyResult)
          continue
        }

        const apiData: FacebookApiResponse = await apiResponse.json()

        if (apiData.error) {
          companyResult.errors.push(`Graph API Error: ${apiData.error.message} (Code: ${apiData.error.code})`)
          results.push(companyResult)
          continue
        }

        const rawLeads = apiData.data || []

        // 3. Fetch existing phone numbers and query IDs for duplicate checks
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("phone, metadata")
          .eq("company_id", companyId)
          .eq("is_deleted", false)

        const existingPhones = new Set(
          (existingLeads || []).map((l) => l.phone?.replace(/\D/g, "").slice(-10))
        )
        const existingFacebookIds = new Set(
          (existingLeads || [])
            .filter((l) => l.metadata?.facebook_lead_id)
            .map((l) => l.metadata.facebook_lead_id)
        )

        // 4. Process field data mapping
        const newLeads: Array<Record<string, unknown>> = []

        for (const lead of rawLeads) {
          if (existingFacebookIds.has(lead.id)) {
            companyResult.skipped_duplicates++
            continue
          }

          // Parse name, phone, email, city from Facebook field_data array
          let name = ""
          let phone = ""
          let email = ""
          let city = ""
          const extraFields: Record<string, string> = {}

          for (const fd of lead.field_data) {
            const fieldKey = fd.name.toLowerCase()
            const val = fd.values?.[0] || ""

            if (fieldKey.includes("name") || fieldKey === "full_name") {
              name = val
            } else if (fieldKey.includes("phone") || fieldKey.includes("mobile")) {
              phone = val
            } else if (fieldKey === "email" || fieldKey.includes("mail")) {
              email = val
            } else if (fieldKey === "city" || fieldKey.includes("location")) {
              city = val
            } else {
              extraFields[fd.name] = val
            }
          }

          const cleanPhone = phone.replace(/\D/g, "").slice(-10)
          if (cleanPhone && existingPhones.has(cleanPhone)) {
            companyResult.skipped_duplicates++
            continue
          }

          // Create lead
          const leadRecord: Record<string, unknown> = {
            name: name || "Facebook Lead",
            phone: phone || "",
            email: email || null,
            city: city || null,
            description: Object.entries(extraFields)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" | ") || "Inquiry via Facebook Lead Ads",
            source: "Facebook",
            status: "New Lead",
            company_id: companyId,
            assigned_to: "unassigned",
            is_deleted: false,
            is_unseen: true,
            metadata: {
              facebook_lead_id: lead.id,
              facebook_created_time: lead.created_time,
              facebook_form_id: config.formId,
              facebook_page_id: config.pageId,
            },
          }

          newLeads.push(leadRecord)

          if (cleanPhone) existingPhones.add(cleanPhone)
          existingFacebookIds.add(lead.id)
        }

        // 5. Insert
        if (newLeads.length > 0) {
          const { error: insertError } = await supabase
            .from("leads")
            .insert(newLeads)

          if (insertError) {
            companyResult.errors.push(`Insert Error: ${insertError.message}`)
          } else {
            companyResult.new_leads = newLeads.length
          }
        }

        // 6. Log
        await supabase.from("import_logs").insert({
          company_id: companyId,
          filename: `Facebook Sync (${new Date().toLocaleDateString("en-IN")})`,
          row_count: companyResult.new_leads,
          status: companyResult.errors.length > 0 ? "partial" : "completed",
        })

        // 7. Record when this ran, beside the credentials it used
        await supabase
          .from("integration_credentials")
          .update({
            config: {
              ...config,
              lastSyncedAt: new Date().toISOString(),
              lastSyncCount: companyResult.new_leads,
              lastSyncErrors: companyResult.errors,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("provider", "facebook")

        // 8. Audit logs
        await supabase.from("audit_logs").insert({
          company_id: companyId,
          action: "FACEBOOK_POLL_COMPLETED",
          category: "integration",
          target: "Facebook Lead Ads",
          details: `Synced ${companyResult.new_leads} leads, skipped ${companyResult.skipped_duplicates} duplicates. Errors: ${companyResult.errors.length}`,
          timestamp: new Date().toISOString(),
        })

      } catch (err: unknown) {
        console.error(err);
        Sentry.captureException(err);
        companyResult.errors.push('Internal server error');
      }

      results.push(companyResult)
    }

    return new Response(
      JSON.stringify({ success: true, results }),
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
