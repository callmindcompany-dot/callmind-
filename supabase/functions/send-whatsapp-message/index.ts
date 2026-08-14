import { Sentry } from "../_shared/sentry.ts";
// Follow edge function standards
// Deno environment
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import {
  sendTemplate,
  sendSession,
  WhatsAppNotConfigured,
  WhatsAppNotSupported,
  type BspConfig,
} from "../_shared/whatsapp.ts"
import { startRun, finishRun } from "../_shared/runLog.ts"

/**
 * Outbound WhatsApp, sent through the provider the customer already pays for.
 *
 * This function used to look up the company's Meta credentials, skip the Graph
 * API call entirely -- it was commented out -- and return
 *
 *   { success: true, whatsapp_message_id: "wamid.HBgLOTE5OTk5OTk5OTk5..." }
 *
 * a hardcoded, invented Meta message id for a message that was never sent. The
 * caller stored it, the thread showed the message delivered, and the customer
 * heard nothing.
 *
 * Two things decide the shape of what replaced it.
 *
 * WhatsApp does not allow free text to a lead who has not written first. A
 * business-initiated message must be a pre-approved template; free text is only
 * allowed inside 24 hours of the customer's own last message. So this takes a
 * template name and its parameters, and only falls back to free text when the
 * caller explicitly asks for a session message.
 *
 * And it sends through the customer's own BSP -- WATI, Interakt or AiSensy --
 * rather than Meta directly, because Meta's onboarding is not something a
 * six-telecaller business will complete, and they are already paying one of
 * those three. CallMind holds no WhatsApp credentials of its own.
 *
 * NOT YET VERIFIED AGAINST A LIVE ACCOUNT. The request shapes come from each
 * provider's published documentation, but no real message has been sent
 * through this. Until one has, whatsappType stays "manual" in
 * src/config/pricing.ts and no plan advertises WhatsApp sending.
 */
serve(async (req) => {
  let supabase: ReturnType<typeof createClient> | null = null
  let run: Awaited<ReturnType<typeof startRun>> | null = null
  let outcome: "success" | "failed" = "failed"
  let errorText: string | undefined

  try {
    const { lead_phone, message_content, company_id, template_name, template_params, session } =
      await req.json()

    if (!company_id || !lead_phone) {
      return json({ success: false, message: "company_id and lead_phone are required" }, 400)
    }

    supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { data: cred, error: credError } = await supabase
      .from("integration_credentials")
      .select("config, is_active")
      .eq("company_id", company_id)
      .eq("provider", "whatsapp")
      .maybeSingle()

    // A lookup failure is not "not configured", and telling the caller to go
    // set something up when the database blipped sends them somewhere useless.
    if (credError) {
      return json({ success: false, code: "LOOKUP_FAILED", message: "Could not read your WhatsApp settings." }, 503)
    }

    if (!cred || cred.is_active === false || !(cred.config as BspConfig)?.apiKey) {
      return json({
        success: false,
        code: "WHATSAPP_NOT_CONNECTED",
        message: "No WhatsApp provider is connected for this company. Nothing was sent.",
      }, 501)
    }

    const cfg = cred.config as BspConfig

    run = await startRun(supabase, company_id, "whatsapp", "manual")

    // Free text only where the caller has asserted an open session. Otherwise
    // a template, which is the only thing that reaches a cold lead.
    const result = session
      ? await sendSession(cfg, lead_phone, String(message_content ?? ""))
      : await sendTemplate(
          cfg,
          lead_phone,
          String(template_name ?? ""),
          Array.isArray(template_params) ? template_params.map(String) : [],
        )

    outcome = "success"
    return json({
      success: true,
      provider: cfg.provider,
      // The provider's own id, or null. Never a synthesised one.
      whatsapp_message_id: result.providerMessageId,
    })
  } catch (err: unknown) {
    console.error(err)
    Sentry.captureException(err)
    errorText = String((err as { message?: string })?.message ?? err)

    if (err instanceof WhatsAppNotConfigured) {
      return json({ success: false, code: "WHATSAPP_NOT_CONFIGURED", message: errorText }, 501)
    }
    if (err instanceof WhatsAppNotSupported) {
      return json({ success: false, code: "WHATSAPP_NOT_SUPPORTED", message: errorText }, 400)
    }
    // The provider's own words, so a failure can be acted on rather than
    // guessed at.
    return json({ success: false, code: "WHATSAPP_SEND_FAILED", message: errorText }, 502)
  } finally {
    if (supabase && run) {
      await finishRun(supabase, run, { outcome, error: errorText })
    }
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
