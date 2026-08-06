import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';
import { startOfDay, subDays, format, isAfter, differenceInDays } from 'date-fns';

export interface PipelineItem {
  stage: string;
  leads: number;
  risk: string;
  color: string;
}

export interface DashboardStats {
  leadStatusDistribution: { name: string; value: number; fill: string }[];
  agentPerformance: { name: string; top: number; bottom: number }[];
  sourceData: { label: string; val: string; color: string }[];
  totalActive: number;
  kpis: {
    totalLeads: number;
    leadsToday: number;
    callsToday: number;
    connectedToday: number;
    followupsDue: number;
    convertedLeads: number;
  };
  funnelStages: { name: string; value: number; color: string }[];
  pipelineData: PipelineItem[];
  heatMapData: { hour: string; count: number }[];
  aiStats: { total: number; successful: number };
  /** Count of active leads with no agent assigned (assigned_to is null/empty). */
  unassignedLeadsCount: number;
}

function getFallbackStats(): DashboardStats {
  return {
    leadStatusDistribution: [],
    agentPerformance: [],
    sourceData: [],
    totalActive: 0,
    kpis: {
      totalLeads: 0,
      leadsToday: 0,
      callsToday: 0,
      connectedToday: 0,
      followupsDue: 0,
      convertedLeads: 0
    },
    funnelStages: [],
    pipelineData: [],
    heatMapData: [],
    aiStats: { total: 0, successful: 0 },
    // Default to 0 — no unassigned leads when there is no data
    unassignedLeadsCount: 0
  };
}

/**
 * useDashboardStats
 * 
 * Fetches and aggregates administrative statistics from Supabase database.
 */
export function useDashboardStats(
  companyId: string | null,
  dateRange: 'today' | 'week' | 'month' = 'month',
  refetchInterval: number | false = false
) {
  return useQuery({
    queryKey: ['dashboardStats', companyId, dateRange],
    queryFn: async (): Promise<DashboardStats> => {
      if (!companyId) return getFallbackStats();

      const now = new Date();
      const startOfToday = startOfDay(now);
      const sevenDaysAgo = subDays(now, 7);
      const thirtyDaysAgo = subDays(now, 30);

      // 1. Fetch exact high-level metrics safely via RPC (Prevents 5 Lakh row OOM)
      let metricsResponse: any = null;
      try {
        const { data: metricsData, error: metricsError } = await supabase.rpc('get_dashboard_metrics', {
          p_company_id: companyId
        });
        if (!metricsError && metricsData) {
          metricsResponse = metricsData;
        }
      } catch (err) {
        console.warn("RPC failed, falling back to client-side counting", err);
      }

      // 2. Fetch sample active leads for the company (Limit 5000 for safe charting)
      // Only the columns the aggregations below actually read. `select('*')`
      // pulled every column of up to 5,000 leads into the browser on every
      // dashboard load -- a large payload for a screen that uses five fields.
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('status, assigned_to, source, created_at, created_by')
        .eq('company_id', companyId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (leadsError) {
        console.error('Failed to fetch leads:', leadsError);
        throw leadsError;
      }

      // 3. Fetch recent calls count filtered by dateRange (Limit 5000)
      let minDateStr = thirtyDaysAgo.toISOString();
      if (dateRange === 'today') {
        minDateStr = startOfToday.toISOString();
      } else if (dateRange === 'week') {
        minDateStr = sevenDaysAgo.toISOString();
      }

      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('status, timestamp, created_by, outcome, is_ai_call, ai_processed, ai_success')
        .eq('company_id', companyId)
        .gte('timestamp', minDateStr)
        .order('timestamp', { ascending: false })
        .limit(5000);

      if (callsError) {
        console.error('Failed to fetch calls:', callsError);
        throw callsError;
      }

      const leads = leadsData || [];
      const calls = callsData || [];

      // Unassigned leads: compute locally or override with RPC
      let unassignedLeadsCount = leads.filter(
        l => !l.assigned_to || (l.assigned_to as string).trim() === ''
      ).length;

      // 1. KPIs aggregation
      let leadsTodayCount = 0;
      let convertedLeadsCount = 0;
      leads.forEach(l => {
        const created = l.created_at ? new Date(l.created_at) : new Date();
        if (isAfter(created, startOfToday)) leadsTodayCount++;
        if (l.status === 'Converted') convertedLeadsCount++;
      });

      let callsTodayCount = 0;
      let connectedTodayCount = 0;
      calls.forEach(c => {
        const timestamp = c.timestamp ? new Date(c.timestamp) : new Date();
        if (isAfter(timestamp, startOfToday)) {
          callsTodayCount++;
          if (c.outcome === 'Answered' || c.status === 'completed') connectedTodayCount++;
        }
      });

      let followupsDueCount = leads.filter(l => l.status === 'Call Back').length;
      let totalLeads = leads.length || 0;

      // Apply Exact Database RPC counts if available
      if (metricsResponse) {
        totalLeads = metricsResponse.totalLeads;
        leadsTodayCount = metricsResponse.leadsToday;
        unassignedLeadsCount = metricsResponse.unassignedLeads;
        convertedLeadsCount = metricsResponse.convertedLeads;
        followupsDueCount = metricsResponse.followupsDue;
      }

      const kpis = {
        totalLeads: totalLeads,
        leadsToday: leadsTodayCount,
        callsToday: callsTodayCount,
        connectedToday: connectedTodayCount,
        followupsDue: followupsDueCount,
        convertedLeads: convertedLeadsCount
      };

      // 2. Revenue Trend
      // The revenue trend series was removed. Nothing rendered it, and it
      // fabricated money: a converted lead with no estimated_budget was counted
      // as Rs 500 (`|| 500`), so the chart showed income that did not exist.
      // If a revenue chart is wanted, build it on deal values that are actually
      // recorded, and show nothing where nothing was entered.

      // 3. Status Specs & Colors
      const statusSpecs: Record<string, { color: string; riskDays?: number; riskLevel?: string }> = {
        'New': { color: '#3b82f6', riskDays: 7, riskLevel: 'Medium' },
        'Contacted': { color: '#60a5fa', riskDays: 3, riskLevel: 'High' },
        'Interested': { color: '#93c5fd', riskLevel: 'None' },
        'Call Back': { color: '#facc15', riskLevel: 'Critical' },
        'Converted': { color: '#10b981', riskLevel: 'None' },
        'Not Interested': { color: '#ef4444', riskLevel: 'Low' }
      };

      // 4. Pipeline Data & Funnel calculation
      const funnelOrder = ['New', 'Contacted', 'Interested', 'Call Back', 'Converted', 'Not Interested'];
      const pipelineItems: Record<string, { count: number; risk: string }> = {};
      funnelOrder.forEach(s => pipelineItems[s] = { count: 0, risk: 'None' });

      leads.forEach(l => {
        const s = l.status || 'New';
        if (pipelineItems[s]) {
          pipelineItems[s].count++;
          
          // Risk Logic
          const created = l.created_at ? new Date(l.created_at) : new Date();
          const ageInDays = differenceInDays(now, created);
          
          let currentRisk = 'None';
          if (s === 'New' && ageInDays > 7) currentRisk = 'Medium';
          else if (s === 'Contacted' && ageInDays > 3) currentRisk = 'High';
          else if (s === 'Call Back') {
            currentRisk = 'Critical';
          }
          
          const riskPriority: Record<string, number> = { 'None': 0, 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
          if (riskPriority[currentRisk] > riskPriority[pipelineItems[s].risk]) {
            pipelineItems[s].risk = currentRisk;
          }
        }
      });

      const pipelineData: PipelineItem[] = funnelOrder.map(stage => ({
        stage,
        leads: pipelineItems[stage]?.count || 0,
        risk: pipelineItems[stage]?.risk || 'None',
        color: statusSpecs[stage]?.color || '#3b82f6'
      }));

      const funnelStages = pipelineData.map(p => ({
        name: p.stage,
        value: p.leads,
        color: p.color
      }));

      // 5. Agent Momentum (grouped from calls)
      const agentMap: Record<string, { calls: number; conversions: number }> = {};
      calls.forEach(call => {
        const agent = call.created_by || 'Unknown';
        if (!agentMap[agent]) agentMap[agent] = { calls: 0, conversions: 0 };
        agentMap[agent].calls++;
      });
      leads.forEach(lead => {
        if (lead && lead.status === 'Converted' && lead.assigned_to) {
          const agent = lead.assigned_to;
          if (!agentMap[agent]) agentMap[agent] = { calls: 0, conversions: 0 };
          agentMap[agent].conversions++;
        }
      });
      const agentPerformance = Object.entries(agentMap).slice(0, 6).map(([name, stats]) => ({
        name: typeof name === 'string' && name.includes('@') ? name.split('@')[0] : (name || 'Unknown'),
        top: stats?.calls || 0,
        bottom: stats?.conversions || 0
      }));

      // 6. Heat Map (based on actual hourly call logging counts)
      const hourMap: Record<string, number> = {
        '09:00': 0,
        '12:00': 0,
        '15:00': 0,
        '18:00': 0,
        '21:00': 0
      };
      calls.forEach(c => {
        if (c.timestamp) {
          const hr = new Date(c.timestamp).getHours();
          if (hr >= 9 && hr < 12) hourMap['09:00']++;
          else if (hr >= 12 && hr < 15) hourMap['12:00']++;
          else if (hr >= 15 && hr < 18) hourMap['15:00']++;
          else if (hr >= 18 && hr < 21) hourMap['18:00']++;
          else if (hr >= 21 || hr < 9) hourMap['21:00']++;
        }
      });
      const heatMapData = Object.entries(hourMap).map(([hour, count]) => ({ hour, count }));

      // 7. Source Data
      const sourceMap: Record<string, number> = {};
      leads.forEach(l => { if (l.source) sourceMap[l.source] = (sourceMap[l.source] || 0) + 1; });
      const sourceData = Object.entries(sourceMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label, count], i) => ({
          label,
          val: `${Math.round((count / (leads.length || 1)) * 100)}%`,
          color: funnelOrder[i % funnelOrder.length] && statusSpecs[funnelOrder[i % funnelOrder.length]] ? statusSpecs[funnelOrder[i % funnelOrder.length]].color : '#3b82f6'
        }));


      // 9. AI Assist stats
      const aiCalls = calls.filter(c => c && (c.is_ai_call || c.ai_processed));
      const aiStats = {
        total: aiCalls.length,
        successful: aiCalls.filter(c => c.ai_success).length
      };

      // 10. Analytics timeline chart

      return {
        leadStatusDistribution: funnelStages.map(s => ({ ...s, fill: s.color })),
        agentPerformance,
        sourceData,
        totalActive: leads.filter(l => l.status !== 'Rejected').length,
        kpis,
        funnelStages,
        pipelineData,
        heatMapData,
        aiStats,
        // Unassigned leads count — included in every refetch cycle automatically
        unassignedLeadsCount
      };
    },
    enabled: !!companyId,
    refetchInterval,
  });
}
