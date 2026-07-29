import { useMutation } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export interface SupportTicketInput {
  title: string;
  description: string;
  steps: string;
  priority: 'low' | 'medium' | 'high';
  client_health_score: number;
  user_email: string;
  user_name: string;
  user_designation?: string;
  user_phone?: string;
  company_name?: string;
  company_id: string;
  os_info: string;
  browser_info: string;
  network_latency: string;
}

export function useCreateSupportTicket() {
  return useMutation({
    mutationFn: async (ticketInput: SupportTicketInput) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          title: ticketInput.title,
          description: ticketInput.description,
          steps: ticketInput.steps,
          priority: ticketInput.priority,
          client_health_score: ticketInput.client_health_score,
          user_email: ticketInput.user_email,
          user_name: ticketInput.user_name,
          user_designation: ticketInput.user_designation,
          user_phone: ticketInput.user_phone,
          company_name: ticketInput.company_name,
          company_id: ticketInput.company_id,
          os_info: ticketInput.os_info,
          browser_info: ticketInput.browser_info,
          network_latency: ticketInput.network_latency,
          status: 'open'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create support ticket:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Ticket submitted! We'll get back to you soon.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit ticket. Please try again.");
    }
  });
}
