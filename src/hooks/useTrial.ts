import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

export interface TrialStatus {
  trialStatus: "active" | "paused" | "extended" | "converted" | "expired";
  daysRemaining: number;
  accountStatus: "trial" | "active" | "paused" | "deleted";
  dataRetentionDate: string | null;
  day0ChecklistCompleted: boolean;
  trialStats: {
    totalLeadsImported: number;
    totalAIDrafts: number;
    totalCallsLogged: number;
    totalTeammatesInvited: number;
    checklistCompleted: number;
    upgradeModalShown: number;
    upgradeClicked: number;
    extensionRequested: number;
  } | null;
  limits: {
    maxLeads: number;
    maxAIDrafts: number;
    maxTeamSeats: number;
  } | null;
  usage: {
    leadsImported: number;
    aiDraftsUsed: number;
    teamSize: number;
    callsLogged: number;
  } | null;
}

export function useTrial() {
  const queryClient = useQueryClient();

  const trialQuery = useQuery<TrialStatus>({
    queryKey: ['trialStatus'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/trial/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch trial status');
      }
      
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });

  const extendTrialMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/trial/extend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extend trial');
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trialStatus'] });
      toast.success(data.message || 'Trial extended successfully');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const upgradeIntentMutation = useMutation({
    mutationFn: async (intent: { plan: string; seats: number; billing: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch('/api/trial/upgrade-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(intent)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit upgrade intent');
      }
      
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Upgrade request sent!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  return {
    trial: trialQuery.data,
    isLoading: trialQuery.isLoading,
    error: trialQuery.error,
    extendTrial: extendTrialMutation.mutate,
    isExtending: extendTrialMutation.isPending,
    upgradeTrial: upgradeIntentMutation.mutate,
    isUpgrading: upgradeIntentMutation.isPending,
  };
}
