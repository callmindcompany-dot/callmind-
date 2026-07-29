import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Sequence, SequenceNode } from '@/types/sequences';
import { toast } from 'react-hot-toast';

export function useSequences(companyId: string | null) {
  return useQuery<Sequence[]>({
    queryKey: ['sequences', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('sequences')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed default templates
        const defaultTemplates = [
          {
            company_id: companyId,
            name: 'New Lead Welcome Sequence',
            enrolled: 1280,
            completion: 88,
            success_rate: 14.5,
            status: 'active',
            nodes: [
              { id: 'node_1', type: 'trigger', title: 'Lead Form Submitted' },
              { id: 'node_2', type: 'delay', title: 'Wait 5 Minutes', delay: '5 Minutes' },
              { id: 'node_3', type: 'whatsapp', title: 'Outbound Welcome WhatsApp', content: 'Hello {{name}}! Welcome to CallMind. How can we help you today?' },
              { id: 'node_4', type: 'delay', title: 'Wait 1 Hour', delay: '1 Hour' },
              { id: 'node_5', type: 'email', title: 'Follow-up Email Briefing', content: 'Check out our services...' }
            ]
          },
          {
            company_id: companyId,
            name: 'Cold Leads Re-engagement Campaign',
            enrolled: 3200,
            completion: 42,
            success_rate: 6.8,
            status: 'paused',
            nodes: [
              { id: 'node_1', type: 'trigger', title: 'Lead Status is Cold' },
              { id: 'node_2', type: 'whatsapp', title: 'Outbound Catch-up WhatsApp', content: 'Long time no see, {{name}}! Are you still looking for premium properties?' }
            ]
          }
        ];

        const { error: seedError } = await supabase
          .from('sequences')
          .insert(defaultTemplates);

        if (seedError) throw seedError;

        const { data: refetched, error: refetchError } = await supabase
          .from('sequences')
          .select('*')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false });

        if (refetchError) throw refetchError;
        return (refetched || []) as Sequence[];
      }

      return data as Sequence[];
    },
    enabled: !!companyId,
    staleTime: 30000,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, name }: { companyId: string; name: string }) => {
      const { data, error } = await supabase
        .from('sequences')
        .insert({
          company_id: companyId,
          name,
          enrolled: 0,
          completion: 0,
          success_rate: 0,
          status: 'active',
          nodes: [
            { id: 'node_1', type: 'trigger', title: 'Lead Subscribed to Campaign' }
          ]
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sequence "${data.name}" created!`);
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
    onError: (err: any) => {
      toast.error('Failed to create sequence: ' + err.message);
    }
  });
}

export function useUpdateSequenceNodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sequenceId, nodes }: { sequenceId: string; nodes: SequenceNode[] }) => {
      const { data, error } = await supabase
        .from('sequences')
        .update({
          nodes,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequenceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Campaign flow saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
    onError: (err: any) => {
      toast.error('Failed to save campaign flow: ' + err.message);
    }
  });
}

export function useToggleSequenceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sequenceId, currentStatus }: { sequenceId: string; currentStatus: 'active' | 'paused' }) => {
      const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
      const { data, error } = await supabase
        .from('sequences')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', sequenceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sequence is now ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
    onError: (err: any) => {
      toast.error('Failed to toggle sequence status: ' + err.message);
    }
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sequenceId: string) => {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', sequenceId);

      if (error) throw error;
      return sequenceId;
    },
    onSuccess: () => {
      toast.success('Sequence deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
    onError: (err: any) => {
      toast.error('Failed to delete sequence: ' + err.message);
    }
  });
}
