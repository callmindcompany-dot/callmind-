import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface GeographicData {
  city: string;
  lead_count: number;
  conversions: number;
}

export interface LostReasonData {
  reason: string;
  count: number;
}

export interface LeadStatusPipelineData {
  status: string;
  count: number;
}

export interface SourceYieldData {
  source: string;
  lead_count: number;
  conversions: number;
}

export function useGeographicDistribution(companyId: string | null) {
  return useQuery<GeographicData[]>({
    queryKey: ['reports', 'geographic', companyId],
    queryFn: async (): Promise<GeographicData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_geographic_distribution', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export function useLostReasons(companyId: string | null) {
  return useQuery<LostReasonData[]>({
    queryKey: ['reports', 'lostReasons', companyId],
    queryFn: async (): Promise<LostReasonData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_lost_reasons', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export function useLeadStatusPipeline(companyId: string | null) {
  return useQuery<LeadStatusPipelineData[]>({
    queryKey: ['reports', 'leadStatusPipeline', companyId],
    queryFn: async (): Promise<LeadStatusPipelineData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_lead_status_pipeline', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export function useSourceConversions(companyId: string | null) {
  return useQuery<SourceYieldData[]>({
    queryKey: ['reports', 'sourceConversions', companyId],
    queryFn: async (): Promise<SourceYieldData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_source_conversions', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export interface AgentTATData {
  agent_id: string;
  agent_name: string;
  avg_tat_minutes: number;
}

export interface RevenuePipelineData {
  status: string;
  total_value: number;
  lead_count: number;
}

export interface DetailedChurnData {
  reason: string;
  count: number;
}

export function useAgentTAT(companyId: string | null) {
  return useQuery<AgentTATData[]>({
    queryKey: ['reports', 'agentTAT', companyId],
    queryFn: async (): Promise<AgentTATData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_agent_tat', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export function useRevenuePipeline(companyId: string | null) {
  return useQuery<RevenuePipelineData[]>({
    queryKey: ['reports', 'revenuePipeline', companyId],
    queryFn: async (): Promise<RevenuePipelineData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_revenue_pipeline', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export function useDetailedChurn(companyId: string | null) {
  return useQuery<DetailedChurnData[]>({
    queryKey: ['reports', 'detailedChurn', companyId],
    queryFn: async (): Promise<DetailedChurnData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_detailed_churn', { p_company_id: companyId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
