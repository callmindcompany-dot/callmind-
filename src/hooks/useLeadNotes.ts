import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

export type LeadNote = Database['public']['Tables']['lead_notes']['Row'];

/**
 * useLeadNotes
 * 
 * Fetches notes for a specific lead.
 */
export function useLeadNotes(leadId: string, companyId: string | null) {
  return useQuery<LeadNote[]>({
    queryKey: ['leadNotes', leadId],
    queryFn: async (): Promise<LeadNote[]> => {
      if (!companyId || !leadId) return [];
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch lead notes:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId && !!leadId,
  });
}

/**
 * useCreateLeadNote
 * 
 * Creates a new note for a lead and automatically inserts a record into the activity log.
 */
export function useCreateLeadNote(leadId: string, companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, authorId, authorName }: { content: string; authorId: string | null; authorName: string | null }) => {
      if (!companyId || !leadId) throw new Error('Missing companyId or leadId');

      const { data, error } = await supabase
        .from('lead_notes')
        .insert({
          company_id: companyId,
          lead_id: leadId,
          content,
          author_id: authorId,
          author_name: authorName,
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error('Failed to create lead note:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadNotes', leadId] });
      
      // Post activity record to lead_activity_log for timeline display
      if (companyId) {
        supabase
          .from('lead_activity_log')
          .insert({
            company_id: companyId,
            lead_id: leadId,
            activity_type: 'note',
            description: 'New note added',
            created_at: new Date().toISOString(),
          })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['leadActivity', leadId] });
          });
      }
    },
  });
}
