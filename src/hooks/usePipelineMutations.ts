import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';

type Lead = Database['public']['Tables']['leads']['Row'];

/**
 * usePipelineMutations
 * 
 * Provides persistent status update mutation with optimistic queries rendering updates and rolls back on failure.
 */
export function usePipelineMutations(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: string; newStatus: string }) => {
      if (!companyId) throw new Error('Missing companyId');

      const { data, error } = await supabase
        .from('leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .eq('company_id', companyId)
        .select();

      if (error) {
        console.error('Failed to update lead status:', error);
        throw error;
      }
      return data;
    },
    onMutate: async ({ leadId, newStatus }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['pipelineLeads', companyId] });

      // Snapshot previous leads list
      const previousLeads = queryClient.getQueryData<Lead[]>(['pipelineLeads', companyId]);

      // Optimistically update query cache
      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(
          ['pipelineLeads', companyId],
          previousLeads.map(lead =>
            lead.id === leadId ? { ...lead, status: newStatus } : lead
          )
        );
      }

      return { previousLeads };
    },
    onError: (err, variables, context) => {
      // Rollback to snapshotted state on error
      if (context?.previousLeads) {
        queryClient.setQueryData(['pipelineLeads', companyId], context.previousLeads);
      }
      toast.error('Failed to update lead status. Reverted.');
    },
    onSettled: () => {
      // Re-sync query cache with DB
      queryClient.invalidateQueries({ queryKey: ['pipelineLeads', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', companyId] });
    }
  });
}
