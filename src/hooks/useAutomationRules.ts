import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AutomationRule } from '@/types/settings';

export function useAutomationRules(companyId: string | null) {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery<AutomationRule[]>({
    queryKey: ['automationRules', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to query automation_rules from Supabase:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!companyId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: Omit<AutomationRule, 'id' | 'company_id'>) => {
      if (!companyId) throw new Error('Company ID is missing');
      const { data, error } = await supabase
        .from('automation_rules')
        .insert([{ ...rule, company_id: companyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules', companyId] });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async (rule: Partial<AutomationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('automation_rules')
        .update(rule)
        .eq('id', rule.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules', companyId] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules', companyId] });
    },
  });

  return {
    rules: rulesQuery.data || [],
    isLoading: rulesQuery.isLoading,
    createRule: createRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutateAsync,
  };
}
