import { useMutation } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * useCreateCallback
 * 
 * Inserts a new follow-up reminder into the callbacks table.
 */
export function useCreateCallback() {
  return useMutation({
    mutationFn: async ({
      companyId,
      leadId,
      assignedTo,
      reminderDate,
      notes,
    }: {
      companyId: string;
      leadId: string;
      assignedTo: string | null;
      reminderDate: string;
      notes: string | null;
    }) => {
      const { data, error } = await supabase
        .from('callbacks')
        .insert({
          company_id: companyId,
          lead_id: leadId,
          assigned_to: assignedTo,
          reminder_date: reminderDate,
          notes: notes,
          created_at: new Date().toISOString(),
          status: 'Pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create callback reminder:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Follow-up reminder scheduled successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to schedule follow-up reminder');
    },
  });
}
