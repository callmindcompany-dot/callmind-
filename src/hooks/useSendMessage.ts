import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { WhatsAppMessage } from '@/types/settings';

interface SendMessageInput {
  leadId: string;
  leadPhone: string;
  content: string;
  agentId: string | null;
}

export function useSendMessage(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, leadPhone, content, agentId }: SendMessageInput) => {
      if (!companyId) throw new Error('Company ID is missing');

      // 1. Create message log in Supabase whatsapp_messages table
      const tempId = crypto.randomUUID();
      const newMessage = {
        id: tempId,
        company_id: companyId,
        lead_id: leadId,
        agent_id: agentId,
        direction: 'outgoing',
        message_type: 'text',
        content: content,
        status: 'sent',
        metadata: null as Record<string, any> | null,
        whatsapp_message_id: null as string | null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([newMessage])
        .select()
        .single();

      if (error) {
        console.warn('DB Log Insertion failed, using optimistic state fallback:', error);
      }

      // 2. Invoke Edge Function to trigger outbound API campaign
      try {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            lead_id: leadId,
            lead_phone: leadPhone,
            message_content: content,
            company_id: companyId
          }
        });

        if (edgeError) throw edgeError;

        if (edgeData?.success && data) {
          // Update status to delivered/sent successfully
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'delivered', whatsapp_message_id: edgeData.whatsapp_message_id })
            .eq('id', data.id);
        }
      } catch (err) {
        console.warn('WhatsApp API disconnected, logged locally.', err);
      }

      return data || newMessage;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['chatMessages', companyId, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['chatLeads', companyId] });
    }
  });
}
