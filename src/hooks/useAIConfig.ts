import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { AIConfig } from '@/types/aiTraining';
import { toast } from 'react-hot-toast';

export function useAIConfig(companyId: string | null) {
  return useQuery<AIConfig | null>({
    queryKey: ['ai_config', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('ai_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Seed default config
        const defaultConfig = {
          company_id: companyId,
          auto_call: true,
          record_calls: true,
          sentiment_analysis: true,
          voice_type: 'Professional Male (Indian)',
          system_prompt: 'You are CallMind\'s professional sales representative. Introduce yourself, ask how the customer is doing, and explain the core benefits of our CRM platform. Remain helpful, concise, and professional at all times.'
        };

        const { data: inserted, error: insertError } = await supabase
          .from('ai_config')
          .insert(defaultConfig)
          .select()
          .single();

        if (insertError) throw insertError;
        return inserted as AIConfig;
      }

      return data as AIConfig;
    },
    enabled: !!companyId,
    staleTime: 30000,
  });
}

export function useUpdateAIConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      autoCall,
      recordCalls,
      sentimentAnalysis,
      voiceType,
      systemPrompt
    }: {
      companyId: string;
      autoCall: boolean;
      recordCalls: boolean;
      sentimentAnalysis: boolean;
      voiceType: string;
      systemPrompt: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_config')
        .update({
          auto_call: autoCall,
          record_calls: recordCalls,
          sentiment_analysis: sentimentAnalysis,
          voice_type: voiceType,
          system_prompt: systemPrompt,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('AI Configuration updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['ai_config'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update AI settings: ' + err.message);
    }
  });
}
