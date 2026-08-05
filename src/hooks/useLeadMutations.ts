import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

/**
 * useLeadMutations
 * 
 * Provides TanStack Query mutations for bulk lead updates (assign, delete, status).
 */
export function useLeadMutations(companyId: string | null) {
  const queryClient = useQueryClient();

  // Bulk Delete Mutation with optimistic cache update & rollback logic
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, onProgress }: { ids: string[]; onProgress?: (current: number, total: number) => void }) => {
      if (!companyId) throw new Error('Company ID is required');
      const total = ids.length;
      let current = 0;
      const CHUNK_SIZE = 10;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error, count } = await supabase
          .from('leads')
          .delete({ count: 'exact' })
          .in('id', chunk)
          .eq('company_id', companyId);

        if (error) throw error;
        if (!count) throw new Error('Nothing was deleted — the leads may already be gone.');

        current += chunk.length;
        if (onProgress) {
          onProgress(current, total);
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      return { total };
    },
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      await queryClient.cancelQueries({ queryKey: ['allLeads', companyId] });

      const previousLeads = queryClient.getQueryData(['allLeads', companyId]);

      queryClient.setQueryData(['allLeads', companyId], (old: any) => {
        if (!old) return [];
        return old.filter((lead: any) => !ids.includes(lead.id));
      });

      return { previousLeads };
    },
    onError: (err: any, variables, context) => {
      console.error('Bulk delete failed:', err);
      toast.error(err.message || 'Failed to delete leads.');
      if (context?.previousLeads) {
        queryClient.setQueryData(['allLeads', companyId], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allLeads', companyId] });
    }
  });

  // Bulk Assign Mutation with optimistic cache update & rollback logic
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ ids, agentId, onProgress }: { ids: string[]; agentId: string; onProgress?: (current: number, total: number) => void }) => {
      if (!companyId) throw new Error('Company ID is required');
      const total = ids.length;
      let current = 0;
      const CHUNK_SIZE = 10;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('leads')
          .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
          .in('id', chunk)
          .eq('company_id', companyId);

        if (error) throw error;

        current += chunk.length;
        if (onProgress) {
          onProgress(current, total);
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      return { total };
    },
    onMutate: async ({ ids, agentId }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      await queryClient.cancelQueries({ queryKey: ['allLeads', companyId] });

      const previousLeads = queryClient.getQueryData(['allLeads', companyId]);

      queryClient.setQueryData(['allLeads', companyId], (old: any) => {
        if (!old) return [];
        return old.map((lead: any) => {
          if (ids.includes(lead.id)) {
            return { ...lead, assignedTo: agentId };
          }
          return lead;
        });
      });

      return { previousLeads };
    },
    onError: (err: any, variables, context) => {
      console.error('Bulk assignment failed:', err);
      toast.error(err.message || 'Failed to assign leads.');
      if (context?.previousLeads) {
        queryClient.setQueryData(['allLeads', companyId], context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allLeads', companyId] });
    }
  });

  // Bulk Status Mutation with optimistic cache update & rollback logic
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status, onProgress }: { ids: string[]; status: string; onProgress?: (current: number, total: number) => void }) => {
      if (!companyId) throw new Error('Company ID is required');
      const total = ids.length;
      let current = 0;
      const CHUNK_SIZE = 10;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('leads')
          .update({ status, updated_at: new Date().toISOString() })
          .in('id', chunk)
          .eq('company_id', companyId);

        if (error) throw error;

        current += chunk.length;
        if (onProgress) {
          onProgress(current, total);
        }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      return { total };
    },
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      await queryClient.cancelQueries({ queryKey: ['allLeads', companyId] });

      const previousLeads = queryClient.getQueryData(['allLeads', companyId]);

      queryClient.setQueryData(['allLeads', companyId], (old: any) => {
        if (!old) return [];
        return old.map((lead: any) => {
          if (ids.includes(lead.id)) {
            return { ...lead, status };
          }
          return lead;
        });
      });

      return { previousLeads };
    },
    onError: (err: any, variables, context) => {
      console.error('Bulk status update failed:', err);
      toast.error(err.message || 'Failed to update status.');
      if (context?.previousLeads) {
        queryClient.setQueryData(['allLeads', companyId], context.previousLeads);
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Updated status to ${variables.status} for selected leads!`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allLeads', companyId] });
    }
  });

  return {
    bulkDeleteMutation,
    bulkAssignMutation,
    bulkStatusMutation
  };
}
