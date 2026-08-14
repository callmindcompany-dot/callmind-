import { Sentry } from "../_shared/sentry.ts";
/**
 * indiamart-poll  –  Supabase Edge Function
 *
 * Polls the IndiaMART GLUSR Enquiry API for all companies with active configs.
 * Can be invoked:
 *   a) on a cron via pg_cron / external scheduler
 *   b) manually from the admin panel via supabase.functions.invoke()
 *
 * Flow:
 *   1. Fetch all team_settings rows with non-empty indiamart_config
 *   2. For each, call the GLUSR API with stored mobile + apiKey
 *   3. Parse enquiries, dedup by phone within company
 *   4. Insert new leads, log to import_logs
 *   5. Return summary
 */

import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
import { startRun, finishRun, type RunTrigger } from "../_shared/runLog.ts";
import { pickAssignee } from "../_shared/assignLead.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// ─── IndiaMART API Response Types ─────────────────────────────────────────────

interface IndiaMartEnquiry {
  UNIQUE_QUERY_ID: string
  QUERY_TYPE: string
  QUERY_TIME: string
  SENDER_NAME: string
  SENDER_MOBILE: string
  SENDER_MOBILE_ALT: string
  SENDER_EMAIL: string
  SENDER_EMAIL_ALT: string
  SUBJECT: string
  SENDER_COMPANY: string
  SENDER_ADDRESS: string
  SENDER_CITY: string
  SENDER_STATE: string
  SENDER_PINCODE: string
  SENDER_COUNTRY_ISO: string
  QUERY_MESSAGE: string
  QUERY_MCAT_NAME: string
  QUERY_PRODUCT_NAME: string
  CALL_DURATION: string
  RECEIVER_MOBILE: string
}

interface IndiaMartApiResponse {
  CODE: number
  STATUS: string
  TOTAL_RECORDS: number
  RESPONSE: IndiaMartEnquiry[]
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://callmind.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Optional: Accept a specific company_id for manual trigger
    let targetCompanyId: string | null = null
    // Defaults to 'manual', because a bare invoke is the Sync Now button.
    // run_integration_poll() sends trigger: 'schedule'.
    let trigger: RunTrigger = "manual"
    try {
      const body = await req.json()
      targetCompanyId = body.company_id || null
      if (body.trigger === "schedule") trigger = "schedule"
    } catch {
      // No body — poll all companies
    }

    // 1. Fetch companies with IndiaMART configured.
    //
    // This read team_settings.indiamart_config, a column that has never existed
    // -- team_settings holds ten lead and team preference columns and none of
    // the integration ones. So the query failed on every invocation, and since
    // nothing schedules this function either, no IndiaMART lead has ever
    // reached the CRM through it. Credentials now live in their own
    // admin-only table (20260819000100_integration_credentials.sql).
    let query = supabase
      .from("integration_credentials")
      .select("company_id, config")
      .eq("provider", "indiamart")
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
      const config = row.config as { apiKey?: string; mobile?: string } | null
      if (!config?.apiKey || !config?.mobile) continue

      const companyId = row.company_id
      const companyResult = {
        company_id: companyId,
        new_leads: 0,
        skipped_duplicates: 0,
        errors: [] as string[],
      }

      // Opened before the work so a run exists even if the very first call
      // throws. Closed in the finally, which also covers the `continue` paths
      // below -- those are the error cases, and they are the ones worth having.
      const run = await startRun(supabase, companyId, "indiamart", trigger)

      // Who these leads belong to. This was the literal "unassigned", so a
      // company with Round Robin switched on still got every marketplace lead
      // dropped into a pool with nobody's name on it.
      const assignee = await pickAssignee(supabase, companyId, "indiamart")

      try {
        // 2. Call IndiaMART GLUSR API
        const apiUrl = `https://mapi.indiamart.com/wserv/enquiry/listing/JEESSION_ID/1/START_TIME/01-Jan-2020%2000:00:00/END_TIME/${encodeURIComponent(new Date().toISOString().replace('T', ' ').slice(0, 19))}/GLUSR_MOBILE/${config.mobile}/GLUSR_API_KEY/${config.apiKey}/Count/50/`

        const apiResponse = await fetch(apiUrl, {
          headers: { "Content-Type": "application/json" },
        })

        if (!apiResponse.ok) {
          companyResult.errors.push(`API HTTP ${apiResponse.status}: ${apiResponse.statusText}`)
          results.push(companyResult)
          continue
        }

        const apiData: IndiaMartApiResponse = await apiResponse.json()

        if (apiData.CODE !== 200 && apiData.STATUS !== "SUCCESS") {
          companyResult.errors.push(`API Error: ${apiData.STATUS || 'Unknown error'}`)
          results.push(companyResult)
          continue
        }

        const enquiries = apiData.RESPONSE || []

        // 3. Fetch existing phone numbers for dedup
        const { data: existingLeads } = await supabase
          .from("leads")
          // custom_data, not metadata. leads has never had a metadata column,
          // so this select failed with 42703 and took the whole poll with it --
          // one of several independent reasons no IndiaMART lead has ever
          // reached the CRM.
          .select("phone, custom_data")
          .eq("company_id", companyId)
          .eq("is_deleted", false)

        const existingPhones = new Set(
          (existingLeads || []).map((l) => l.phone?.replace(/\D/g, "").slice(-10))
        )
        const existingQueryIds = new Set(
          (existingLeads || [])
            .filter((l) => l.custom_data?.indiamart_query_id)
            .map((l) => l.custom_data.indiamart_query_id)
        )

        // 4. Process each enquiry
        const newLeads: Array<Record<string, unknown>> = []

        for (const enquiry of enquiries) {
          // Dedup by UNIQUE_QUERY_ID first, then by phone
          if (existingQueryIds.has(enquiry.UNIQUE_QUERY_ID)) {
            companyResult.skipped_duplicates++
            continue
          }

          const cleanPhone = enquiry.SENDER_MOBILE?.replace(/\D/g, "").slice(-10) || ""
          if (cleanPhone && existingPhones.has(cleanPhone)) {
            companyResult.skipped_duplicates++
            continue
          }

          // Build lead object using standard field mapping
          const leadRecord: Record<string, unknown> = {
            name: enquiry.SENDER_NAME || "IndiaMART Lead",
            phone: enquiry.SENDER_MOBILE || "",
            email: enquiry.SENDER_EMAIL || null,
            city: enquiry.SENDER_CITY || null,
            description: [
              enquiry.QUERY_MESSAGE,
              enquiry.QUERY_PRODUCT_NAME ? `Product: ${enquiry.QUERY_PRODUCT_NAME}` : null,
              enquiry.QUERY_MCAT_NAME ? `Category: ${enquiry.QUERY_MCAT_NAME}` : null,
              enquiry.SENDER_COMPANY ? `Company: ${enquiry.SENDER_COMPANY}` : null,
            ].filter(Boolean).join(" | "),
            notes: [
              enquiry.SENDER_ADDRESS,
              enquiry.SENDER_STATE,
              enquiry.SENDER_PINCODE ? `PIN: ${enquiry.SENDER_PINCODE}` : null,
              enquiry.SENDER_MOBILE_ALT ? `Alt Phone: ${enquiry.SENDER_MOBILE_ALT}` : null,
              enquiry.SENDER_EMAIL_ALT ? `Alt Email: ${enquiry.SENDER_EMAIL_ALT}` : null,
            ].filter(Boolean).join(" | "),
            source: "IndiaMart",
            status: "New Lead",
            company_id: companyId,
            assigned_to: assignee,
            is_deleted: false,
            is_unseen: true,
            // Which run brought this lead in, so the lead can say where it
            // came from and not just which vendor sent it.
            integration_run_id: run.id,
            custom_data: {
              indiamart_query_id: enquiry.UNIQUE_QUERY_ID,
              indiamart_query_type: enquiry.QUERY_TYPE,
              indiamart_query_time: enquiry.QUERY_TIME,
              indiamart_product: enquiry.QUERY_PRODUCT_NAME,
              indiamart_category: enquiry.QUERY_MCAT_NAME,
              indiamart_call_duration: enquiry.CALL_DURATION,
            },
          }

          newLeads.push(leadRecord)

          // Track to avoid internal batch duplicates
          if (cleanPhone) existingPhones.add(cleanPhone)
          existingQueryIds.add(enquiry.UNIQUE_QUERY_ID)
        }

        // 5. Batch insert new leads
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

        // 6. Log to import_logs
        await supabase.from("import_logs").insert({
          company_id: companyId,
          filename: `IndiaMART GLUSR Sync (${new Date().toLocaleDateString("en-IN")})`,
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
          .eq("provider", "indiamart")

        // 8. Audit log
        await supabase.from("audit_logs").insert({
          company_id: companyId,
          action: "INDIAMART_POLL_COMPLETED",
          category: "integration",
          target: "IndiaMART GLUSR",
          details: `Synced ${companyResult.new_leads} new leads, skipped ${companyResult.skipped_duplicates} duplicates. Errors: ${companyResult.errors.length}`,
          timestamp: new Date().toISOString(),
        })

      } catch (err: unknown) {
        console.error(err);
        Sentry.captureException(err);
        companyResult.errors.push('Internal server error');
      } finally {
        await finishRun(supabase, run, {
          outcome:
            companyResult.errors.length === 0
              ? "success"
              : companyResult.new_leads > 0
                ? "partial"
                : "failed",
          leadsCreated: companyResult.new_leads,
          leadsDuplicate: companyResult.skipped_duplicates,
          error: companyResult.errors.length ? companyResult.errors.join('; ') : undefined,
        })
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
