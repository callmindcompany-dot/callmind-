import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { AIFaq } from '@/types/aiTraining';
import { toast } from 'react-hot-toast';

export function useAIFaqs(companyId: string | null) {
  return useQuery<AIFaq[]>({
    queryKey: ['ai_faqs', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('ai_faqs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed default FAQs
        const defaultFaqs = [
          { company_id: companyId, question: 'What is CallMind?', answer: 'CallMind is an AI-powered CRM that automates your outbound calls, registers sentiment logs, and triggers drip campaigns.' },
          { company_id: companyId, question: 'How much does it cost?', answer: 'We have flexible subscriptions starting from $49/month for standard and custom pricing for enterprise clients.' }
        ];

        const { error: seedError } = await supabase
          .from('ai_faqs')
          .insert(defaultFaqs);

        if (seedError) throw seedError;

        const { data: refetched, error: refetchError } = await supabase
          .from('ai_faqs')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true });

        if (refetchError) throw refetchError;
        return (refetched || []) as AIFaq[];
      }

      return data as AIFaq[];
    },
    enabled: !!companyId,
    staleTime: 30000,
  });
}

export function useCreateAIFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, question, answer }: { companyId: string; question: string; answer: string }) => {
      const { data, error } = await supabase
        .from('ai_faqs')
        .insert({
          company_id: companyId,
          question,
          answer
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('FAQ entry added successfully!');
      queryClient.invalidateQueries({ queryKey: ['ai_faqs'] });
    },
    onError: (err: any) => {
      toast.error('Failed to add FAQ: ' + err.message);
    }
  });
}

export function useUpdateAIFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ faqId, question, answer }: { faqId: string; question: string; answer: string }) => {
      const { data, error } = await supabase
        .from('ai_faqs')
        .update({
          question,
          answer,
          updated_at: new Date().toISOString()
        })
        .eq('id', faqId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_faqs'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update FAQ: ' + err.message);
    }
  });
}

export function useDeleteAIFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (faqId: string) => {
      const { error } = await supabase
        .from('ai_faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;
      return faqId;
    },
    onSuccess: () => {
      toast.success('FAQ entry removed.');
      queryClient.invalidateQueries({ queryKey: ['ai_faqs'] });
    },
    onError: (err: any) => {
      toast.error('Failed to delete FAQ: ' + err.message);
    }
  });
}
