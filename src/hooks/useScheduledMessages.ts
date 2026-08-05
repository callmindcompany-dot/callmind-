import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface ScheduledMessage {
  id: string;
  company_id: string;
  lead_id: string;
  channel: 'whatsapp' | 'email';
  content: string;
  subject?: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  created_at?: string;
}

export function useScheduledMessages(companyId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<ScheduledMessage[]>({
    queryKey: ['scheduledMessages', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.warn('Failed to load scheduled messages:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId
  });

  const scheduleMutation = useMutation({
    mutationFn: async (msg: Omit<ScheduledMessage, 'id' | 'company_id' | 'status'>) => {
      if (!companyId) throw new Error('Company ID is missing');
      const { data, error } = await supabase
        .from('scheduled_messages')
        .insert([{ ...msg, company_id: companyId, status: 'pending' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages', companyId] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      let query = supabase
        .from('scheduled_messages')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { error, count } = await query;

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the record may already be gone.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages', companyId] });
    }
  });

  return {
    scheduledMessages: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    scheduleMessage: scheduleMutation.mutateAsync,
    cancelScheduledMessage: cancelMutation.mutateAsync
  };
}
