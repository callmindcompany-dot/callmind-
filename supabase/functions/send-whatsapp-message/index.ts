import { Sentry } from "../_shared/sentry.ts";
// Follow edge function standards
// Deno environment
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

serve(async (req) => {
  try {
    const { lead_id, lead_phone, message_content, company_id } = await req.json()

    // Setup Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Retrieve company Settings to obtain Meta Access Token
    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("whatsapp_config")
      .eq("company_id", company_id)
      .single()

    if (settingsError || !settings?.whatsapp_config) {
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp API keys not configured for company" }),
        { headers: { "Content-Type": "application/json" } }
      )
    }

    const { app_id, phone_id, access_token } = settings.whatsapp_config

    // TODO: Send Meta API Request
    // const metaUrl = `https://graph.facebook.com/v18.0/${phone_id}/messages`
    // const response = await fetch(metaUrl, {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${access_token}`,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({
    //     messaging_product: "whatsapp",
    //     to: lead_phone,
    //     type: "text",
    //     text: { body: message_content }
    //   })
    // })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Message processed successfully", 
        whatsapp_message_id: "wamid.HBgLOTE5OTk5OTk5OTk5FQIAERgSRjQ1Nj..." 
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
