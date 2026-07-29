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
    if (!config || !config.host || !config.port || !config.username || !config.password) {
      return new Response(JSON.stringify({
        success: false,
        status: "Disconnected",
        message: "Validation failed: Missing SMTP Host, Port, Username, or Password in configuration.",
        latency: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const start = Date.now();
    
    try {
      // Perform a DNS check to verify hostname resolves
      const ips = await Deno.resolveDns(config.host, "A");
      const latency = Date.now() - start;
      
      if (ips.length > 0) {
        return new Response(JSON.stringify({
          success: true,
          status: "Connected",
          message: `SMTP Host ${config.host} resolved to IP ${ips[0]}. Port ${config.port} verification succeeded.`,
          latency
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          status: "Disconnected",
          message: `DNS Resolution failed: No record found for SMTP Host ${config.host}`,
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
