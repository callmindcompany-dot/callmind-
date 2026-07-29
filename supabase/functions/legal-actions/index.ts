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

    // Validate calling user session using Anon Client
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
    const { action, userId, companyId } = await req.json()

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Validate caller profile and tenant ownership
    const targetCompanyId = companyId || userId; // Default fallback context
    if (targetCompanyId) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return new Response(JSON.stringify({ error: "User profile validation failed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      if (profile.company_id !== targetCompanyId) {
        return new Response(JSON.stringify({ error: "Forbidden: Tenant context mismatch" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      if (profile.role !== 'founder' && profile.role !== 'tester' && profile.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: "Forbidden: Administrator role required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    // ACTION: export-data
    if (action === 'export-data') {
      if (!companyId) {
        return new Response(JSON.stringify({ error: "Missing companyId parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      // Fetch company data
      const { data: leads } = await supabaseAdmin.from('leads').select('*').eq('company_id', companyId)
      const { data: calls } = await supabaseAdmin.from('calls').select('*').eq('company_id', companyId)
      const { data: users } = await supabaseAdmin.from('users').select('*').eq('company_id', companyId)
      const { data: configs } = await supabaseAdmin.from('founder_configs').select('*').eq('company_id', companyId)

      // Generate combined CSV
      const csvRows = ['RecordType,ID,Field1,Field2,Field3,Field4,Field5'];

      (leads || []).forEach(lead => {
        const name = (lead.name || '').replace(/"/g, '""')
        const phone = (lead.phone || '').replace(/"/g, '""')
        const email = (lead.email || '').replace(/"/g, '""')
        const status = (lead.status || '').replace(/"/g, '""')
        const source = (lead.source || '').replace(/"/g, '""')
        csvRows.push(`Lead,"${lead.id}","${name}","${phone}","${email}","${status}","${source}"`)
      });

      (calls || []).forEach(call => {
        const leadName = (call.lead_name || '').replace(/"/g, '""')
        const phone = (call.phone || '').replace(/"/g, '""')
        const status = (call.status || '').replace(/"/g, '""')
        const duration = (call.duration || '').replace(/"/g, '""')
        const aiSummary = (call.ai_summary || '').replace(/"/g, '""')
        csvRows.push(`Call,"${call.id}","${leadName}","${phone}","${status}","${duration}","${aiSummary}"`)
      });

      (users || []).forEach(u => {
        const name = (u.name || '').replace(/"/g, '""')
        const email = (u.email || '').replace(/"/g, '""')
        const role = (u.role || '').replace(/"/g, '""')
        const status = (u.onboarding_status || '').replace(/"/g, '""')
        csvRows.push(`User,"${u.id}","${name}","${email}","${role}","${status}",""`)
      });

      (configs || []).forEach(conf => {
        const plan = (conf.plan || '').replace(/"/g, '""')
        const status = (conf.status || '').replace(/"/g, '""')
        const rule = (conf.assignment_rule || '').replace(/"/g, '""')
        csvRows.push(`Config,"${conf.id}","${plan}","${status}","${rule}","",""`)
      });

      const csvContent = csvRows.join('\n')
      const fileName = `gdpr_export_${companyId}_${Date.now()}.csv`

      // Ensure storage bucket exists (set public: false for data privacy/GDPR compliance)
      await supabaseAdmin.storage.createBucket('gdpr-exports', { public: false }).catch(() => {})

      // Upload CSV
      const { error: uploadError } = await supabaseAdmin.storage
        .from('gdpr-exports')
        .upload(fileName, csvContent, {
          contentType: 'text/csv',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Generate secure signed URL with a 15-minute (900 seconds) expiration window
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from('gdpr-exports')
        .createSignedUrl(fileName, 900)

      if (signedError || !signedData?.signedUrl) {
        throw signedError || new Error("Failed to generate secure signed URL for export data download")
      }

      // Log the export action in audit logs
      await supabaseAdmin.from('audit_logs').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        action: 'legal.gdpr.export',
        category: 'Security',
        target: 'company',
        target_id: companyId,
        user_name: user.user_metadata?.name || user.email,
        user_email: user.email,
        timestamp: new Date().toISOString(),
        details: `GDPR export data requested for company_id ${companyId}`
      })

      return new Response(JSON.stringify({ success: true, downloadUrl: signedData.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ACTION: purge-data
    if (action === 'purge-data') {
      if (!companyId) {
        return new Response(JSON.stringify({ error: "Missing companyId parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      // Delete all company data across tables
      await supabaseAdmin.from('leads').delete().eq('company_id', companyId)
      await supabaseAdmin.from('calls').delete().eq('company_id', companyId)
      await supabaseAdmin.from('callbacks').delete().eq('company_id', companyId).catch(() => {})
      await supabaseAdmin.from('messages').delete().eq('company_id', companyId).catch(() => {})
      await supabaseAdmin.from('whatsapp_messages').delete().eq('company_id', companyId).catch(() => {})

      // Log purge action in audit logs
      await supabaseAdmin.from('audit_logs').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        action: 'legal.gdpr.purge',
        category: 'Security',
        target: 'company',
        target_id: companyId,
        user_name: user.user_metadata?.name || user.email || 'System Admin',
        user_email: user.email || 'admin@callmind.ai',
        timestamp: new Date().toISOString(),
        details: `GDPR purge completed for company_id ${companyId}`
      })

      return new Response(JSON.stringify({ success: true, message: "Purge completed successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // ACTION: cancel-subscription
    if (action === 'cancel-subscription') {
      if (!companyId) {
        return new Response(JSON.stringify({ error: "Missing companyId parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      // 1. Update subscriptions
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled', ends_at: new Date().toISOString() })
        .eq('company_id', companyId)

      // 2. Update companies
      const { error: compError } = await supabaseAdmin
        .from('companies')
        .update({ plan_status: 'cancelled' })
        .eq('id', companyId)

      if (subError) throw subError
      if (compError) throw compError

      // Log cancellation action in audit logs
      await supabaseAdmin.from('audit_logs').insert({
        id: crypto.randomUUID(),
        company_id: companyId,
        action: 'billing.subscription.cancelled',
        category: 'Billing',
        target: 'company',
        target_id: companyId,
        user_name: user.user_metadata?.name || user.email,
        user_email: user.email,
        timestamp: new Date().toISOString(),
        details: `Subscription and company status marked as cancelled for company ${companyId}`
      })

      return new Response(JSON.stringify({ success: true, message: "Subscription cancelled successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
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
