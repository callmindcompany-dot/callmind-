import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { WhatsAppMessage } from '@/types/settings';

export function useChatMessages(companyId: string | null, selectedLeadId: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ['chatMessages', companyId, selectedLeadId],
    queryFn: async () => {
      if (!companyId || !selectedLeadId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('company_id', companyId)
        .eq('lead_id', selectedLeadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Failed to query messages list:', error);
        throw error;
      }

      // Mark incoming messages as read when fetched/opened in window
      const unreadIncomingIds = (data || [])
        .filter(m => m.direction === 'incoming' && m.status !== 'read')
        .map(m => m.id);

      if (unreadIncomingIds.length > 0) {
        supabase
          .from('whatsapp_messages')
          .update({ status: 'read' })
          .in('id', unreadIncomingIds)
          .then(({ error: updateError }) => {
            if (updateError) console.warn('Failed to update read status:', updateError);
          });
      }

      return (data || []).map((m: any) => ({
        id: m.id,
        company_id: m.company_id,
        lead_id: m.lead_id,
        agent_id: m.agent_id,
        direction: m.direction,
        message_type: m.message_type,
        content: m.content,
        status: m.status,
        metadata: m.metadata,
        whatsapp_message_id: m.whatsapp_message_id,
        created_at: m.created_at
      }));
    },
    enabled: !!companyId && !!selectedLeadId,
    refetchInterval: 5000 // Poll every 5 seconds
  });
}
