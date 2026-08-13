import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

interface SendMessageInput {
  leadId: string;
  leadPhone: string;
  content: string;
  agentId: string | null;
}

/**
 * Sends a WhatsApp message to a lead, and fails when it cannot.
 *
 * The previous version did the two steps in the wrong order and swallowed the
 * result of the one that mattered. It wrote a whatsapp_messages row with
 * status 'sent' first, then invoked the edge function inside a try/catch whose
 * handler was `console.warn('WhatsApp API disconnected, logged locally.')`.
 * Every failure -- unconfigured company, network error, the function not being
 * implemented at all -- landed there, the mutation resolved, onSuccess fired,
 * and the thread showed the message as sent. The lead was never contacted, and
 * there was no way to tell from inside the product.
 *
 * Dispatch first, record second. A row in whatsapp_messages should mean a
 * message left the building; if nothing was sent, nothing is written and the
 * caller gets an error to render.
 *
 * Sending is currently not available at all -- send-whatsapp-message answers
 * 501 because the Graph API call was never written -- so in practice this
 * always throws today. That is the point: it is the visible version of what was
 * already true.
 */
export function useSendMessage(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, leadPhone, content, agentId }: SendMessageInput) => {
      if (!companyId) throw new Error('Company ID is missing');

      // 1. Dispatch. Nothing is recorded until this succeeds.
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        'send-whatsapp-message',
        { body: { lead_id: leadId, lead_phone: leadPhone, message_content: content, company_id: companyId } },
      );

      if (edgeError) {
        throw new Error(
          edgeError.message || 'WhatsApp message could not be sent. Nothing was delivered.',
        );
      }
      if (!edgeData?.success) {
        throw new Error(
          edgeData?.message || 'WhatsApp message could not be sent. Nothing was delivered.',
        );
      }

      // 2. Record what was actually sent, with the id the provider returned.
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .insert([{
          id: crypto.randomUUID(),
          company_id: companyId,
          lead_id: leadId,
          agent_id: agentId,
          direction: 'outgoing',
          message_type: 'text',
          content,
          status: 'sent',
          metadata: null,
          whatsapp_message_id: edgeData.whatsapp_message_id ?? null,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      // The message did go out, so this is not a send failure -- but it is a
      // lost record, and silently discarding it is how the thread and reality
      // drift apart.
      if (error) throw error;

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', companyId, variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ['chatLeads', companyId] });
    },
  });
}
