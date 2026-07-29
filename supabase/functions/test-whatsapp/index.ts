import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { config } = await req.json();
    if (!config || !config.businessId || !config.phoneId || !config.token) {
      return new Response(JSON.stringify({
        success: false,
        status: "Disconnected",
        message: "Validation failed: Missing WhatsApp Business ID, Phone ID, or System Access Token.",
        latency: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const start = Date.now();
    
    try {
      const url = `https://graph.facebook.com/v18.0/${config.phoneId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`
        }
      });
      
      const latency = Date.now() - start;
      const result = await response.json();
      
      if (response.status === 200) {
        return new Response(JSON.stringify({
          success: true,
          status: "Connected",
          message: `Meta Cloud API Webhook Verified. Active Phone Number Display Name: ${result.display_phone_number || 'Sandbox Phone'}`,
          latency
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          status: "Disconnected",
          message: `Meta validation failed: ${result.error?.message || 'Unauthorized API Token.'}`,
          latency
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (err: any) {
      console.error(err);
      Sentry.captureException(err);
      return new Response(JSON.stringify({
        success: false,
        status: "Disconnected",
        message: 'Internal server error',
        latency: Date.now() - start
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ success: false, status: "Disconnected", message: 'Internal server error', latency: 0 }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
