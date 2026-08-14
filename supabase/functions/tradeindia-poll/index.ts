import { Sentry } from "../_shared/sentry.ts";
/**
 * tradeindia-poll  –  Supabase Edge Function
 *
 * Polls the TradeIndia Buyer Enquiry API for all companies with active configs.
 * Can be invoked:
 *   a) on a cron via pg_cron / external scheduler
 *   b) manually from the admin panel via supabase.functions.invoke()
 *
 * Flow:
 *   1. Fetch all team_settings rows with non-empty tradeindia_config
 *   2. For each, call the TradeIndia API with stored apiKey & userid
 *   3. Parse enquiries, dedup by phone / query ID within company
 *   4. Insert new leads with source='TradeIndia' & auto-tagging
 *   5. Log to import_logs
 *   6. Return summary
 */

import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
import { startRun, finishRun, type RunTrigger } from "../_shared/runLog.ts";
import { pickAssignee } from "../_shared/assignLead.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// ─── TradeIndia API Response Types ─────────────────────────────────────────────

interface TradeIndiaEnquiry {
  enquiry_id?: string
  id?: string
  sender_name?: string
  name?: string
  sender_mobile?: string
  mobile?: string
  phone?: string
  sender_email?: string
  email?: string
  message?: string
  requirement?: string
  product_name?: string
  product?: string
  quantity?: string | number
  qty?: string | number
  sender_city?: string
  city?: string
  enquiry_date?: string
}

interface TradeIndiaApiResponse {
  code?: number
  status?: string
  total_records?: number
  data?: TradeIndiaEnquiry[]
  response?: TradeIndiaEnquiry[]
  enquiries?: TradeIndiaEnquiry[]
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
      // No body
    }

    // 1. Fetch companies with TradeIndia configured.
    //
    // Was team_settings.tradeindia_config, a column that has never existed, so
    // this query failed on every invocation. Credentials moved to their own
    // admin-only table in 20260819000100_integration_credentials.sql.
    let query = supabase
      .from("integration_credentials")
      .select("company_id, config")
      .eq("provider", "tradeindia")
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
      const config = row.config as { apiKey?: string; userid?: string } | null
      if (!config?.apiKey) continue

      const companyId = row.company_id
      const companyResult = {
        company_id: companyId,
        new_leads: 0,
        skipped_duplicates: 0,
        errors: [] as string[],
      }

      // Opened before the work so a run exists even if the first call throws.
      // Closed in the finally, which also covers the `continue` paths below.
      const run = await startRun(supabase, companyId, "tradeindia", trigger)

      // Who these leads belong to. This was the literal "unassigned", so a
      // company with Round Robin switched on still got every marketplace lead
      // dropped into a pool with nobody's name on it.
      const assignee = await pickAssignee(supabase, companyId, "tradeindia")

      try {
        // 2. Call TradeIndia API
        const useridParam = config.userid ? `&userid=${config.userid}` : ""
        const apiUrl = `https://api.tradeindia.com/v1/enquiries?apikey=${config.apiKey}${useridParam}`

        const apiResponse = await fetch(apiUrl, {
          headers: { "Content-Type": "application/json" },
        })

        if (!apiResponse.ok) {
          companyResult.errors.push(`API HTTP ${apiResponse.status}: ${apiResponse.statusText}`)
          results.push(companyResult)
          continue
        }

        const apiData: TradeIndiaApiResponse = await apiResponse.json()

        // Extract list
        const rawList = apiData.data || apiData.response || apiData.enquiries || (Array.isArray(apiData) ? apiData : [])

        // 3. Fetch existing leads for deduplication
        const { data: existingLeads } = await supabase
          .from("leads")
          .select("phone, custom_data")
          .eq("company_id", companyId)
          .eq("is_deleted", false)

        const existingPhones = new Set(
          (existingLeads || []).map((l) => l.phone?.replace(/\D/g, "").slice(-10))
        )
        const existingEnquiryIds = new Set(
          (existingLeads || [])
            .filter((l) => l.custom_data?.tradeindia_enquiry_id)
            .map((l) => l.custom_data.tradeindia_enquiry_id)
        )

        // 4. Process enquiries
        const newLeads: Array<Record<string, unknown>> = []

        for (const enquiry of rawList) {
          const uniqueId = enquiry.enquiry_id || enquiry.id || ""
          if (uniqueId && existingEnquiryIds.has(uniqueId)) {
            companyResult.skipped_duplicates++
            continue
          }

          const rawPhone = enquiry.sender_mobile || enquiry.mobile || enquiry.phone || ""
          const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10)
          if (cleanPhone && existingPhones.has(cleanPhone)) {
            companyResult.skipped_duplicates++
            continue
          }

          // Fields mapping
          const pName = enquiry.product_name || enquiry.product || ""
          const pQty = enquiry.quantity || enquiry.qty || ""

          const leadRecord: Record<string, unknown> = {
            name: enquiry.sender_name || enquiry.name || "TradeIndia Lead",
            phone: rawPhone || "",
            email: enquiry.sender_email || enquiry.email || null,
            city: enquiry.sender_city || enquiry.city || null,
            description: enquiry.message || enquiry.requirement || "Inquiry via TradeIndia",
            source: "TradeIndia",
            status: "New Lead",
            company_id: companyId,
            assigned_to: assignee,
            is_deleted: false,
            is_unseen: true,
            // AUTO-TAGGING & DETAILS (JSONB custom_data)
            integration_run_id: run.id,
            custom_data: {
              tradeindia_enquiry_id: uniqueId || null,
              tradeindia_date: enquiry.enquiry_date || null,
              product_name: pName || null,
              quantity: pQty || null,
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
          filename: `TradeIndia Sync (${new Date().toLocaleDateString("en-IN")})`,
          row_count: companyResult.new_leads,
          status: companyResult.errors.length > 0 ? "partial" : "completed",
        })

        // 7. Update last_synced stats
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
          .eq("provider", "tradeindia")

        // 8. Audit logs
        await supabase.from("audit_logs").insert({
          company_id: companyId,
          action: "TRADEINDIA_POLL_COMPLETED",
          category: "integration",
          target: "TradeIndia API",
          details: `Synced ${companyResult.new_leads} leads, skipped ${companyResult.skipped_duplicates} duplicates. Errors: ${companyResult.errors.length}`,
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
