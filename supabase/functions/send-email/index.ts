import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

serve(async (req) => {
  try {
    const { to_email, subject, body_content, company_id } = await req.json()

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("smtp_config")
      .eq("company_id", company_id)
      .single()

    if (settingsError || !settings?.smtp_config) {
      return new Response(
        JSON.stringify({ success: false, message: "SMTP parameters not found" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    // UNIMPLEMENTED: Custom SMTP relay is disabled across all plans (emailFromOwnDomain = false).
    // Future expansion: integrate deno-smtp or transactional ESP relay when custom domain emailing is enabled.
    return new Response(JSON.stringify({ success: false, message: "Custom domain email sending is currently disabled." }), { headers: { "Content-Type": "application/json" } })
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
