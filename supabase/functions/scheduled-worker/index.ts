import { Sentry } from "../_shared/sentry.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Query due pending scheduled messages
    const now = new Date().toISOString()
    const { data: messages, error } = await supabase
      .from("scheduled_messages")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)

    if (error) throw error

    for (const msg of messages || []) {
      // 1. Check if lead has opted out
      const { data: lead } = await supabase
        .from("leads")
        .select("opted_out, phone, email")
        .eq("id", msg.lead_id)
        .single()

      if (lead?.opted_out) {
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed", error_message: "Lead opted out of communication" })
          .eq("id", msg.id)
        continue
      }

      // 2. Dispatch campaign depending on outbox channel
      try {
        if (msg.channel === "whatsapp" && lead?.phone) {
          // Invoke outbound Meta API
          await supabase.functions.invoke("send-whatsapp-message", {
            body: {
              lead_id: msg.lead_id,
              lead_phone: lead.phone,
              message_content: msg.content,
              company_id: msg.company_id
            }
          })
        } else if (msg.channel === "email" && lead?.email) {
          // Invoke SMTP Relay
          await supabase.functions.invoke("send-email", {
            body: {
              to_email: lead.email,
              subject: msg.subject || "Relayed Message",
              body_content: msg.content,
              company_id: msg.company_id
            }
          })
        }

        // Mark as sent successfully
        await supabase
          .from("scheduled_messages")
          .update({ status: "sent" })
          .eq("id", msg.id)
      } catch (err: any) {
        console.error(err);
        Sentry.captureException(err);
        await supabase
          .from("scheduled_messages")
          .update({ status: "failed", error_message: 'Internal server error' })
          .eq("id", msg.id)
      }
    }

    return new Response(JSON.stringify({ processed: (messages || []).length }), { headers: { "Content-Type": "application/json" } })
  } catch (err: any) {
    console.error(err);
    Sentry.captureException(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})
