import { Sentry } from "../_shared/sentry.ts";
// Follow edge function standards
// Deno environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * Outbound WhatsApp. Not built, and therefore refuses.
 *
 * This function used to look up the company's Meta credentials, skip the Graph
 * API call entirely -- it was commented out -- and return:
 *
 *   { success: true, whatsapp_message_id: "wamid.HBgLOTE5OTk5OTk5OTk5..." }
 *
 * a hardcoded, invented Meta message id for a message that was never sent. The
 * caller stored it, the conversation showed the message as delivered, and the
 * customer heard nothing. A telecaller would have marked the lead as followed
 * up and moved on.
 *
 * To make it real: POST to https://graph.facebook.com/v18.0/<phone_id>/messages
 * with the company's access_token from company_settings.whatsapp_config, and
 * return the id Meta gives back -- never one we made up. Its inbound twin,
 * receive-whatsapp-webhook, has to store messages before any of this is worth
 * switching on.
 *
 * Until then it answers 501 so the failure is visible to whoever called it.
 */
serve(async (_req) => {
  try {
    return new Response(
      JSON.stringify({
        success: false,
        code: "WHATSAPP_NOT_CONNECTED",
        message: "WhatsApp sending is not available yet. Nothing was sent.",
      }),
      { status: 501, headers: { "Content-Type": "application/json" } }
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
