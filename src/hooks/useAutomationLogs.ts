import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface AutomationLog {
  id: string;
  rule_id: string | null;
  rule_name?: string;
  lead_id: string;
  lead_name?: string;
  trigger_type: string;
  action_type: string;
  status: 'success' | 'failed';
  error_message?: string;
  executed_at: string;
}

export function useAutomationLogs(companyId: string | null) {
  return useQuery<AutomationLog[]>({
    queryKey: ['automationLogs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // 1. Fetch raw logs
      const { data: logs, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('executed_at', { ascending: false });

      if (error) {
        console.warn('Failed to query automation_logs:', error);
        throw error;
      }

      if (!logs || logs.length === 0) return [];

      // 2. Query related rules to map names
      const { data: rules } = await supabase
        .from('automation_rules')
        .select('id, name')
        .eq('company_id', companyId);

      const ruleMap = new Map(rules?.map(r => [r.id, r.name]) || []);

      // 3. Query related leads to map names
      const leadIds = logs.map(l => l.lead_id).filter(Boolean);
      let leadMap = new Map<string, string>();
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, name')
          .in('id', leadIds);
        leadMap = new Map(leads?.map(l => [l.id, l.name]) || []);
      }

      return logs.map(log => ({
        ...log,
        rule_name: ruleMap.get(log.rule_id || '') || 'Unknown Rule',
        lead_name: leadMap.get(log.lead_id) || 'Unknown Lead'
      })) as AutomationLog[];
    },
    enabled: !!companyId,
  });
}
