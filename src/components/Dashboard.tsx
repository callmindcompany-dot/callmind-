import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  UserPlus, Phone, Zap, CheckCircle2, Calendar, Target, 
  TrendingUp, Users, Clock, Info, Filter, Layers, Database, Sparkles,
  Download, AlertTriangle, UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAgentsQuery } from '@/hooks/useAgentsQuery';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { useHourlyCalls } from '@/hooks/useHourlyCalls';
import { useNavigate } from 'react-router-dom';
import { trackTrialEvent } from '@/utils/trialTracking';
import { useTrial } from '@/hooks/useTrial';
import CallMindLoader from './CallMindLoader';
import { TrialBanner } from './TrialBanner';
import { TrialProgressBar, TrialUsageSummary } from './TrialWidgets';
import { toast } from 'react-hot-toast';

// Types and Interfaces
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'Interested' | 'Call Back' | 'Not Required' | 'Converted' | 'Rejected';
  createdAt: any;
  date?: string;
  assignedTo?: string;
  companyId?: string;
  brand?: string;
  source?: string;
  engagement?: string;
  state?: string;
  city?: string;
  address?: string;
  reference?: string;
  comment?: string;
  branch?: string;
  priority?: string;
  description?: string;
  estimatedBudget?: string;
  facebookAdName?: string;
  isDeleted?: boolean;
  isUnseen?: boolean;
  neuralScore?: number;
  isDuplicate?: boolean;
  customData?: Record<string, any>;
}

interface PulseCardProps {
  item: {
    label: string;
    value: string;
    change: string;
    icon: React.ComponentType<any>;
    color: string;
    bg: string;
    status: string;
    helper: string;
    target: string;
    filter: Record<string, string>;
  };
  index: number;
  onClick: (target: string, filter: Record<string, string>) => void;
}

interface FlowStageProps {
  stage: {
    label: string;
    value: string;
    color: string;
    drop: string | null;
    target: string;
    filter: Record<string, string>;
  };
  totalLeads: number;
  onClick: (target: string, filter: Record<string, string>) => void;
}

interface AgentMomentumProps {
  agent: {
    name: string;
    calls: number;
    connected: number;
    conv: string;
    mom: string;
    status: string;
  };
  onClick: (target: string, filter: Record<string, string>) => void;
}

interface HeatMapRowProps {
  row: {
    time: string;
    data: number[];
  };
}

interface SourceQualityRowProps {
  s: {
    source: string;
    quality: number;
    color: string;
  };
}

interface PipelineGravityProps {
  p: {
    stage: string;
    leads: number;
    risk: string;
    color: string;
  };
  totalLeads: number;
  onClick: (target: string, filter: Record<string, string>) => void;
}

interface AIAssistProps {
  item: {
    name: string;
    value: number;
    color: string;
  };
}

const PulseCard = React.memo(({ item, index, onClick }: PulseCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.05, type: 'spring', stiffness: 100 }}
    onClick={() => onClick(item.target, item.filter)}
    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-200 hover:-translate-y-1 transition-all group flex flex-col justify-between h-40 relative overflow-hidden cursor-pointer"
  >
    <div className="flex justify-between items-start relative z-10">
      <div className={`p-2.5 rounded-lg ${item.bg} ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
        <item.icon size={20} />
      </div>
      <div className="flex flex-col items-end">
        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
          <TrendingUp size={10} /> {item.change}
        </span>
      </div>
    </div>
    <div className="relative z-10 mt-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{item.label}</p>
      <h3 className="text-2xl font-black text-slate-900 tabular-nums my-1">{item.value}</h3>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'}`} />
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.helper}</p>
      </div>
    </div>
  </motion.div>
));
PulseCard.displayName = 'PulseCard';

const FlowStageItem = React.memo(({ stage, totalLeads, onClick }: FlowStageProps) => (
  <div 
    className="relative group/stage cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-all"
    onClick={() => onClick(stage.target, stage.filter)}
  >
    <div className="flex justify-between items-center mb-2.5">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover/stage:text-blue-600 transition-colors">{stage.label}</span>
      <span className="text-xs font-black text-slate-900 group-hover/stage:scale-110 transition-transform tabular-nums">{stage.value}</span>
    </div>
    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
      <motion.div 
        initial={{ width: 0 }}
        whileInView={{ width: `${(parseInt(stage.value.replace(/,/g, '')) / (totalLeads || 1)) * 100}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="h-full rounded-full shadow-sm"
        style={{ backgroundColor: stage.color }}
      />
    </div>
    {stage.drop && (
      <div className="absolute -bottom-5 right-0 text-[10px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-1 shadow-sm">
        <TrendingUp size={10} className="rotate-180" /> {stage.drop} loss
      </div>
    )}
  </div>
));
FlowStageItem.displayName = 'FlowStageItem';

const AgentMomentumItem = React.memo(({ agent, onClick }: AgentMomentumProps) => (
  <div 
    onClick={() => onClick('Team', { agentName: agent.name })}
    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-50 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all group/agent cursor-pointer active:scale-[0.98]"
  >
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="h-11 w-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-400 group-hover/agent:bg-white group-hover/agent:text-blue-600 group-hover/agent:border-blue-200 transition-all shadow-sm">
          {agent.name.split(' ').map((n: string) => n[0]).join('')}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${agent.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </div>
      <div>
        <p className="text-xs font-black text-slate-800 tracking-tight group-hover/agent:text-blue-700 transition-colors uppercase">{agent.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${agent.mom === 'High' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : agent.mom === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
            {agent.mom} Momentum
          </span>
          <span className="text-[10px] font-bold text-slate-400">{agent.calls} Calls Logged</span>
        </div>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-black text-slate-900 tabular-nums">{agent.conv}</p>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Conv. Rate</p>
    </div>
  </div>
));
AgentMomentumItem.displayName = 'AgentMomentumItem';

const HeatMapRow = React.memo(({ row }: HeatMapRowProps) => (
  <div className="flex items-center gap-5 group/row">
    <span className="text-[10px] font-black text-slate-400 w-12 tracking-tight group-hover/row:text-blue-600 transition-colors">{row.time}</span>
    <div className="flex-1 flex gap-2">
      {row.data.map((lvl: number, j: number) => (
        <div 
          key={j} 
          className={`flex-1 h-7 rounded-md transition-all hover:scale-125 cursor-pointer border border-white/50 ${
            lvl === 4 ? 'bg-red-500' : lvl === 3 ? 'bg-emerald-400' : lvl === 2 ? 'bg-blue-400' : lvl === 1 ? 'bg-blue-50' : 'bg-slate-50'
          }`}
        />
      ))}
    </div>
  </div>
));
HeatMapRow.displayName = 'HeatMapRow';

const SourceQualityRow = React.memo(({ s }: SourceQualityRowProps) => (
  <tr className="hover:bg-blue-50/50 transition-all group/tr cursor-pointer">
    <td className="py-4">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-8 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
        <span className="text-xs font-black text-slate-700 uppercase tracking-tight group-hover/tr:text-blue-600 transition-colors">{s.source}</span>
      </div>
    </td>
    <td className="py-4 text-right">
      <span className={`text-[11px] font-black px-2 py-1 rounded-lg border shadow-sm ${s.quality > 85 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
        {s.quality}
      </span>
    </td>
  </tr>
));
SourceQualityRow.displayName = 'SourceQualityRow';

const PipelineGravityItem = React.memo(({ p, totalLeads, onClick }: PipelineGravityProps) => (
  <div 
    onClick={() => onClick('Leads', { status: p.stage })}
    className="group/gate cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-all"
  >
    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-2 tracking-tight group-hover/gate:text-cyan-600 transition-colors">
      <span className="flex items-center gap-2">
        {p.stage}
        {p.risk !== 'None' && (
          <span className={`text-[7px] px-1.5 py-0.5 rounded-full border shadow-sm uppercase ${
            p.risk === 'Critical' ? 'bg-red-50 text-red-500 border-red-100' : 
            p.risk === 'High' ? 'bg-amber-50 text-amber-500 border-amber-100' : 
            'bg-blue-50 text-blue-500 border-blue-100'
          }`}>
            {p.risk} Risk
          </span>
        )}
      </span>
      <motion.span 
        key={p.leads}
        initial={{ scale: 1.2, color: '#2563eb' }}
        animate={{ scale: 1, color: '#0f172a' }}
        className="group-hover/gate:scale-110 transition-transform tabular-nums"
      >
        {p.leads.toLocaleString()}
      </motion.span>
    </div>
    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${(p.leads / (totalLeads || 1)) * 100}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full shadow-sm"
        style={{ backgroundColor: p.color }}
      />
    </div>
  </div>
));
PipelineGravityItem.displayName = 'PipelineGravityItem';

const AIAssistItem = React.memo(({ item }: AIAssistProps) => (
  <div className="flex items-center gap-2.5 group/ai cursor-pointer p-2 rounded-lg hover:bg-purple-50 transition-all">
    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight leading-none group-hover/ai:text-purple-600 transition-colors">{item.name}</span>
      <span className="text-[10px] font-bold text-slate-400 mt-1.5 tabular-nums">{item.value} Actions</span>
    </div>
  </div>
));
AIAssistItem.displayName = 'AIAssistItem';

function getRelativeTimeString(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(dateStr).toLocaleDateString();
}

export const Dashboard = React.memo(({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const { profile, user } = useAuth();
  const { companyId } = useCompany();
  
  // Date Range Filters State
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('month');
  const [viewMode, setViewMode] = useState<'Real-time' | 'Overview'>('Overview');
  
  // Link real-time status to refetch interval properties
  const refetchInterval = viewMode === 'Real-time' ? 30000 : false;

  const { data: stats, isLoading, isFetching } = useDashboardStats(companyId, dateRange, refetchInterval);
  const { data: agents = [] } = useAgentsQuery(companyId);
  const { data: liveActivities = [] } = useLiveActivity(companyId);
  const { data: hourlyCallsTrend = [], isLoading: isLoadingTrend } = useHourlyCalls(companyId);
  const { trial } = useTrial();
  const navigate = useNavigate();
  
  // useRef session tracker flag to prevent duplicate trial event trigger
  const hasTrackedEventRef = useRef(false);

  useEffect(() => {
    if (trial && companyId && user?.uid && !trial.day0ChecklistCompleted && !hasTrackedEventRef.current) {
      const usage = trial.usage;
      if (usage && usage.leadsImported >= 10 && usage.aiDraftsUsed >= 1) {
        hasTrackedEventRef.current = true;
        trackTrialEvent(companyId, user.uid, 'day0_checklist_complete');
      }
    }
  }, [trial, companyId, user?.uid]);

  const navigateFromDashboard = React.useCallback((target: string, filters: any = {}) => {
    onTabChange(target);
    const routeMap: Record<string, string> = {
      'Home': '/dashboard',
      'Leads': '/dashboard', 
      'Calls': '/dashboard/reports',
      'Reports': '/dashboard/reports',
      'Team': '/dashboard/team',
      'AI Insights': '/dashboard/ai',
      'Subscription': '/dashboard/billing'
    };
    if (routeMap[target]) {
      navigate(routeMap[target], { state: { ...filters, fromDashboard: true } });
    }
  }, [onTabChange, navigate]);

  const handleCSVExport = React.useCallback(() => {
    if (!stats) {
      toast.error('❌ No dashboard data available to export.');
      return;
    }

    const headers = ['KPI Metric', 'Value'];
    const rows = [
      ['Total Leads', stats.kpis.totalLeads],
      ['Leads Today', stats.kpis.leadsToday],
      ['Calls Today', stats.kpis.callsToday],
      ['Connected Today', stats.kpis.connectedToday],
      ['Follow-ups Due', stats.kpis.followupsDue],
      ['Converted Leads', stats.kpis.convertedLeads],
      ['Total AI Assist Actions', stats.aiStats.total],
      ['Successful AI Assist Actions', stats.aiStats.successful]
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `callmind_dashboard_metrics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('📊 Dashboard statistics exported successfully!');
  }, [stats]);

  // static mock data pattern for HeatMap Row levels to resolve Math.random layout fluctuations
  const HEAT_MAP_DATA = useMemo(() => {
    const hours = ['09:00', '12:00', '15:00', '18:00', '21:00'];
    const counts = stats?.heatMapData || [];
    return hours.map((hourBase) => {
      const dbCount = counts.find(h => h?.hour === hourBase)?.count || 0;
      const weight = dbCount > 10 ? 4 : dbCount > 5 ? 3 : dbCount > 2 ? 2 : dbCount > 0 ? 1 : 0;
      return {
        time: hourBase,
        data: [weight, Math.max(0, weight - 1), Math.max(0, weight - 2), weight, Math.max(0, weight - 1), weight, Math.min(4, weight + 1)]
      };
    });
  }, [stats?.heatMapData]);

  // Needs Attention Stats Computation
  // Includes: rotting leads (New status), inactive agents, missed callbacks, and unassigned leads.
  const needsAttentionStats = useMemo(() => {
    if (!stats) return { rottingLeads: 0, inactiveAgents: 0, criticalRisk: 0, unassignedLeads: 0 };
    
    const rottingLeads = stats.pipelineData?.find(p => p.stage === 'New')?.leads || 0;
    const activeAgentsCount = agents.length;
    const activeCallersCount = stats.agentPerformance?.length || 0;
    const inactiveAgents = Math.max(0, activeAgentsCount - activeCallersCount);
    const criticalRisk = stats.kpis.followupsDue;
    // Pulled directly from useDashboardStats — computed in-memory over the leads fetch
    const unassignedLeads = stats.unassignedLeadsCount ?? 0;

    return { rottingLeads, inactiveAgents, criticalRisk, unassignedLeads };
  }, [stats, agents]);

  const REVENUE_PULSE_DATA = useMemo(() => [
    { label: 'Total Leads', value: stats?.kpis?.totalLeads?.toLocaleString() || '0', change: stats?.kpis?.totalLeads ? '12.4%' : '0%', icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', status: 'active', helper: 'All active leads', target: 'Leads', filter: { status: 'all' } },
    { label: 'Leads Today', value: stats?.kpis?.leadsToday?.toLocaleString() || '0', change: stats?.kpis?.leadsToday ? '18.6%' : '0%', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', status: 'active', helper: 'Fresh signals', target: 'Leads', filter: { created: 'today' } },
    { label: 'Calls Today', value: stats?.kpis?.callsToday?.toLocaleString() || '0', change: stats?.kpis?.callsToday ? '10.2%' : '0%', icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-50', status: 'active', helper: 'Agent outbound activity', target: 'Calls', filter: { date: 'today' } },
    { label: 'Connected', value: stats?.kpis?.connectedToday?.toLocaleString() || '0', change: stats?.kpis?.connectedToday ? '15.8%' : '0%', icon: CheckCircle2, color: 'text-cyan-600', bg: 'bg-cyan-50', status: 'active', helper: 'Successful syncs', target: 'Calls', filter: { status: 'connected', date: 'today' } },
    { label: 'Follow-ups Due', value: stats?.kpis?.followupsDue?.toLocaleString() || '0', change: stats?.kpis?.followupsDue ? '5.4%' : '0%', icon: Calendar, color: 'text-rose-600', bg: 'bg-rose-50', status: 'warning', helper: 'Pending retries', target: 'Calls', filter: { type: 'follow-up', status: 'due' } },
    { label: 'Converted Leads', value: stats?.kpis?.convertedLeads?.toLocaleString() || '0', change: stats?.kpis?.convertedLeads ? '22.1%' : '0%', icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', status: 'success', helper: 'Yield performance', target: 'Leads', filter: { status: 'Converted' } },
  ], [stats?.kpis]);

  const CALLING_FLOW_STAGES = useMemo(() => stats?.funnelStages?.map((stage, i) => {
    const prevValue = i > 0 && stats.funnelStages ? stats.funnelStages[i-1]?.value : null;
    const drop = prevValue ? `${Math.round((1 - ((stage?.value || 0) / prevValue)) * 100)}%` : null;
    return {
      label: stage?.name || 'Unknown',
      value: (stage?.value || 0).toLocaleString(),
      color: stage?.color || '#3b82f6',
      drop,
      target: 'Leads',
      filter: { status: stage?.name || 'New' }
    };
  }) || [], [stats?.funnelStages]);

  const AGENT_MOMENTUM_DATA = useMemo(() => stats?.agentPerformance?.map(a => {
    const callsCount = a?.top || 0;
    const conversionsCount = a?.bottom || 0;
    return {
      name: a?.name || 'Unknown',
      calls: callsCount,
      connected: conversionsCount,
      conv: `${Math.round((conversionsCount / (callsCount || 1)) * 100)}%`,
      mom: callsCount > 20 ? 'High' : callsCount > 10 ? 'Medium' : 'Low',
      status: 'online'
    };
  }) || [], [stats?.agentPerformance]);

  const SOURCE_QUALITY_DATA = useMemo(() => stats?.sourceData?.map(s => {
    const sourceVal = s?.val || '0%';
    return {
      source: s?.label || 'Direct',
      leads: sourceVal,
      connected: '35%',
      conv: '12%',
      quality: parseInt(sourceVal) || 0,
      color: s?.color || '#3b82f6'
    };
  }) || [], [stats?.sourceData]);

  const PIPELINE_GRAVITY_DATA = useMemo(() => stats?.pipelineData || [], [stats?.pipelineData]);

  const AI_ASSIST_DATA = useMemo(() => [
    { name: 'WhatsApp Drafts', value: Math.round((stats?.aiStats?.total || 0) * 0.4), color: '#3b82f6' },
    { name: 'Column Mapping', value: Math.round((stats?.aiStats?.total || 0) * 0.3), color: '#06b6d4' },
    { name: 'Voice-to-CRM', value: Math.round((stats?.aiStats?.total || 0) * 0.2), color: '#f59e0b' },
    { name: 'Report Query', value: Math.round((stats?.aiStats?.total || 0) * 0.1), color: '#8b5cf6' },
  ], [stats?.aiStats]);

  const CardSkeleton = () => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center h-40">
      <CallMindLoader size="xs" />
    </div>
  );

  const SectionSkeleton = () => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full min-h-[300px] items-center justify-center">
      <CallMindLoader size="md" text="Loading metrics..." />
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
              <Zap size={12} fill="currentColor" /> Signal Intelligence Grid
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Intelligence Hub</h1>
              
              {/* Real-time signals viewMode controller */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                <button 
                  onClick={() => setViewMode('Overview')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'Overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Global Overview
                </button>
                <button 
                  onClick={() => setViewMode('Real-time')}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'Real-time' ? 'bg-white text-emerald-600 shadow-sm border border-emerald-50' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${viewMode === 'Real-time' ? 'animate-ping' : ''}`} />
                    Real-time Signals
                  </span>
                </button>
              </div>

              {/* Date Range Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                {(['today', 'week', 'month'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      dateRange === range ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>

              {/* Bouncing background fetch indicator */}
              {isFetching && !isLoading && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                  <CallMindLoader size="xs" />
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest animate-pulse">Syncing...</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* CSV Export Action Button */}
            <button
              onClick={handleCSVExport}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center gap-2"
            >
              <Download size={14} /> Export Metrics
            </button>

            <div className="flex items-center gap-4 bg-white p-2 pl-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-100 transition-all group">
              <div className="text-right">
                <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{profile?.companyName || 'CallMind CRM'}</p>
                <p className="text-[10px] font-bold text-slate-400">Admin Panel</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100 shadow-sm shrink-0 uppercase">
                {profile?.firstName?.[0] || 'A'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Needs Attention warning cards panel */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-amber-50/50 border border-amber-100/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-800 font-black uppercase text-xs tracking-wider">
              <AlertTriangle size={16} className="text-amber-600" /> ⚠️ Needs Attention
            </div>
            {/* 4-column grid: Rotting Leads | Inactive Agents | Missed Targets | Unassigned Leads */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Rotting Leads</p>
                <p className="text-lg font-black text-slate-800 mt-2">{needsAttentionStats.rottingLeads}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Inactive Agents</p>
                <p className="text-lg font-black text-amber-600 mt-2">{needsAttentionStats.inactiveAgents}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Missed Targets</p>
                <p className="text-lg font-black text-red-500 mt-2">{needsAttentionStats.criticalRisk}</p>
              </div>
              {/* NEW: Unassigned Leads — leads with no agent assigned yet */}
              <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2">
                  <UserMinus size={11} className="text-orange-500" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Unassigned Leads</p>
                </div>
                <p className="text-lg font-black text-orange-500 mt-0">
                  {isLoading ? '--' : (needsAttentionStats.unassignedLeads ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {isLoading && !stats ? (
            [1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)
          ) : (
            REVENUE_PULSE_DATA.map((item, i) => (
              <PulseCard 
                key={i} 
                item={item} 
                index={i} 
                onClick={navigateFromDashboard} 
              />
            ))
          )}
        </div>

        <TrialProgressBar />
        <TrialBanner />

        {/* Main Dashboard Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-8">
          
          <div className="lg:col-span-12">
             <TrialUsageSummary />
          </div>

          {/* Calling Flow funnel progress */}
          <div className="lg:col-span-4">
            {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Phone size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Calling Flow Dynamics</h3>
                  </div>
                  <Info size={14} className="text-slate-300 cursor-help" />
                </div>
                <div className="space-y-7 flex-1">
                  {CALLING_FLOW_STAGES.map((stage, i) => (
                    <FlowStageItem 
                      key={i} 
                      stage={stage} 
                      totalLeads={stats?.kpis?.totalLeads || 1} 
                      onClick={navigateFromDashboard} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Agent Momentum list */}
          <div className="lg:col-span-4">
            {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Agent Active Momentum</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  {AGENT_MOMENTUM_DATA.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="p-3 bg-slate-50 rounded-2xl mb-3 border border-slate-100 shadow-inner">
                        <Users size={24} className="text-slate-300 animate-pulse" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active agent sessions</p>
                    </div>
                  ) : (
                    AGENT_MOMENTUM_DATA.map((agent, i) => (
                      <AgentMomentumItem 
                        key={i} 
                        agent={agent} 
                        onClick={navigateFromDashboard} 
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Heat Map visual log */}
          <div className="lg:col-span-4">
            {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm group h-full hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Lead Heat Timeline</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  {HEAT_MAP_DATA.map((row, i) => (
                    <HeatMapRow key={i} row={row} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today's Calling Trend Area Chart */}
          <div className="lg:col-span-8">
            {isLoadingTrend ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Phone size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Today's Calling Trend</h3>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                  {hourlyCallsTrend.length === 0 || hourlyCallsTrend.every(h => h.count === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No calls yet today</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={hourlyCallsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={9} fontStyle="bold" axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                        <Area type="monotone" name="Calls Placed" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCalls)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Activity Feed scrolling panel */}
          <div className="lg:col-span-4">
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-shadow max-h-[420px] overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg animate-pulse">
                    <Zap size={16} fill="currentColor" />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Live Activity Feed</h3>
                </div>
                <span className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 tracking-wider">
                  Live Feed
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                <AnimatePresence initial={false}>
                  {liveActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waiting for activity...</p>
                    </div>
                  ) : (
                    liveActivities.map((act) => (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-colors flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{act.agentName}</span>
                          <span className="text-[8px] font-bold text-slate-400">{getRelativeTimeString(act.timestamp)}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-bold">{act.action}</p>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Lead: {act.leadName}</div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Agent Performance Bar Chart */}
          <div className="lg:col-span-8">
            {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg"><TrendingUp size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Agent Output Chart</h3>
                  </div>
                </div>
                <div className="flex-1 min-h-[300px]">
                  {stats?.agentPerformance?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active logs</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={stats?.agentPerformance || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9' }} />
                        <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase' }} />
                        <Bar name="Calls Logged" dataKey="top" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={22} />
                        <Bar name="Converted Leads" dataKey="bottom" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Assist Ledger Pie Chart */}
          <div className="lg:col-span-4">
             {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm group h-full hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Sparkles size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">AI Assist Ledger</h3>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  {stats?.aiStats?.total === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <div className="p-3 bg-slate-50 rounded-2xl mb-3 border border-slate-100 shadow-inner">
                        <Sparkles size={24} className="text-slate-300 animate-pulse" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">No AI actions logged</p>
                    </div>
                  ) : (
                    <div className="relative h-48 w-48 group/pie transition-transform hover:scale-105 duration-500">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={AI_ASSIST_DATA} 
                            innerRadius={65} 
                            outerRadius={85} 
                            paddingAngle={4} 
                            dataKey="value" 
                            stroke="none"
                          >
                            {AI_ASSIST_DATA.map((entry, index) => <Cell key={index} fill={entry.color} fillOpacity={0.8} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-3xl font-black text-slate-900 leading-none tabular-nums">{stats?.aiStats?.total || '0'}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-1.5 tracking-widest">Insights</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 w-full mt-8">
                    {AI_ASSIST_DATA.map((item, i) => (
                      <AIAssistItem key={i} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data origin yields analysis table */}
          <div className="lg:col-span-6">
             {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm group h-full hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Zap size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Signal Source Quality</h3>
                  </div>
                  <Filter size={14} className="text-slate-300 cursor-pointer hover:text-blue-500 transition-colors" />
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-50">
                        <th className="text-left py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Source</th>
                        <th className="text-right py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Yield Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {SOURCE_QUALITY_DATA.map((s, i) => (
                        <SourceQualityRow key={i} s={s} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* CRM pipeline gate metrics */}
          <div className="lg:col-span-6">
             {isLoading && !stats ? <SectionSkeleton /> : (
              <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg"><Layers size={16} /></div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Pipeline Gravity</h3>
                  </div>
                  <Database size={14} className="text-slate-300" />
                </div>
                <div className="space-y-6 flex-1">
                  {PIPELINE_GRAVITY_DATA.length === 0 || PIPELINE_GRAVITY_DATA.every((p: any) => p.leads === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <div className="p-3 bg-slate-50 rounded-2xl mb-3">
                        <Database size={24} className="text-slate-300" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No leads in pipeline yet</p>
                    </div>
                  ) : (
                    PIPELINE_GRAVITY_DATA.map((p, i) => (
                      <PipelineGravityItem 
                        key={i} 
                        p={p} 
                        totalLeads={stats?.kpis?.totalLeads || 1} 
                        onClick={navigateFromDashboard} 
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
});

Dashboard.displayName = 'Dashboard';
export default Dashboard;
