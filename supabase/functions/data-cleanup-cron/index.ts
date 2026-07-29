import { Sentry } from "../_shared/sentry.ts";
// Deno Edge Function: data-cleanup-cron
// Schedule: Daily at 2:00 AM IST

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Missing environment credentials." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fix 4: Fetch all companies with cleanup settings so we can process each tenant separately
    const { data: allSettings, error: settingsErr } = await supabase
      .from('cleanup_settings')
      .select('company_id, chats_enabled, logs_enabled, leads_enabled, notifications_enabled, exports_enabled, trials_enabled');

    if (settingsErr) throw settingsErr;

    const companySummary: Record<string, Record<string, number>> = {};

    // Fix 4: Loop per company, respecting their toggle settings
    for (const setting of (allSettings ?? [])) {
      const cid = setting.company_id;
      const logDetails: Record<string, number> = {};

      // 1. WhatsApp messages (>90 days) — scoped by company_id
      if (setting.chats_enabled) {
        const { count: count1 } = await supabase
          .from('whatsapp_messages')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['whatsapp_messages'] = count1 || 0;

        // 2. Support chat history (>60 days) — scoped by company_id
        const { count: count2 } = await supabase
          .from('support_chat_history')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['support_chat_history'] = count2 || 0;

        // 3. AI chat messages (>30 days) — scoped by company_id
        const { count: count3 } = await supabase
          .from('ai_chat_messages')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['ai_chat_messages'] = count3 || 0;
      }

      // 4. Audit logs (>15 days) — scoped by company_id
      if (setting.logs_enabled) {
        const { count: count4 } = await supabase
          .from('audit_logs')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('timestamp', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['audit_logs'] = count4 || 0;

        // 5. Webhook logs (>30 days) — scoped by company_id
        const { count: count5 } = await supabase
          .from('webhook_logs')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['webhook_logs'] = count5 || 0;

        // 6. Automation logs (>30 days) — scoped by company_id
        const { count: count6 } = await supabase
          .from('automation_logs')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['automation_logs'] = count6 || 0;

        // 7. Activity stream (>60 days) — scoped by company_id
        const { count: count7 } = await supabase
          .from('activity_stream')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['activity_stream'] = count7 || 0;

        // 8. Archive Announcements (>30 days) — scoped by company_id
        const { error: err8 } = await supabase
          .from('announcements')
          .update({ is_archived: true })
          .eq('company_id', cid)
          .lt('published_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['announcements_archived'] = err8 ? 0 : 1;
      }

      // 9. Notifications (>30 days) — scoped by company_id
      if (setting.notifications_enabled) {
        const { count: count9 } = await supabase
          .from('notifications')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['notifications'] = count9 || 0;
      }

      // 10. Export files (>7 days) — scoped by company_id
      if (setting.exports_enabled) {
        const { count: count10 } = await supabase
          .from('export_files')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['export_files'] = count10 || 0;
      }

      // 11 + 12. Leads cleanup — scoped by company_id
      if (setting.leads_enabled) {
        // Soft-delete cold/rejected leads (>365 days)
        await supabase
          .from('leads')
          .update({ deleted_at: new Date().toISOString() })
          .eq('company_id', cid)
          .in('status', ['Cold', 'Rejected'])
          .lt('updated_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

        // Permanent delete previously soft-deleted leads (>30 days)
        const { count: count12 } = await supabase
          .from('leads')
          .delete({ count: 'exact' })
          .eq('company_id', cid)
          .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['leads_permanently_deleted'] = count12 || 0;
      }

      // 13. Delete expired trials — only own tenant
      if (setting.trials_enabled) {
        const { count: count13 } = await supabase
          .from('companies')
          .delete({ count: 'exact' })
          .eq('id', cid)
          .eq('plan', 'Trial')
          .eq('paid', false)
          .lt('trial_ends_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
        logDetails['companies_trials_deleted'] = count13 || 0;
      }

      // Save per-company consolidated log
      const totalRecords = Object.values(logDetails).reduce((a, b) => a + b, 0);
      await supabase.from('cleanup_logs').insert({
        company_id: cid,
        rule_name: 'automated_cron_2am',
        records_deleted: totalRecords,
        executed_at: new Date().toISOString(),
        status: 'success'
      });

      companySummary[cid] = logDetails;
    }

    // Fix 3: Update next_run_at to 24h from now for all cleanup_settings rows
    const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('cleanup_settings')
      .update({ next_run_at: nextRun });

    return new Response(JSON.stringify({ status: "success", companySummary }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: unknown) {
    console.error(error);
    Sentry.captureException(error);
    return new Response(JSON.stringify({ status: "failed", error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
