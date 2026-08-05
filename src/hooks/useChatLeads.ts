import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ChatLead } from '@/types/settings';

export function useChatLeads(companyId: string | null) {
  return useQuery<ChatLead[]>({
    queryKey: ['chatLeads', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // 1. Fetch all messages for company to aggregate last message per lead
      const { data: messages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (msgError) {
        console.warn('Failed to fetch whatsapp_messages for chatLeads list:', msgError);
        throw msgError;
      }

      // Group by lead_id and aggregate last message details
      const leadsAggregation: Record<string, { last_message: string; last_message_time: string; unread_count: number }> = {};
      
      (messages || []).forEach(msg => {
        const leadId = msg.lead_id;
        if (!leadsAggregation[leadId]) {
          leadsAggregation[leadId] = {
            last_message: msg.content || '',
            last_message_time: msg.created_at,
            unread_count: msg.direction === 'incoming' && msg.status !== 'read' ? 1 : 0
          };
        } else {
          if (msg.direction === 'incoming' && msg.status !== 'read') {
            leadsAggregation[leadId].unread_count++;
          }
        }
      });

      const uniqueLeadIds = Object.keys(leadsAggregation);
      if (uniqueLeadIds.length === 0) return [];

      // 2. Query lead details for those IDs
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, phone')
        .in('id', uniqueLeadIds)
        .eq('is_deleted', false);

      if (leadsError) {
        console.error('Failed to fetch leads for chat list:', leadsError);
        throw leadsError;
      }

      return (leadsData || []).map(lead => {
        const agg = leadsAggregation[lead.id];
        return {
          lead_id: lead.id,
          lead_name: lead.name || 'Anonymous Lead',
          lead_phone: lead.phone || 'N/A',
          last_message: agg.last_message,
          last_message_time: agg.last_message_time,
          unread_count: agg.unread_count
        };
      }).sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    },
    enabled: !!companyId,
    refetchInterval: 10000 // Poll every 10 seconds
  });
}
