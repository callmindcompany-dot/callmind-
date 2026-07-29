import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useCompany } from '../CompanyContext';
import { CustomFieldDefinition } from '../types/lead';
import { toast } from 'react-hot-toast';

export function useCustomFields() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  // Query to fetch all custom fields for the company
  const query = useQuery({
    queryKey: ['customFieldDefinitions', companyId],
    queryFn: async (): Promise<CustomFieldDefinition[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  // Mutation to create a custom field definition
  const createMutation = useMutation({
    mutationFn: async (field: Omit<CustomFieldDefinition, 'id' | 'company_id' | 'created_at'>) => {
      if (!companyId) throw new Error('Company ID is required');
      
      const payload = {
        company_id: companyId,
        field_key: field.field_key,
        field_label: field.field_label,
        field_type: field.field_type,
        select_options: field.select_options || [],
        is_required: field.is_required || false,
        validation_rule: field.validation_rule || {},
        order_index: field.order_index || 0,
        is_active: true
      };

      const { data, error } = await supabase
        .from('custom_field_definitions')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFieldDefinitions', companyId] });
      toast.success('Custom field created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create custom field');
    }
  });

  // Mutation to update a custom field definition
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CustomFieldDefinition> }) => {
      if (!companyId) throw new Error('Company ID is required');

      const { error } = await supabase
        .from('custom_field_definitions')
        .update(data)
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFieldDefinitions', companyId] });
      toast.success('Custom field updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update custom field');
    }
  });

  // Mutation to delete/deactivate a custom field definition
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Company ID is required');

      const { error } = await supabase
        .from('custom_field_definitions')
        .update({ is_active: false })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFieldDefinitions', companyId] });
      toast.success('Custom field deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete custom field');
    }
  });

  return {
    fields: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createField: createMutation.mutateAsync,
    updateField: updateMutation.mutateAsync,
    deleteField: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
