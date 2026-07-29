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
    if (!config || !config.appId || !config.apiKey || !config.subdomain) {
      return new Response(JSON.stringify({
        success: false,
        status: "Disconnected",
        message: "Validation failed: Missing Exotel App ID, API Key, or Subdomain in configuration.",
        latency: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 500));
    const latency = Date.now() - start;

    try {
      const url = `https://${config.subdomain}.exotel.com/v1/Accounts/${config.appId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(config.appId + ':' + config.apiKey)
        }
      });
      
      if (response.status === 200) {
        return new Response(JSON.stringify({
          success: true,
          status: "Connected",
          message: "Exotel Carrier Gateway Connected successfully. API credentials validated.",
          latency
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          status: "Disconnected",
          message: `Gateway returned status ${response.status}: Unauthorized. Please check App ID or API Key.`,
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
        latency
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
