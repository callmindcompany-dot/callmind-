import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

serve(async (req) => {
  const url = new URL(req.url)
  
  // Meta Webhook Verification Challenge handler
  if (req.method === "GET") {
    const hubMode = url.searchParams.get("hub.mode")
    const hubChallenge = url.searchParams.get("hub.challenge")
    const hubVerifyToken = url.searchParams.get("hub.verify_token")

    // Retrieve global verification token from server variables
    const verifyToken = Deno.env.get("META_VERIFY_TOKEN") || "callmind-token"

    if (hubMode === "subscribe" && hubVerifyToken === verifyToken) {
      return new Response(hubChallenge, { status: 200 })
    }
    return new Response("Forbidden Verification Challenge Failed", { status: 403 })
  }

  try {
    const body = await req.json()

    // Setup Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // TODO: Extract parameters from Meta webhook payload
    // const entry = body.entry?.[0]
    // const changes = entry?.changes?.[0]
    // const value = changes?.value
    // const message = value?.messages?.[0]
    // if (message) { ... save to whatsapp_messages table ... }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } })
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
