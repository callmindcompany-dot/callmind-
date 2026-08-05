import { supabase } from './supabase';

export interface TargetItem {
  id: string;
  company_id: string;
  label: string;
  target_value: number;
  current_value: number;
  type: 'calls' | 'leads' | 'conversions' | 'custom';
}

export interface TelecallerStats {
  totalCalls: number;
  connectedCalls: number;
  interestedLeads: number;
  conversions: number;
  callTarget: number;
  callTargetProgress: number; // 0 - 100 percentage
}

export const targetService = {
  /**
   * Fetch company target benchmarks from `targets` table
   */
  async fetchCompanyTargets(companyId: string): Promise<TargetItem[]> {
    if (!companyId) return [];

    try {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('company_id', companyId);

      if (error || !data) return [];
      return data as TargetItem[];
    } catch {
      return [];
    }
  },

  /**
   * Fetch telecaller dynamic statistics from `calls` and `leads` tables
   */
  async fetchTelecallerStats(companyId: string, userId: string): Promise<TelecallerStats> {
    const defaultStats: TelecallerStats = {
      totalCalls: 0,
      connectedCalls: 0,
      interestedLeads: 0,
      conversions: 0,
      callTarget: 100,
      callTargetProgress: 0,
    };

    if (!companyId || !userId) return defaultStats;

    try {
      // 1. Query call logs for this telecaller
      const { data: calls, error: callError } = await supabase
        .from('calls')
        .select('outcome, interest')
        .eq('company_id', companyId)
        .eq('agent_id', userId);

      if (callError) {
        console.error('[targetService] Error fetching calls:', callError);
      }

      const totalCalls = calls ? calls.length : 0;
      const connectedCalls = calls
        ? calls.filter((c) => c.outcome === 'Connected' || c.outcome === 'completed').length
        : 0;
      const interestedLeads = calls
        ? calls.filter((c) => c.interest === 'Interested').length
        : 0;

      // 2. Query assigned leads for conversions
      const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('status')
        .eq('company_id', companyId)
        .eq('assigned_to', userId)
        .eq('is_deleted', false);

      if (leadError) {
        console.error('[targetService] Error fetching leads:', leadError);
      }

      const conversions = leads
        ? leads.filter((l) => l.status === 'Converted').length
        : 0;

      // 3. Fetch target benchmark or fallback to 100 calls
      const targets = await this.fetchCompanyTargets(companyId);
      const callTargetObj = targets.find((t) => t.type === 'calls');
      const callTarget = callTargetObj?.target_value || 100;
      const callTargetProgress = Math.min(100, Math.round((totalCalls / Math.max(1, callTarget)) * 100));

      return {
        totalCalls,
        connectedCalls,
        interestedLeads,
        conversions,
        callTarget,
        callTargetProgress,
      };
    } catch (err) {
      console.error('[targetService] Exception in fetchTelecallerStats:', err);
      return defaultStats;
    }
  },
};
