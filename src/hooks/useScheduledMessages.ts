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
        return [];
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
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages', companyId] });
    }
  });

  return {
    scheduledMessages: query.data || [],
    isLoading: query.isLoading,
    scheduleMessage: scheduleMutation.mutateAsync,
    cancelScheduledMessage: cancelMutation.mutateAsync
  };
}
