import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { RoadmapFeature, FeatureFlag, CoFounder } from '@/types/roadmapCofounder';

// 1. Feature Roadmap Hooks
export function useRoadmapFeatures() {
  return useQuery<RoadmapFeature[]>({
    queryKey: ['feature_roadmap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_roadmap')
        .select('*')
        .order('phase', { ascending: true })
        .order('votes', { ascending: false });

      if (error) throw error;
      return (data || []) as RoadmapFeature[];
    }
  });
}

export function useUpvoteFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: string) => {
      // Fetch current votes
      const { data: current, error: getErr } = await supabase
        .from('feature_roadmap')
        .select('votes')
        .eq('id', featureId)
        .single();
      
      if (getErr) throw getErr;

      const { data, error } = await supabase
        .from('feature_roadmap')
        .update({ votes: (current?.votes || 0) + 1 })
        .eq('id', featureId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature_roadmap'] });
    }
  });
}

export function useCreateRoadmapFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: Omit<RoadmapFeature, 'id' | 'votes' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('feature_roadmap')
        .insert({ ...feature, votes: 0 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature_roadmap'] });
    }
  });
}

export function useUpdateRoadmapFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: Partial<RoadmapFeature> & { id: string }) => {
      const { data, error } = await supabase
        .from('feature_roadmap')
        .update(feature)
        .eq('id', feature.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature_roadmap'] });
    }
  });
}

export function useDeleteRoadmapFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: string) => {
      const { error, count } = await supabase
        .from('feature_roadmap')
        .delete({ count: 'exact' })
        .eq('id', featureId);

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the record may already be gone.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature_roadmap'] });
    }
  });
}

// 2. Feature Flags Hooks
export function useFeatureFlags() {
  return useQuery<FeatureFlag[]>({
    queryKey: ['feature_flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feature_flags').select('*');
      if (error) throw error;
      return (data || []) as FeatureFlag[];
    }
  });
}

export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { data, error } = await supabase
        .from('feature_flags')
        .upsert({ key, value, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature_flags'] });
    }
  });
}

// 3. Co-founders Team Hooks
export function useCofounders(companyId: string | null) {
  return useQuery<CoFounder[]>({
    queryKey: ['cofounders', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('cofounders')
        .select('*')
        .eq('company_id', companyId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CoFounder[];
    },
    enabled: !!companyId
  });
}

export function useInviteCofounder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cofounder: Omit<CoFounder, 'id' | 'status' | 'invited_at'>) => {
      const { data, error } = await supabase
        .from('cofounders')
        .insert({
          ...cofounder,
          status: 'Pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: CoFounder) => {
      queryClient.invalidateQueries({ queryKey: ['cofounders', data.company_id] });
    }
  });
}

export function useUpdateCofounderPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: CoFounder['permissions'] }) => {
      const { data, error } = await supabase
        .from('cofounders')
        .update({ permissions })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: CoFounder) => {
      queryClient.invalidateQueries({ queryKey: ['cofounders', data.company_id] });
    }
  });
}

export function useRevokeCofounderAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('cofounders')
        .update({ status: 'Revoked' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: CoFounder) => {
      queryClient.invalidateQueries({ queryKey: ['cofounders', data.company_id] });
    }
  });
}
