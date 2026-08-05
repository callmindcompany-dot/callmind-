import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { CleanupRuleSettings, CleanupLog } from '@/types/cleanup';

// 1. Fetch settings
export function useCleanupSettings(companyId: string | null) {
  return useQuery<CleanupRuleSettings | null>({
    queryKey: ['cleanup_settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('cleanup_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Seed default cleanup settings
        const defaultSettings = {
          company_id: companyId,
          chats_enabled: true,
          logs_enabled: true,
          leads_enabled: true,
          notifications_enabled: true,
          exports_enabled: true,
          trials_enabled: true,
          next_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const { error: seedError } = await supabase
          .from('cleanup_settings')
          .insert(defaultSettings);

        if (seedError) throw seedError;
        return defaultSettings;
      }

      return data as CleanupRuleSettings;
    },
    enabled: !!companyId
  });
}

// 2. Save settings mutations
export function useUpdateCleanupSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CleanupRuleSettings> & { company_id: string }) => {
      const { data, error } = await supabase
        .from('cleanup_settings')
        .update(settings)
        .eq('company_id', settings.company_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cleanup_settings', data.company_id] });
    }
  });
}

// 3. Fetch logs
export function useCleanupLogs(companyId: string | null) {
  return useQuery<CleanupLog[]>({
    queryKey: ['cleanup_logs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('executed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as CleanupLog[];
    },
    enabled: !!companyId
  });
}

// 4. Run cleanup rule mutation
export function useExecuteCleanupRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, ruleKey }: { companyId: string; ruleKey: string }) => {
      let deletedCount = 0;
      const now = new Date();

      try {
        if (ruleKey === 'chats') {
          // Clear Old Chats (>90 days)
          const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          const { count, error } = await supabase
            .from('support_chat_history')
            .delete({ count: 'exact' })
            .eq('company_id', companyId)
            .lt('created_at', cutoff);

          if (error) throw error;
          deletedCount = count ?? 0;
        } else if (ruleKey === 'logs') {
          // Delete Old Logs (>30 days)
          const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count, error } = await supabase
            .from('audit_logs')
            .delete({ count: 'exact' })
            .eq('company_id', companyId)
            .lt('timestamp', cutoff);

          if (error) throw error;
          deletedCount = count ?? 0;
        } else if (ruleKey === 'leads') {
          // Wipe Cold Leads (>1 year)
          const cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          const { count, error } = await supabase
            .from('leads')
            .delete({ count: 'exact' })
            .eq('company_id', companyId)
            .eq('status', 'Cold')
            .lt('updated_at', cutoff);

          if (error) throw error;
          deletedCount = count ?? 0;
        } else if (ruleKey === 'notifications') {
          // Clear Notifications (>30 days) — scoped by company_id
          const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count, error } = await supabase
            .from('notifications')
            .delete({ count: 'exact' })
            .eq('company_id', companyId)
            .lt('created_at', cutoff);

          if (error) throw error;
          deletedCount = count ?? 0;
        } else if (ruleKey === 'exports') {
          // Delete Old Exports (>7 days) — scoped by company_id
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { count, error } = await supabase
            .from('export_files')
            .delete({ count: 'exact' })
            .eq('company_id', companyId)
            .lt('created_at', cutoff);

          if (error) throw error;
          deletedCount = count ?? 0;
        } else if (ruleKey === 'trials') {
          // Disabled on purpose.
          //
          // This rule used to issue DELETE on `companies` for the caller's own
          // id -- i.e. it deleted the tenant itself, taking every cascading
          // row with it. It never actually fired, because it filtered on
          // `plan = 'Trial'` (the stored value is lowercase) and on a `paid`
          // column that exists in no migration, so the query errored out.
          //
          // Normalising plan casing in 20260802000000 would have armed it.
          // Wiping a whole tenant is not something a client-side cleanup job
          // gets to do; if trial reaping is wanted it belongs in a
          // service-role job with its own review.
          throw new Error(
            'Trial cleanup is disabled. Deleting a company is not available from this screen.'
          );
        }

        // Insert log record
        const logPayload = {
          company_id: companyId,
          rule_name: ruleKey,
          records_deleted: deletedCount,
          executed_at: new Date().toISOString(),
          status: 'success' as const
        };

        const { error: logErr } = await supabase
          .from('cleanup_logs')
          .insert(logPayload);

        if (logErr) throw logErr;
        return logPayload;
      } catch (err: any) {
        // Insert failed log record
        await supabase
          .from('cleanup_logs')
          .insert({
            company_id: companyId,
            rule_name: ruleKey,
            records_deleted: 0,
            executed_at: new Date().toISOString(),
            status: 'failed'
          });
        throw err;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cleanup_logs', data.company_id] });
    }
  });
}

// 5. Danger Zone total wipe
export function useDangerZoneTotalWipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      // 1. Wipe leads
      await supabase.from('leads').delete().eq('company_id', companyId);
      // 2. Wipe calls
      await supabase.from('calls').delete().eq('company_id', companyId);
      // 3. Wipe audits
      await supabase.from('audit_logs').delete().eq('company_id', companyId);
      // 4. Log wipe action in cleanup_logs
      await supabase.from('cleanup_logs').insert({
        company_id: companyId,
        rule_name: 'total_wipe',
        records_deleted: 9999, // Master cleanup index
        executed_at: new Date().toISOString(),
        status: 'success'
      });
      return { companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cleanup_logs', data.companyId] });
      queryClient.invalidateQueries({ queryKey: ['leadsCount', data.companyId] });
    }
  });
}
