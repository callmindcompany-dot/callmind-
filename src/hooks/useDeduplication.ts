import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCompany } from '../CompanyContext';
import { Lead } from '../types/lead';
import { DeduplicationService } from '../services/deduplication.service';
import { toast } from 'react-hot-toast';

export function useDeduplication() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [duplicateLead, setDuplicateLead] = useState<Lead | null>(null);

  const checkDuplicate = async (phone: string): Promise<Lead | null> => {
    if (!companyId) return null;
    const dup = await DeduplicationService.checkDuplicateByPhone(companyId, phone);
    setDuplicateLead(dup);
    return dup;
  };

  const mergeMutation = useMutation({
    mutationFn: async ({ existingLead, newFields }: { existingLead: Lead; newFields: Partial<Lead> }) => {
      if (!companyId) throw new Error('Company ID is required');
      return DeduplicationService.mergeLeads(companyId, existingLead, newFields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads merged successfully');
      setDuplicateLead(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to merge leads');
    }
  });

  const overwriteMutation = useMutation({
    mutationFn: async ({ existingLeadId, newFields }: { existingLeadId: string; newFields: Partial<Lead> }) => {
      if (!companyId) throw new Error('Company ID is required');
      return DeduplicationService.overwriteLead(companyId, existingLeadId, newFields);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead overwritten successfully');
      setDuplicateLead(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to overwrite lead');
    }
  });

  const clearDuplicate = () => {
    setDuplicateLead(null);
  };

  return {
    duplicateLead,
    checkDuplicate,
    clearDuplicate,
    mergeLeads: mergeMutation.mutateAsync,
    overwriteLead: overwriteMutation.mutateAsync,
    isMerging: mergeMutation.isPending,
    isOverwriting: overwriteMutation.isPending
  };
}
