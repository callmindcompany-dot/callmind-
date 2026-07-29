import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { LeadService } from '../services/leads.service';
import { LeadFilters, LeadFormData, Lead } from '../types/lead';
import { toast } from 'react-hot-toast';
import { useCompany } from '../CompanyContext';

/**
 * Hook for lead list with infinite scroll/pagination
 */
export function useLeads(filters?: LeadFilters) {
  const { companyId } = useCompany();
  
  return useInfiniteQuery({
    queryKey: ['leads', companyId, filters],
    queryFn: ({ pageParam }) => LeadService.fetchLeads(companyId!, filters, pageParam),
    enabled: !!companyId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage?.nextPage || undefined,
    staleTime: 30000,
  });
}

/**
 * Hook for a single lead's detail
 */
export function useLeadDetail(leadId: string | null) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ['lead', companyId, leadId],
    queryFn: () => (leadId && companyId ? LeadService.fetchLeadById(companyId, leadId) : null),
    enabled: !!leadId && !!companyId,
  });
}

/**
 * Mutation for creating a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: (data: LeadFormData) => {
      if (!companyId) throw new Error('Company ID is required');
      return LeadService.createLead(companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create lead');
    },
  });
}

/**
 * Mutation for updating a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => {
      if (!companyId) throw new Error('Company ID is required');
      return LeadService.updateLead(companyId, id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', companyId, variables.id] });
      toast.success('Lead updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update lead');
    },
  });
}

/**
 * Mutation for deleting a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: (id: string) => {
      if (!companyId) throw new Error('Company ID is required');
      return LeadService.deleteLead(companyId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete lead');
    },
  });
}

/**
 * Mutation for bulk assignment
 */
export function useBulkAssign() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();

  return useMutation({
    mutationFn: ({ leadIds, userId }: { leadIds: string[]; userId: string }) => {
      if (!companyId) throw new Error('Company ID is required');
      return LeadService.bulkAssign(companyId, leadIds, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads assigned successfully');
    },
  });
}
