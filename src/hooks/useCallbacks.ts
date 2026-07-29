import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Callback } from '@/types/founder';
import { toast } from 'react-hot-toast';

export function useCallbacks(companyId: string | null, status: string = 'Pending') {
  return useQuery<Callback[]>({
    queryKey: ['callbacks', companyId, status],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('callbacks')
        .select(`
          *,
          lead:leads (
            id,
            name,
            phone
          )
        `)
        .eq('company_id', companyId)
        .eq('status', status)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      return (data || []) as Callback[];
    },
    enabled: !!companyId,
    refetchInterval: 10000,
    staleTime: 30000,
  });
}

export function useCompleteCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callbackId: string) => {
      const { error } = await supabase
        .from('callbacks')
        .update({ status: 'Completed' })
        .eq('id', callbackId);

      if (error) throw error;
      return callbackId;
    },
    onSuccess: () => {
      toast.success('Callback marked as completed.');
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
    onError: (err: any) => {
      toast.error('Failed to complete callback: ' + err.message);
    },
  });
}

export function useSnoozeCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callbackId, snoozeUntil }: { callbackId: string; snoozeUntil: Date }) => {
      const { error } = await supabase
        .from('callbacks')
        .update({ reminder_date: snoozeUntil.toISOString() })
        .eq('id', callbackId);

      if (error) throw error;
      return callbackId;
    },
    onSuccess: () => {
      toast.success('Callback rescheduled successfully.');
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
    onError: (err: any) => {
      toast.error('Failed to snooze callback: ' + err.message);
    },
  });
}

export function useDeleteCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callbackId: string) => {
      const { error } = await supabase
        .from('callbacks')
        .delete()
        .eq('id', callbackId);

      if (error) throw error;
      return callbackId;
    },
    onSuccess: () => {
      toast.success('Callback deleted.');
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
    onError: (err: any) => {
      toast.error('Failed to delete callback: ' + err.message);
    },
  });
}

export function usePauseAllCallbacks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('callbacks')
        .update({ status: 'Paused' })
        .eq('company_id', companyId)
        .eq('status', 'Pending');

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('All pending callbacks paused.');
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
    onError: (err: any) => {
      toast.error('Failed to pause callbacks: ' + err.message);
    },
  });
}

export function useCreateCallbackReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      leadId,
      assignedTo,
      reminderDate,
      notes,
    }: {
      companyId: string;
      leadId: string;
      assignedTo: string | null;
      reminderDate: string;
      notes: string | null;
    }) => {
      const { data, error } = await supabase
        .from('callbacks')
        .insert({
          company_id: companyId,
          lead_id: leadId,
          assigned_to: assignedTo,
          reminder_date: reminderDate,
          notes: notes,
          created_at: new Date().toISOString(),
          status: 'Pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('New callback scheduled.');
      queryClient.invalidateQueries({ queryKey: ['callbacks'] });
    },
    onError: (err: any) => {
      toast.error('Failed to schedule callback: ' + err.message);
    },
  });
}
