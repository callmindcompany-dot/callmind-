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
    try {
      const body = await req.json()
      targetCompanyId = body.company_id || null
    } catch {
      // No body — poll all companies
    }

    // 1. Fetch companies with IndiaMART configs
    let query = supabase
      .from("team_settings")
      .select("company_id, indiamart_config")
      .not("indiamart_config", "is", null)

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
      const config = row.indiamart_config as { apiKey?: string; mobile?: string; isActive?: boolean } | null
      if (!config?.apiKey || !config?.mobile) continue
      if (config.isActive === false) continue

      const companyId = row.company_id
      const companyResult = {
        company_id: companyId,
        new_leads: 0,
        skipped_duplicates: 0,
        errors: [] as string[],
      }

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
          .select("phone, metadata")
          .eq("company_id", companyId)
          .eq("is_deleted", false)

        const existingPhones = new Set(
          (existingLeads || []).map((l) => l.phone?.replace(/\D/g, "").slice(-10))
        )
        const existingQueryIds = new Set(
          (existingLeads || [])
            .filter((l) => l.metadata?.indiamart_query_id)
            .map((l) => l.metadata.indiamart_query_id)
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
            assigned_to: "unassigned",
            is_deleted: false,
            is_unseen: true,
            metadata: {
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

        // 7. Update last_synced timestamp on team_settings
        await supabase
          .from("team_settings")
          .update({
            indiamart_config: {
              ...config,
              lastSyncedAt: new Date().toISOString(),
              lastSyncCount: companyResult.new_leads,
              lastSyncErrors: companyResult.errors,
            },
          })
          .eq("company_id", companyId)

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
