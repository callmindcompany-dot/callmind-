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
  revenueTrend: { name: string; val: number }[];
  leadStatusDistribution: { name: string; value: number; fill: string }[];
  agentPerformance: { name: string; top: number; bottom: number }[];
  analyticsData: { name: string; p1: number; p2: number; p3: number }[];
  sourceData: { label: string; val: string; color: string }[];
  regionalData: { name: string; value: number; fill: string }[];
  stackedData: { name: string; v1: number; v2: number; v3: number }[];
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
    revenueTrend: [],
    leadStatusDistribution: [],
    agentPerformance: [],
    analyticsData: [],
    sourceData: [],
    regionalData: [],
    stackedData: [],
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

      // Fetch all active leads for the company
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_deleted', false);

      if (leadsError) {
        console.error('Failed to fetch leads:', leadsError);
        throw leadsError;
      }

      // Fetch calls count filtered by dateRange
      let minDateStr = thirtyDaysAgo.toISOString();
      if (dateRange === 'today') {
        minDateStr = startOfToday.toISOString();
      } else if (dateRange === 'week') {
        minDateStr = sevenDaysAgo.toISOString();
      }

      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .gte('timestamp', minDateStr)
        .order('timestamp', { ascending: false });

      if (callsError) {
        console.error('Failed to fetch calls:', callsError);
        throw callsError;
      }

      const leads = leadsData || [];
      const calls = callsData || [];

      // Unassigned leads: active leads where assigned_to is null or empty string.
      // Computed in-memory from the already-fetched leads array — no extra DB round-trip needed.
      const unassignedLeadsCount = leads.filter(
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

      const followupsDueCount = leads.filter(l => l.status === 'Call Back').length;

      const kpis = {
        totalLeads: leads.length || 0,
        leadsToday: leadsTodayCount,
        callsToday: callsTodayCount,
        connectedToday: connectedTodayCount,
        followupsDue: followupsDueCount,
        convertedLeads: convertedLeadsCount
      };

      // 2. Revenue Trend
      const revenueTrendMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(now, i), 'MMM dd');
        revenueTrendMap[d] = 0;
      }
      leads.forEach(lead => {
        if (lead && lead.status === 'Converted' && lead.created_at) {
          const date = new Date(lead.created_at);
          if (isAfter(date, thirtyDaysAgo)) {
            const dateStr = format(date, 'MMM dd');
            const budgetVal = parseFloat(String(lead.estimated_budget || '0').replace(/[^0-9.]/g, '')) || 500;
            if (revenueTrendMap[dateStr] !== undefined) revenueTrendMap[dateStr] += budgetVal;
          }
        }
      });
      const revenueTrend = Object.entries(revenueTrendMap).map(([name, val]) => ({ name, val }));

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

      // 8. Regional Data
      const regionalMap: Record<string, number> = {};
      leads.forEach(l => {
        const region = l.city || l.state || 'Unknown';
        regionalMap[region] = (regionalMap[region] || 0) + 1;
      });
      const regionalData = Object.entries(regionalMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, value], i) => ({ 
          name, 
          value: Math.round((value / (leads.length || 1)) * 100), 
          fill: funnelOrder[i % funnelOrder.length] && statusSpecs[funnelOrder[i % funnelOrder.length]] ? statusSpecs[funnelOrder[i % funnelOrder.length]].color : '#3b82f6'
        }));

      // 9. AI Assist stats
      const aiCalls = calls.filter(c => c && (c.is_ai_call || c.ai_processed));
      const aiStats = {
        total: aiCalls.length,
        successful: aiCalls.filter(c => c.ai_success).length
      };

      // 10. Analytics timeline chart
      const analyticsMap: Record<string, { p1: number; p2: number; p3: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = format(subDays(now, i), 'EEE');
        analyticsMap[d] = { p1: 0, p2: 0, p3: 0 };
      }
      calls.forEach(call => {
        if (call.timestamp) {
          const date = new Date(call.timestamp);
          if (isAfter(date, sevenDaysAgo)) {
            const day = format(date, 'EEE');
            if (analyticsMap[day]) {
              if (call.status === 'completed') analyticsMap[day].p1++;
              else if (call.status === 'missed') analyticsMap[day].p2++;
              else analyticsMap[day].p3++;
            }
          }
        }
      });
      const analyticsData = Object.entries(analyticsMap).map(([name, vals]) => ({ name, ...vals }));

      return {
        revenueTrend,
        leadStatusDistribution: funnelStages.map(s => ({ ...s, fill: s.color })),
        agentPerformance,
        analyticsData,
        sourceData,
        regionalData,
        stackedData: [
          { name: 'Mar', v1: 40, v2: 24, v3: 20 },
          { name: 'Apr', v1: 30, v2: 13, v3: 22 },
          { name: 'May', v1: 20, v2: 98, v3: 22 },
          { name: 'Jun', v1: 27, v2: 39, v3: 20 },
          { name: 'Jul', v1: 18, v2: 48, v3: 21 },
          { name: 'Aug', v1: 23, v2: 38, v3: 25 },
        ],
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
