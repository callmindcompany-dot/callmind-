import { Sentry } from "../_shared/sentry.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

/**
 * Inbound WhatsApp. Not built, and therefore refuses -- including the setup
 * handshake, so it cannot be half-connected.
 *
 * This used to answer Meta's verification challenge, accept every delivery,
 * store nothing (the parsing was commented out) and reply 200. Meta treats 200
 * as delivered and does not retry, so every customer reply that arrived was
 * acknowledged and then dropped. The inbox stayed empty and looked like nobody
 * had written.
 *
 * The GET challenge now fails too. Passing it is what lets an owner finish the
 * Meta setup wizard, and finishing that wizard is what starts the silent
 * dropping. Refusing the handshake means the connection is never established in
 * the first place, which is the honest state of this feature.
 *
 * To make it real: verify the X-Hub-Signature-256 HMAC (see
 * WhatsAppInboxService.validateWebhookSignature, which is already written),
 * pull entry[0].changes[0].value.messages[0], upsert the conversation, insert
 * the message, and only then return 200. Its outbound twin,
 * send-whatsapp-message, has to dispatch before the inbox is worth having.
 */
serve(async (req) => {
  try {
    if (req.method === "GET") {
      return new Response(
        "CallMind is not accepting WhatsApp webhooks yet.",
        { status: 501 }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        code: "WHATSAPP_NOT_CONNECTED",
        message: "This endpoint does not store messages yet, so it will not acknowledge them.",
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
