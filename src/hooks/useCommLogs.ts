import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface CommLog {
  id: string;
  company_id: string;
  type: 'whatsapp-draft' | 'email-draft';
  lead_name: string;
  contact: string;
  details: string;
  agent_name: string;
  created_at: string;
}

export function useCommLogs(companyId: string | null) {
  const queryClient = useQueryClient();

  const logsQuery = useQuery<CommLog[]>({
    queryKey: ['commLogs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('comm_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Failed to query comm_logs from Supabase:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
  });

  const addLogMutation = useMutation({
    mutationFn: async (newLog: Omit<CommLog, 'id' | 'company_id' | 'created_at'>) => {
      if (!companyId) throw new Error('Company ID is missing');
      const { data, error } = await supabase
        .from('comm_logs')
        .insert([{
          company_id: companyId,
          ...newLog
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commLogs', companyId] });
    },
  });

  return {
    logs: logsQuery.data || [],
    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    error: logsQuery.error,
    refetch: logsQuery.refetch,
    addLog: addLogMutation.mutateAsync,
  };
}
