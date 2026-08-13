import { Sentry } from "../_shared/sentry.ts";
/**
 * justdial-poll  –  Supabase Edge Function
 *
 * Polls the Justdial Enquiry API for all companies with active configs.
 * Can be invoked:
 *   a) on a cron via pg_cron / external scheduler
 *   b) manually from the admin panel via supabase.functions.invoke()
 *
 * Flow:
 *   1. Fetch all team_settings rows with non-empty justdial_config
 *   2. For each, call the Justdial API with stored apiKey & listingId
 *   3. Parse enquiries, dedup by phone within company
 *   4. Insert new leads, log to import_logs
 *   5. Return summary
 */

import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
import { startRun, finishRun, type RunTrigger } from "../_shared/runLog.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// ─── Justdial API Response Types ─────────────────────────────────────────────

interface JustdialEnquiry {
  enquiry_id?: string
  id?: string
  name?: string
  customer_name?: string
  mobile?: string
  phone?: string
  email?: string
  requirement?: string
  query?: string
  city?: string
  created_time?: string
  date?: string
}

interface JustdialApiResponse {
  code?: number
  status?: string
  total_records?: number
  response?: JustdialEnquiry[]
  enquiries?: JustdialEnquiry[]
  data?: JustdialEnquiry[]
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

    // 1. Fetch companies with Justdial configured.
    //
    // Was team_settings.justdial_config, a column that has never existed, so
    // this query failed on every invocation. Credentials moved to their own
    // admin-only table in 20260819000100_integration_credentials.sql.
    let query = supabase
      .from("integration_credentials")
      .select("company_id, config")
      .eq("provider", "justdial")
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
      const config = row.config as { apiKey?: string; listingId?: string } | null
      if (!config?.apiKey || !config?.listingId) continue

      const companyId = row.company_id
      const companyResult = {
        company_id: companyId,
        new_leads: 0,
        skipped_duplicates: 0,
        errors: [] as string[],
      }

      // Opened before the work so a run exists even if the first call throws.
      // Closed in the finally, which also covers the `continue` paths below.
      const run = await startRun(supabase, companyId, "justdial", trigger)

      try {
        // 2. Call Justdial API
        const apiUrl = `https://api.justdial.com/v1/enquiries?apikey=${config.apiKey}&listing_id=${config.listingId}`

        const apiResponse = await fetch(apiUrl, {
          headers: { "Content-Type": "application/json" },
        })

        if (!apiResponse.ok) {
          companyResult.errors.push(`API HTTP ${apiResponse.status}: ${apiResponse.statusText}`)
          results.push(companyResult)
          continue
        }

        const apiData: JustdialApiResponse = await apiResponse.json()

        // Normalize response parsing since APIs differ in keys
        const enquiries = apiData.response || apiData.enquiries || apiData.data || []
        
        // Handle case where API response might just be a flat array
        const rawList = Array.isArray(apiData) ? apiData : (Array.isArray(enquiries) ? enquiries : [])

        // 3. Fetch existing phone numbers and query IDs for dedup
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("phone, metadata")
          .eq("company_id", companyId)
          .eq("is_deleted", false)

        const existingPhones = new Set(
          (existingLeads || []).map((l) => l.phone?.replace(/\D/g, "").slice(-10))
        )
        const existingEnquiryIds = new Set(
          (existingLeads || [])
            .filter((l) => l.metadata?.justdial_enquiry_id)
            .map((l) => l.metadata.justdial_enquiry_id)
        )

        // 4. Process each enquiry
        const newLeads: Array<Record<string, unknown>> = []

        for (const enquiry of rawList) {
          const uniqueId = enquiry.enquiry_id || enquiry.id || ""
          if (uniqueId && existingEnquiryIds.has(uniqueId)) {
            companyResult.skipped_duplicates++
            continue
          }

          const rawPhone = enquiry.mobile || enquiry.phone || ""
          const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10)
          if (cleanPhone && existingPhones.has(cleanPhone)) {
            companyResult.skipped_duplicates++
            continue
          }

          // Build lead object
          const leadRecord: Record<string, unknown> = {
            name: enquiry.name || enquiry.customer_name || "Justdial Lead",
            phone: rawPhone || "",
            email: enquiry.email || null,
            city: enquiry.city || null,
            description: enquiry.requirement || enquiry.query || "Inquiry via Justdial Listing",
            source: "Justdial",
            status: "New Lead",
            company_id: companyId,
            assigned_to: "unassigned",
            is_deleted: false,
            is_unseen: true,
            metadata: {
              justdial_enquiry_id: uniqueId || null,
              justdial_created_time: enquiry.created_time || enquiry.date || null,
              justdial_listing_id: config.listingId,
            },
          }

          newLeads.push(leadRecord)

          if (cleanPhone) existingPhones.add(cleanPhone)
          if (uniqueId) existingEnquiryIds.add(uniqueId)
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
          filename: `Justdial Sync (${new Date().toLocaleDateString("en-IN")})`,
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
          .eq("provider", "justdial")

        // 8. Audit log
        await supabase.from("audit_logs").insert({
          company_id: companyId,
          action: "JUSTDIAL_POLL_COMPLETED",
          category: "integration",
          target: "Justdial API",
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
