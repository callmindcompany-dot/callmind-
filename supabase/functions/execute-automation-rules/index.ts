import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { invokeOrThrow } from "../_shared/dispatch.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { event_type, lead, company_id } = await req.json()

    // 1. Fetch active automation rules for this company
    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("company_id", company_id)
      .eq("is_active", true)

    if (rulesError) throw rulesError

    // 2. Scan rules and match triggers
    for (const rule of rules || []) {
      let isTriggered = false

      if (rule.trigger_type === "lead_created" && event_type === "INSERT") {
        isTriggered = true
      } else if (rule.trigger_type === "lead_status_changed" && event_type === "UPDATE") {
        isTriggered = true // check trigger config comparison
      } else if (rule.trigger_type === "lead_assigned" && event_type === "UPDATE") {
        isTriggered = true
      }

      if (!isTriggered) continue

      // Execute action steps configured in actions_config
      const steps = rule.actions_config || []
      for (const step of steps) {
        try {
          if (step.type === "send_whatsapp") {
            // FIXME: this sends step.config's message, not a fixed string. The
            // body below is a placeholder that would reach a real customer as
            // "Automated sequence notification" no matter what the owner typed
            // into the rule. It is unreachable today because
            // send-whatsapp-message refuses, and it must not be switched on
            // until it reads the configured content.
            await invokeOrThrow(supabase, "send-whatsapp-message", {
              lead_id: lead.id,
              lead_phone: lead.phone,
              message_content: step.config?.message ?? "Automated sequence notification",
              company_id
            })
          } else if (step.type === "send_email" && lead.email) {
            // Same placeholder problem as the WhatsApp branch above.
            await invokeOrThrow(supabase, "send-email", {
              to_email: lead.email,
              subject: step.config?.subject ?? "Workflow Update",
              body_content: step.config?.body ?? "Automated email sequence notification",
              company_id
            })
          } else if (step.type === "change_status") {
            await supabase
              .from("leads")
              .update({ status: step.config.status })
              .eq("id", lead.id)
          }

          // Insert execution success log
          await supabase.from("automation_logs").insert({
            company_id: rule.company_id,
            rule_id: rule.id,
            lead_id: lead.id,
            trigger_type: rule.trigger_type,
            action_type: step.type,
            status: "success"
          })
        } catch (err: any) {
          console.error(err);
          Sentry.captureException(err);
          // Log failed action
          await supabase.from("automation_logs").insert({
            company_id: rule.company_id,
            rule_id: rule.id,
            lead_id: lead.id,
            trigger_type: rule.trigger_type,
            action_type: step.type,
            status: "failed",
            error_message: String(err?.message ?? err).slice(0, 500)
          })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    })
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
