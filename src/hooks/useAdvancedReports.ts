import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { resolveDateWindow, type ReportFilters } from '@/lib/reportFilters';

/**
 * The six charts that used to answer for all time.
 *
 * Every function behind these raised 42883 on every call until
 * 20260820000400 -- p_company_id was declared UUID and compared to a TEXT
 * column -- and the page dropped the error, so six charts rendered empty and
 * looked like six quiet weeks.
 *
 * They take a date window now. Passing the resolved window rather than the
 * period name keeps them on the same boundaries as every other report: the
 * bounds are half-open, [from, to), computed once in reportFilters.
 */

export interface GeographicData {
  city: string;
  lead_count: number;
  /** Leads carrying a deal value, not leads whose status spells "converted". */
  conversions: number;
  deal_value: number;
}

export interface LostReasonData {
  reason: string;
  count: number;
}

export interface DetailedChurnData {
  reason: string;
  count: number;
  /** Estimated budget on the lost leads -- what the loss may have cost. */
  lost_value: number;
}

export interface LeadStatusPipelineData {
  status: string;
  count: number;
}

export interface SourceConversionData {
  source: string;
  lead_count: number;
  conversions: number;
}

export interface RevenuePipelineData {
  status: string;
  /** Money committed. Never added to estimated_value. */
  total_value: number;
  /** What the caller guessed the customer might spend. */
  estimated_value: number;
  lead_count: number;
}

export interface AgentTATData {
  agent_id: string;
  agent_name: string | null;
  avg_tat_minutes: number;
  leads_measured: number;
}

/** The arguments every one of these functions now takes. */
function windowArgs(companyId: string, filters: ReportFilters) {
  const w = resolveDateWindow(filters.dateRange, filters.customRange);
  return {
    p_company_id: companyId,
    p_from: w.fromInstant,
    p_to: w.toInstant,
  };
}

/**
 * One shape for all of them, so a new chart cannot quietly skip the window or
 * swallow its own error.
 */
function useReportRpc<T>(key: string, fn: string, companyId: string | null, filters: ReportFilters) {
  return useQuery<T[]>({
    queryKey: ['reports', key, companyId, filters],
    queryFn: async (): Promise<T[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc(fn, windowArgs(companyId, filters));
      if (error) throw error;
      return (data ?? []) as T[];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}

export const useGeographicDistribution = (companyId: string | null, filters: ReportFilters) =>
  useReportRpc<GeographicData>('geographic', 'get_geographic_distribution', companyId, filters);

export const useLostReasons = (companyId: string | null, filters: ReportFilters) =>
  useReportRpc<LostReasonData>('lostReasons', 'get_lost_reasons', companyId, filters);

export const useDetailedChurn = (companyId: string | null, filters: ReportFilters) =>
  useReportRpc<DetailedChurnData>('detailedChurn', 'get_detailed_churn', companyId, filters);

export const useLeadStatusPipeline = (companyId: string | null, filters: ReportFilters) =>
  useReportRpc<LeadStatusPipelineData>('statusPipeline', 'get_lead_status_pipeline', companyId, filters);

export const useSourceConversions = (companyId: string | null, filters: ReportFilters) =>
  useReportRpc<SourceConversionData>('sourceConversions', 'get_source_conversions', companyId, filters);

export const useRevenuePipeline = (companyId: string | null, filters: ReportFilters) =>
  useReportRpc<RevenuePipelineData>('revenuePipeline', 'get_revenue_pipeline', companyId, filters);

/**
 * Turnaround takes no window: it measures the gap between a lead arriving and
 * its first call, and filtering that by a reporting period would silently drop
 * the leads whose wait crosses the boundary -- which are exactly the slow ones
 * the report exists to find.
 */
export function useAgentTAT(companyId: string | null) {
  return useQuery<AgentTATData[]>({
    queryKey: ['reports', 'agentTAT', companyId],
    queryFn: async (): Promise<AgentTATData[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc('get_agent_tat', { p_company_id: companyId });
      if (error) throw error;
      return (data ?? []) as AgentTATData[];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
