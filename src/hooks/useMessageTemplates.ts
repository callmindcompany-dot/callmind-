import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface MessageTemplate {
  id: string;
  company_id: string;
  name: string;
  content: string;
  type: 'whatsapp' | 'email';
  created_at?: string;
  updated_at?: string;
}

export function useMessageTemplates(companyId: string | null) {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery<MessageTemplate[]>({
    queryKey: ['messageTemplates', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to query message_templates from Supabase:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'company_id'>) => {
      if (!companyId) throw new Error('Company ID is missing');
      const { data, error } = await supabase
        .from('message_templates')
        .insert([{ ...template, company_id: companyId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates', companyId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update(template)
        .eq('id', template.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates', companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      let query = supabase
        .from('message_templates')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { error, count } = await query;

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the record may already be gone.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates', companyId] });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    isError: templatesQuery.isError,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
  };
}
