import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Users, PhoneCall, CheckCircle2, Calendar, Download, Bell,
  ArrowUpRight, ArrowDownRight, Activity, Clock,
  RefreshCw, UserCheck, AlertCircle, ChevronLeft,
  ArrowRight, FileText, Target, Zap, Sparkles, Filter, User,
  FileSpreadsheet, File as FileIcon, Trophy, Mail,
  BarChart3, Loader2, Gauge, ChevronDown, Coffee, Timer, Play, Volume2,
  Lock, Search, Info, ShieldAlert, ShieldCheck, Layers, Network, Boxes, History, UserPlus, Inbox, PlusCircle, MessageSquare,
  Briefcase, TrendingDown, LayoutDashboard, Database, ArrowLeft, Trash2, Settings, Phone, PhoneOutgoing, AlertOctagon, AlertTriangle, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CallMindLoader from './CallMindLoader';
import CallMindPulseLoader from './CallMindPulseLoader';
import { UpgradeModal } from './UpgradeModal';
import { usePlan } from '@/hooks/usePlan';
import { DynamicSourceChart } from './DynamicCharts';
import { 
  useGeographicDistribution, 
  useLostReasons, 
  useLeadStatusPipeline, 
  useSourceConversions,
  useAgentTAT,
  useRevenuePipeline,
  useDetailedChurn
} from '@/hooks/useAdvancedReports';

// Supabase Hooks & Types
import { useHourlyCallsReport } from '@/hooks/useHourlyCallsReport';
import { useConversionFunnelReport } from '@/hooks/useConversionFunnelReport';
import { useAgentPerformanceReport } from '@/hooks/useAgentPerformanceReport';
import { useLeadSourceYieldReport } from '@/hooks/useLeadSourceYieldReport';
import { useComparisonMetrics } from '@/hooks/useComparisonMetrics';
import { ReportState, stateOf, emptyArray } from './reports/ReportState';
import { DrillDownPanel } from './reports/DrillDownPanel';
import { leadDrill, callDrill, type DrillDown } from '@/lib/drillDown';
import { formatRupees, formatRupeesShort } from '@/lib/formatRupees';
import { outcomeColor } from '@/lib/callOutcomes';
import { formatDuration, parseDurationSeconds } from '@/lib/callDuration';
import { CALLS_REPORT_LIMIT } from '@/hooks/useCallsReport';
import { downloadCsv } from '@/lib/downloadCsv';
import { sumByHour } from '@/hooks/useHourlyCallsReport';
import {
  DATE_RANGES,
  describeDateWindow,
  ALL_AGENTS,
  ALL_SOURCES,
  ALL_STATUSES,
  type DateRangeId,
  type ReportFilters,
} from '@/lib/reportFilters';
import { useReportsData } from '@/hooks/useReportsData';
import { useTeamSettingsQuery } from '@/hooks/useTeamSettingsQuery';
import { useAttendanceSummary } from '@/hooks/useAttendanceSummary';
import { useCallsReport } from '@/hooks/useCallsReport';
import { useWhatsAppReport } from '@/hooks/useWhatsAppReport';
import { useReportSchedules } from '@/hooks/useReportSchedules';
import { useCallDisposition } from '@/hooks/useCallDisposition';
import { useTelecallerMetrics } from '@/hooks/useTelecallerMetrics';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useStaleLeads, STALE_AFTER_DAYS } from '@/hooks/useStaleLeads';
import { supabase } from '@/supabaseClient';

// Drill Down & Custom reporting Components
import { AgentDrillDownSlider } from './AgentDrillDownSlider';
import { HeatmapChart } from './HeatmapChart';
import { ScheduleReportModal } from './ScheduleReportModal';
import { ExportReportModal } from './ExportReportModal';
import { HierarchyFilterBar } from './hierarchy/HierarchyFilterBar';

import { 
  HourlyCallDensity,
  ConversionFunnelStep,
  AgentPerformance,
  LeadSourceYield,
  ComparisonMetrics,
  UIFunnelStage,
  UICohortRow
} from '@/types/reports';

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

interface PerformanceCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
}

const PerformanceCard = React.memo(({ title, value, change, isPositive, icon: Icon }: PerformanceCardProps) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.01 }}
    className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col justify-between group transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl group-hover:bg-brand-600 group-hover:text-white transition-all duration-300 shadow-sm">
        <Icon size={18} />
      </div>
      {change && (
        <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isPositive ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</h3>
    </div>
  </motion.div>
));
PerformanceCard.displayName = 'PerformanceCard';

interface ReportFeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
  count?: number;
  isLocked?: boolean;
  category: string;
  isActive?: boolean;
}

const ReportFeatureCard = React.memo(({ title, description, icon: Icon, color, onClick, count, isLocked, category, isActive }: ReportFeatureCardProps) => (
  <motion.button
    whileHover={!isLocked ? { y: -4, scale: 1.01 } : {}}
    onClick={onClick}
    disabled={isLocked && title !== 'Request a Report'}
    className={`bg-white/80 p-6 rounded-[28px] border border-slate-100 text-left group flex flex-col justify-between h-full relative overflow-hidden transition-all shadow-sm
      ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-md hover:border-brand-300/50 hover:bg-white'}
      ${isActive ? 'border-brand-500 ring-2 ring-brand-500 bg-white' : ''}`}
  >
    <div className="flex items-center justify-between mb-4 w-full">
      <div className={`w-12 h-12 rounded-2xl ${isLocked ? 'bg-gray-150 text-gray-400' : `${color} text-white`} flex items-center justify-center shadow-sm`}>
        {isLocked ? <Lock size={20} /> : <Icon size={20} />}
      </div>
      {count !== undefined && !isLocked && (
        <span className="bg-slate-50 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-500 border border-slate-100">
          {count}
        </span>
      )}
    </div>
    
    <div className="flex-1 flex flex-col mt-2">
      <h3 className="text-sm font-black text-slate-900 mb-1 group-hover:text-brand-600 transition-colors uppercase tracking-tight">
        {title}
      </h3>
      <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-4 flex-1">
        {description}
      </p>
      <div className="flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest text-brand-600">
        {isLocked ? 'Future Module' : 'Open Report'}
        {!isLocked && <ArrowRight size={12} />}
      </div>
    </div>
  </motion.button>
));
ReportFeatureCard.displayName = 'ReportFeatureCard';

export const ReportsPage = () => {
  const navigate = useNavigate();
  const { isSuperFounder, plan_status, isGodMode, user } = useAuth();
  const plan = usePlan();
  const [showExportUpgrade, setShowExportUpgrade] = React.useState(false);
  const { companyId } = useCompany();
  const { data: teamSettings } = useTeamSettingsQuery(companyId);

  // States
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('This Month');
  const [selectedAgent, setSelectedAgent] = useState('All Agents');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedSource, setSelectedSource] = useState('All Sources');
  const [compareMode, setCompareMode] = useState(false);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Drill-down states
  /**
   * The chart segment the reader clicked, or null.
   *
   * One piece of state for every chart on the page. Each chart builds a
   * descriptor carrying its own dimension plus the current filter bar, so the
   * panel can only narrow what was on screen — see src/lib/drillDown.ts.
   */
  const [drill, setDrill] = useState<DrillDown | null>(null);

  /** Recharts hands the clicked datum to onClick; this reads its label. */
  const barLabel = (payload: unknown, key: string): string | null => {
    const p = payload as { activePayload?: Array<{ payload?: Record<string, unknown> }> } | undefined;
    const value = p?.activePayload?.[0]?.payload?.[key];
    return typeof value === 'string' && value !== '' ? value : null;
  };

  const [selectedDrillDownAgentId, setSelectedDrillDownAgentId] = useState<string | null>(null);
  const [selectedDrillDownAgentName, setSelectedDrillDownAgentName] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Stale Leads reactbot state
  // The stale-lead list used to be mirrored into local state here. React Query
  // already holds it, and the copy was always one scan behind — see
  // handleRunReactivation.

  // Custom Report Builder & Templates state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['name', 'phone', 'status', 'source']);
  const [customReportData, setCustomReportData] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');

  // Pagination for Custom Report
  const [customReportPage, setCustomReportPage] = useState(1);
  const [totalCustomReportCount, setTotalCustomReportCount] = useState(0);
  const [isCustomReportLoading, setIsCustomReportLoading] = useState(false);
  const CUSTOM_REPORT_PAGE_SIZE = 100;

  const paginatedCustomReport = customReportData; // Already paginated from DB
  const totalCustomReportPages = Math.max(1, Math.ceil(totalCustomReportCount / CUSTOM_REPORT_PAGE_SIZE));

  // Raw fallback query hook (migrated to Supabase) for secondary components
  const rawData = useReportsData(companyId);

  /**
   * The filter bar, as one value.
   *
   * Every report hook takes this object, so a period or dropdown that is on
   * screen is applied by all of them or by none. Passing the pieces separately
   * is how five reports came to ignore the period button entirely while the
   * button still looked lit.
   */
  const filters: ReportFilters = useMemo(() => ({
    dateRange: dateRange as DateRangeId,
    customRange: dateRange === 'Custom' ? customRange : undefined,
    agentId: selectedAgent,
    source: selectedSource,
    status: selectedStatus,
  }), [dateRange, customRange, selectedAgent, selectedSource, selectedStatus]);

  /** What the period button actually resolves to, for the subtitles. */
  const periodLabel = useMemo(
    () => describeDateWindow(filters.dateRange, filters.customRange),
    [filters.dateRange, filters.customRange],
  );


  // Pre-aggregated Database View Queries (Lazy loaded based on activeReport)
  const hourlyCallsQ = useHourlyCallsReport(companyId, filters);
  const funnelQ = useConversionFunnelReport(companyId, filters);
  const agentPerfQ = useAgentPerformanceReport(companyId, filters);
  const sourceYieldQ = useLeadSourceYieldReport(companyId, filters);
  const comparisonQ = useComparisonMetrics(companyId, filters, compareMode);
  const attendanceQ = useAttendanceSummary(companyId, filters);
  const callsReportQ = useCallsReport(companyId, filters);
  const dispositionQ = useCallDisposition(companyId, filters);
  const telecallerQ = useTelecallerMetrics(companyId, filters);

  const { data: hourlyCalls = [], isLoading: loadingHourly } = hourlyCallsQ;
  const { data: funnelSteps = [], isLoading: loadingFunnel } = funnelQ;
  const { data: agentPerf = [], isLoading: loadingAgent } = agentPerfQ;
  const { data: sourceYield = [], isLoading: loadingSource } = sourceYieldQ;
  const { data: comparisonData, isLoading: loadingCompare } = comparisonQ;
  const { data: attendanceSummary = [], isLoading: loadingAttendance } = attendanceQ;
  const { data: callsReport = [], isLoading: loadingCallsList } = callsReportQ;
  const { data: callDispositions = [] } = dispositionQ;
  const { data: telecallerMetrics = [] } = telecallerQ;

  /**
   * Hourly rows arrive per (hour, day) because the heat map needs the date to
   * tell a Monday from a Friday. The hour-of-day chart wants them summed.
   */
  const hourlyByHour = useMemo(() => sumByHour(hourlyCalls), [hourlyCalls]);

  /**
   * agent_performance is one row per agent per day. Fed to the leaderboard
   * raw, a thirty-day range drew each telecaller thirty times, as thirty short
   * bars sharing one name — so the chart understated everybody and the person
   * with the most working days looked busiest.
   *
   * Talk time is re-averaged by weighting each day by its dials. Averaging the
   * daily averages would count a day with two calls the same as a day with
   * eighty.
   */
  const agentTotals = useMemo(() => {
    const byAgent = new Map<string, {
      agent_id: string; agent_name: string;
      total_dials: number; connected: number; conversions: number; talkWeighted: number;
    }>();
    for (const row of agentPerf) {
      const key = row.agent_id ?? 'unassigned';
      const acc = byAgent.get(key) ?? {
        agent_id: key,
        agent_name: row.agent_name || 'Unassigned',
        total_dials: 0, connected: 0, conversions: 0, talkWeighted: 0,
      };
      acc.total_dials += row.total_dials ?? 0;
      acc.connected += row.connected ?? 0;
      acc.conversions += row.conversions ?? 0;
      acc.talkWeighted += Number(row.talk_time_avg ?? 0) * (row.total_dials ?? 0);
      if (row.agent_name) acc.agent_name = row.agent_name;
      byAgent.set(key, acc);
    }
    return [...byAgent.values()]
      .map(a => ({
        ...a,
        talk_time_avg: a.total_dials > 0 ? Math.round(a.talkWeighted / a.total_dials) : null,
      }))
      .sort((a, b) => b.total_dials - a.total_dials);
  }, [agentPerf]);

  const { data: whatsappSummary = [] } = useWhatsAppReport(companyId);
  const { schedules = [] } = useReportSchedules(companyId);

  const { data: dashboardSummary } = useDashboardSummary(companyId);
  const staleLeadsQ = useStaleLeads(companyId);
  const { data: staleLeadsQuery = [], refetch: refetchStaleLeads } = staleLeadsQ;

  const geoQ = useGeographicDistribution(companyId, filters);
  const lostReasonsQ = useLostReasons(companyId, filters);
  const pipelineQ = useLeadStatusPipeline(companyId, filters);
  const sourceConversionsQ = useSourceConversions(companyId, filters);
  const revenuePipelineQ = useRevenuePipeline(companyId, filters);
  const detailedChurnQ = useDetailedChurn(companyId, filters);
  const agentTATQ = useAgentTAT(companyId);

  const { data: geoData = [] } = geoQ;
  const { data: lostReasonsData = [] } = lostReasonsQ;
  const { data: pipelineData = [] } = pipelineQ;
  const { data: sourceConversionsData = [] } = sourceConversionsQ;
  const { data: revenuePipeline = [] } = revenuePipelineQ;
  const { data: detailedChurn = [] } = detailedChurnQ;
  const { data: agentTAT = [] } = agentTATQ;

  // Cohort Analytics helper
  const cohortData = useMemo<UICohortRow[]>(() => {
    if (!rawData.leads || rawData.leads.length === 0) return [];
    const cohorts: Record<string, any[]> = {};
    
    rawData.leads.forEach((l: any) => {
      const date = l.createdAt ? new Date(l.createdAt) : new Date();
      // Group by Week Starting
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const mon = new Date(date.setDate(diff));
      const weekKey = `Week of ${mon.toLocaleDateString()}`;
      
      if (!cohorts[weekKey]) cohorts[weekKey] = [];
      cohorts[weekKey].push(l);
    });

    return Object.entries(cohorts).map(([week, list]) => {
      const total = list.length;
      let c7 = 0;
      let c14 = 0;
      let c30 = 0;

      list.forEach((l: any) => {
        if (l.status?.toLowerCase() === 'converted' && l.createdAt && l.lastContactedAt) {
          const created = new Date(l.createdAt).getTime();
          const contacted = new Date(l.lastContactedAt).getTime();
          const diffDays = (contacted - created) / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) c7++;
          if (diffDays <= 14) c14++;
          if (diffDays <= 30) c30++;
        }
      });

      return {
        cohortName: week,
        totalLeads: total,
        converted7d: c7,
        converted14d: c14,
        converted30d: c30,
        rate7d: total > 0 ? `${Math.round((c7 / total) * 100)}%` : '0%',
        rate14d: total > 0 ? `${Math.round((c14 / total) * 100)}%` : '0%',
        rate30d: total > 0 ? `${Math.round((c30 / total) * 100)}%` : '0%'
      };
    }).slice(0, 5);
  }, [rawData.leads]);

  // Dynamic Metrics Summary calculations
  const summaryMetrics = useMemo(() => {
    const totalLeads = dashboardSummary?.total_leads || 0;
    const totalCalls = dashboardSummary?.total_calls || 0;
    const conversions = dashboardSummary?.conversions || 0;
    const connects = dashboardSummary?.connects || 0;
    const connectRate = totalCalls > 0 ? Math.round((connects / totalCalls) * 100) : 0;

    /*
     * Money booked in the selected period, from leads.deal_value.
     *
     * This used to be a forecast: conversions extrapolated to a full month and
     * multiplied by `const avgDealValue = 10000`, a number nobody entered,
     * printed as "Estimated monthly revenue" with a dollar sign in a product
     * sold in rupees. A company with three ₹2,000 deals was shown a six-figure
     * projection. It is the same mistake as the `parseFloat(...) || 500` line
     * that was removed from this codebase, wearing a forecast as a disguise.
     *
     * What is shown now is what somebody actually typed into deal_value. If no
     * lead carries one, the figure is null and the card says so -- a company
     * that does not record deal values has no revenue figure, and inventing one
     * for them is worse than admitting it.
     */
    const dealValue = sourceYield.reduce((sum, s) => sum + (s.deal_value_total || 0), 0);
    const leadsWithValue = sourceYield.reduce((sum, s) => sum + (s.converted_count || 0), 0);

    return {
      totalLeads,
      totalCalls,
      conversions,
      connectRate,
      dealValue: leadsWithValue > 0 ? dealValue : null,
      leadsWithValue,
    };
  }, [dashboardSummary, sourceYield]);

  // Comparison metrics UI helper
  const getComparisonChange = (current: number, previous: number) => {
    if (!previous) return { text: '--', isPositive: true };
    const diff = current - previous;
    const percent = Math.round((diff / previous) * 100);
    return {
      text: `${percent > 0 ? '+' : ''}${percent}%`,
      isPositive: percent >= 0
    };
  };

  /**
   * Rescan for leads nobody has gone back to.
   *
   * This used to copy the query's data into a second piece of state right
   * after refetching: `await refetchStaleLeads(); setStaleLeads(staleLeadsQuery)`.
   * staleLeadsQuery there is the value captured when the callback was created,
   * so the panel always showed the *previous* scan -- empty the first time, and
   * one run stale for ever after. The duplicate state is gone; the panel reads
   * the query directly, and the query is the only copy.
   *
   * The toast no longer claims success unconditionally. The function behind
   * this raised on every call until 20260820000200, and "Bot scan complete"
   * was printed each time.
   */
  const handleRunReactivation = useCallback(async () => {
    if (!companyId) return;
    setActiveReport('Reactivation Bot');
    const result = await refetchStaleLeads();
    if (result.isError) {
      toast.error(`Scan failed: ${(result.error as Error)?.message ?? 'unknown error'}`);
      return;
    }
    const found = result.data?.length ?? 0;
    toast.success(found === 0
      ? `No lead has gone ${STALE_AFTER_DAYS} days without contact.`
      : `${found} lead${found === 1 ? '' : 's'} with no contact in ${STALE_AFTER_DAYS} days.`);
  }, [companyId, refetchStaleLeads]);

  // Custom Report Generator (Server-Side Paginated)
  const fetchCustomReportData = useCallback(async () => {
    if (!companyId) return;
    setIsCustomReportLoading(true);
    try {
      let query = supabase.from('leads').select('*', { count: 'exact' }).eq('company_id', companyId);

      if (selectedAgent !== 'All Agents') query = query.eq('assigned_to', selectedAgent);
      if (selectedSource !== 'All Sources') query = query.eq('source', selectedSource);
      if (selectedStatus !== 'All Status') query = query.eq('status', selectedStatus);

      // Server-Side Pagination
      const start = (customReportPage - 1) * CUSTOM_REPORT_PAGE_SIZE;
      const end = start + CUSTOM_REPORT_PAGE_SIZE - 1;
      query = query.range(start, end).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      setCustomReportData(data || []);
      if (count !== null) setTotalCustomReportCount(count);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch custom report data');
    } finally {
      setIsCustomReportLoading(false);
    }
  }, [companyId, selectedAgent, selectedSource, selectedStatus, customReportPage]);

  // Refetch when filters or page change, ONLY if workspace is active
  useEffect(() => {
    if (activeReport === 'Custom Report Workspace') {
      fetchCustomReportData();
    }
  }, [activeReport, fetchCustomReportData]);

  const handleGenerateCustomReport = useCallback(() => {
    setCustomReportPage(1); // Reset to first page
    setIsBuilderOpen(false);
    setActiveReport('Custom Report Workspace');
    toast.success("Custom report compiled successfully!");
  }, []);

  // Export spreadsheet utility (CSV) with phone masking support
  const handleExportCSV = useCallback(async () => {
    if (!companyId) return;
    
    const toastId = toast.loading("Fetching data for export...");
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.error("No data available to export", { id: toastId });
        return;
      }

      const headers = ["Name", "Phone", "Email", "Status", "Source", "Assigned To", "Created At"];
      const rows = data.map(l => [
        // A blank cell stays blank. This used to write 'New' into an empty
        // status and 'Direct' into an empty source, so the exported file
        // asserted a stage and an acquisition channel that nobody had
        // recorded -- and a spreadsheet is exactly where an invented value
        // stops being questioned.
        l.name ?? '',
        teamSettings?.hidePhoneNumbers
          ? (l.phone ? '********' + l.phone.slice(-4) : '')
          : (l.phone ?? ''),
        l.email ?? '',
        l.status ?? '',
        l.source ?? '',
        l.assignedTo ?? '',
        l.created_at ? new Date(l.created_at).toLocaleString('en-IN') : '',
      ]);

      downloadCsv(`leads_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      toast.success(`CSV download complete! (${data.length} records)`, { id: toastId });
    } catch (err: any) {
      console.error("Export Error:", err);
      toast.error("Failed to export data", { id: toastId });
    }
  }, [teamSettings, companyId]);

  // Report Category List definitions
  const reportTypes = [
    { id: 'Executive Summary', label: 'Executive Summary', description: 'Strategic board-level overview of company performance and projected growth.', icon: LayoutDashboard, color: 'bg-brand-500', category: 'primary' },
    { id: 'Sales Performance', label: 'Sales Performance', description: 'Analyze conversion trends, projected revenue, and deal volumes.', icon: TrendingUp, color: 'bg-emerald-500', category: 'primary' },
    { id: 'Calling Performance', label: 'Calling Performance', description: 'Evaluate temporal call volumes, connection ratios, and failures attribution.', icon: PhoneCall, color: 'bg-indigo-500', category: 'primary' },
    { id: 'Agent Performance', label: 'Agent Performance', description: 'Leaderboards detailing individual telecaller dials volume and conversions.', icon: UserCheck, color: 'bg-rose-500', category: 'primary' },
    { id: 'Lead Source Quality', label: 'Source Quality', description: 'Acquisition channel yield metrics and conversion ratios.', icon: Database, color: 'bg-sky-500', category: 'primary' },
    { id: 'Geographical Analytics', label: 'Geographical Analytics', description: 'Analyze lead distribution and conversions across cities and regions.', icon: MapPin, color: 'bg-teal-500', category: 'primary' },
    { id: 'Conversion Funnel', label: 'Conversion Funnel', description: 'Full-stage pipeline yields and conversion bottlenecks.', icon: Layers, color: 'bg-amber-500', category: 'primary' },
    { id: 'Cohort Analysis', label: 'Cohort Analysis', description: 'Track weekly creation cohort SQL yields over 7, 14, and 30 days.', icon: Boxes, color: 'bg-violet-500', category: 'primary' },
    { id: 'Attendance Summary', label: 'Attendance Metrics', description: 'Monitor daily attendance check-ins, lates, and hours present.', icon: Calendar, color: 'bg-indigo-600', category: 'primary' },
    { id: 'WhatsApp Report', label: 'WhatsApp Report', description: 'Analyze WhatsApp outreach triggers, delivery rates, and replies.', icon: MessageSquare, color: 'bg-emerald-600', category: 'primary' },
  ];

  // Filtering list search query logic
  const filteredReportTypes = useMemo(() => {
    if (!reportSearchQuery.trim()) return reportTypes;
    return reportTypes.filter(r => r.label.toLowerCase().includes(reportSearchQuery.toLowerCase()));
  }, [reportSearchQuery]);

  return (
    <div className="w-full">
      <div id="export-container" className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-300">
        <HierarchyFilterBar />
        
        {/* Main Toolbar */}
        <div className="bg-white p-6 rounded-3xl border border-gray-150/70 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-4 w-full lg:w-auto z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
                <BarChart3 size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-955 uppercase tracking-tight flex items-center gap-2">
                  Reports Control Hub
                  <span className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[8px] font-black tracking-widest border border-brand-150 uppercase">Enterprise BI</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pre-aggregated PostgreSQL metrics & analytics center</p>
              </div>
            </div>

            {/* Date Filters & Search */}
            <div className="flex flex-wrap items-center gap-2">
              {['Today', '7 Days', '30 Days', 'This Month', 'Custom'].map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setDateRange(period);
                    if (period === 'Custom') setShowCustomPicker(true);
                    else setShowCustomPicker(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border
                    ${dateRange === period 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-gray-400 hover:border-gray-300 border-gray-100'}`}
                >
                  {period}
                </button>
              ))}
              
              <div className="relative ml-2 w-full sm:w-56 mt-2 sm:mt-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  placeholder="Search modules..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-100 focus:bg-white focus:border-brand-500 rounded-xl text-[10px] font-bold outline-none transition-all placeholder-slate-400 text-slate-700"
                />
              </div>
            </div>
          </div>

          {/* Configuration Dropdowns & Comparison toggle */}
          <div className="flex flex-wrap items-center gap-3 z-10">
            <div className="flex flex-wrap gap-2">
              <select 
                value={selectedAgent} 
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-150/70 rounded-xl text-[10px] font-bold text-gray-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="All Agents">All Agents</option>
                {rawData.users.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
              </select>

              <select 
                value={selectedSource} 
                onChange={(e) => setSelectedSource(e.target.value)}
                className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-150/70 rounded-xl text-[10px] font-bold text-gray-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="All Sources">All Sources</option>
                <option value="Direct">Direct</option>
                <option value="Facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="Referral">Referral</option>
              </select>

              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-150/70 rounded-xl text-[10px] font-bold text-gray-700 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="All Status">All Statuses</option>
                <option value="New">New</option>
                <option value="contacted">Contacted</option>
                <option value="interested">Interested</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="w-3.5 h-3.5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compare Period</span>
              </label>

              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-700 transition-all flex items-center gap-2 shadow-md shadow-brand-500/20 btn-tactile cursor-pointer"
              >
                <Calendar size={13} /> Schedule Dispatch
              </button>

              <button 
                onClick={() => (plan.can('exports') ? setIsExportModalOpen(true) : setShowExportUpgrade(true))}
                className="px-4 py-2.5 bg-white text-slate-800 border border-slate-200 hover:border-brand-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-brand-50/50 hover:text-brand-600 transition-all flex items-center gap-2 shadow-xs btn-tactile cursor-pointer"
              >
                <Download size={13} className="text-brand-600" /> Export CSV / PDF
              </button>

              <button 
                onClick={() => setIsBuilderOpen(true)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md btn-tactile cursor-pointer"
              >
                <PlusCircle size={14} /> Custom Builder
              </button>

              <button 
                onClick={handleRunReactivation}
                disabled={staleLeadsQ.isFetching}
                className="px-4 py-2 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
              >
                {staleLeadsQ.isFetching ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />} Find Neglected Leads
              </button>
            </div>
          </div>
        </div>

        {/* Custom date range picker */}
        {showCustomPicker && (
          <div className="p-6 bg-white border border-gray-150/70 rounded-3xl max-w-sm space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Select Custom Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase">Start Date</label>
                <input 
                  type="date" 
                  value={customRange.start} 
                  onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-gray-150 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase">End Date</label>
                <input 
                  type="date" 
                  value={customRange.end} 
                  onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-gray-150 rounded-xl outline-none"
                />
              </div>
            </div>
            <button 
              onClick={() => setShowCustomPicker(false)}
              className="w-full py-2 bg-brand-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
            >
              Apply Range
            </button>
          </div>
        )}

        {/* Dynamic Schedules Badges list */}
        {schedules.length > 0 && !activeReport && (
          <div className="flex flex-wrap gap-2 items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Active Dispatch Tasks:</span>
            {schedules.map(sch => (
              <span key={sch.id} className="px-2.5 py-1 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-lg flex items-center gap-1">
                <ShieldCheck size={10} />
                {sch.metrics[0]} ({sch.frequency})
              </span>
            ))}
          </div>
        )}

        {/* Dashboard Core Content Grid */}
        <AnimatePresence mode="wait">
          {!activeReport ? (
            <motion.div 
              key="hub"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8"
            >
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <PerformanceCard 
                  title="Total Leads" 
                  value={summaryMetrics.totalLeads} 
                  change={compareMode && comparisonData ? getComparisonChange(summaryMetrics.totalLeads, comparisonData.previous_leads).text : "Live"} 
                  isPositive={compareMode && comparisonData ? getComparisonChange(summaryMetrics.totalLeads, comparisonData.previous_leads).isPositive : true}
                  icon={Users} 
                />
                <PerformanceCard 
                  title="Closed Deals" 
                  value={summaryMetrics.conversions} 
                  change={compareMode && comparisonData ? getComparisonChange(summaryMetrics.conversions, comparisonData.previous_conversions).text : "Ready"} 
                  isPositive={compareMode && comparisonData ? getComparisonChange(summaryMetrics.conversions, comparisonData.previous_conversions).isPositive : true}
                  icon={CheckCircle2} 
                />
                <PerformanceCard 
                  title="Average Connect Rate" 
                  value={`${summaryMetrics.connectRate}%`} 
                  change={compareMode && comparisonData ? getComparisonChange(summaryMetrics.connectRate, comparisonData.previous_connect_rate).text : "Active"} 
                  isPositive={compareMode && comparisonData ? getComparisonChange(summaryMetrics.connectRate, comparisonData.previous_connect_rate).isPositive : true}
                  icon={PhoneCall} 
                />
                {/* Booked, not projected. See summaryMetrics for why the
                    forecast this replaced could not be trusted. */}
                <PerformanceCard
                  title="Deal Value Recorded"
                  value={summaryMetrics.dealValue === null
                    ? '—'
                    : formatRupees(summaryMetrics.dealValue)}
                  change={summaryMetrics.dealValue === null
                    ? 'No deal values entered'
                    : `${summaryMetrics.leadsWithValue} lead${summaryMetrics.leadsWithValue === 1 ? '' : 's'}`}
                  isPositive={true}
                  icon={TrendingUp}
                />
              </div>

              {/* Module Cards Grid */}
              <div className="space-y-4">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Analytical Modules Directory</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredReportTypes.map(report => (
                    <ReportFeatureCard 
                      key={report.id}
                      title={report.label}
                      description={report.description}
                      icon={report.icon}
                      color={report.color}
                      onClick={() => setActiveReport(report.id)}
                      category={report.category}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="report-workspace"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="bg-white p-8 rounded-3xl border border-gray-150/70 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                <button 
                  onClick={() => setActiveReport(null)}
                  className="flex items-center gap-2 text-gray-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Hub
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => (plan.can('exports') ? setIsExportModalOpen(true) : setShowExportUpgrade(true))}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Download size={12} /> Export Report
                  </button>
                </div>
              </div>

              {/* Active Report Rendering Switch */}
              <div className="space-y-6">
                <h2 className="text-xl font-black text-slate-955 uppercase tracking-tight mb-4">{activeReport} Analysis</h2>

                {activeReport === 'Executive Summary' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-50 p-6 rounded-3xl border border-gray-100">
                      {/* Stages, not a funnel shape. leads.status has no CHECK
                          constraint and the names are per company, so nothing
                          here knows that Contacted follows New — drawing a
                          tapering funnel would assert an order the data does
                          not carry. */}
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Leads by Stage</h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel}</p>
                      <ReportState {...stateOf(funnelQ, emptyArray)} minHeight={256}
                        emptyMessage="No leads arrived in this period.">
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={funnelSteps}
                              className="cursor-pointer"
                              onClick={(e) => {
                                const status = barLabel(e, 'status');
                                if (status) setDrill(leadDrill(
                                  `Leads at ${status}`, `Stage: ${status}`, filters, { status },
                                ));
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="status" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                {funnelSteps.map((entry, index) => (
                                  <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </ReportState>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-6">
                      <h3 className="text-xs font-black uppercase text-brand-400 tracking-wider">Operational Insights</h3>
                      <div className="space-y-4 text-xs font-medium text-slate-300">
                        {/* Each line states a figure that exists, or is not
                            written at all. The previous version asserted a
                            revenue projection, and named "Direct" as the best
                            channel whenever the source query returned nothing —
                            a channel this company may never have used. */}
                        <p>
                          • Deal value recorded in this period:{' '}
                          <span className="text-emerald-400 font-bold">
                            {summaryMetrics.dealValue === null
                              ? 'none entered'
                              : formatRupees(summaryMetrics.dealValue)}
                          </span>
                          {summaryMetrics.dealValue !== null &&
                            ` across ${summaryMetrics.leadsWithValue} lead${summaryMetrics.leadsWithValue === 1 ? '' : 's'}`}.
                        </p>
                        <p>• Average call connect rate stands at <span className="text-brand-400 font-bold">{summaryMetrics.connectRate}%</span>.</p>
                        {sourceYield.length > 0 && (
                          <p>• Highest-volume channel is <span className="text-white font-bold">{sourceYield[0].source}</span> at {sourceYield[0].lead_count} leads, converting {sourceYield[0].conversion_rate}%.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Sales Performance' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deal Value Recorded</h4>
                        <p className="text-2xl font-black text-slate-955">
                          {summaryMetrics.dealValue === null ? '—' : formatRupees(summaryMetrics.dealValue)}
                        </p>
                        {summaryMetrics.dealValue === null && (
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            No lead has a deal value
                          </p>
                        )}
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Converted Accounts</h4>
                        <p className="text-2xl font-black text-slate-955">{summaryMetrics.conversions}</p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficacy Index</h4>
                        <p className="text-2xl font-black text-slate-955">{(summaryMetrics.totalLeads > 0 ? (summaryMetrics.conversions / summaryMetrics.totalLeads) * 100 : 0).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Pipeline Value by Stage</h3>
                        {/* Two bars, never one. Committed is money somebody
                            entered; estimated is what the caller guessed. A
                            single "pipeline value" made of both is a forecast
                            resting on a hope. */}
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">
                          {periodLabel} · committed vs estimated
                        </p>
                        <ReportState {...stateOf(revenuePipelineQ, emptyArray)} minHeight={256}
                          emptyMessage="No lead in this period has a value recorded.">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={revenuePipeline} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  const status = barLabel(e, 'status');
                                  if (status) setDrill(leadDrill(
                                    `Pipeline at ${status}`, `Stage: ${status}`, filters, { status },
                                  ));
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={formatRupeesShort} />
                                <YAxis dataKey="status" type="category" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} width={80} />
                                <Tooltip formatter={(value: number, name: string) => [formatRupees(value), name]} />
                                <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                                <Bar dataKey="total_value" name="Committed" fill="#0d9488" radius={[0, 8, 8, 0]} />
                                <Bar dataKey="estimated_value" name="Estimated" fill="#94a3b8" radius={[0, 8, 8, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ReportState>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Why Leads Were Lost</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel}</p>
                        {/* The old empty state said "No churn data available"
                            for a query that raised on every call. */}
                        <ReportState {...stateOf(detailedChurnQ, emptyArray)} minHeight={256}
                          emptyMessage="No lead in this period was marked lost with a reason.">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={detailedChurn}
                                  cx="50%" cy="50%"
                                  innerRadius={60} outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="count" nameKey="reason"
                                  label={true}
                                  className="cursor-pointer"
                                  onClick={(slice) => {
                                    const reason = (slice as { reason?: string })?.reason;
                                    if (!reason) return;
                                    // 'No reason recorded' is the view's label
                                    // for a blank, so it drills on "lost at
                                    // all" rather than on that literal string.
                                    setDrill(leadDrill(
                                      `Lost — ${reason}`, `Reason: ${reason}`, filters,
                                      reason === 'No reason recorded'
                                        ? { isLost: true }
                                        : { lostReason: reason },
                                    ));
                                  }}
                                >
                                  {detailedChurn.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#e11d48', '#b45309', '#9333ea', '#2563eb'][index % 4]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number, name: string, item) => [
                                  `${value} lead${value === 1 ? '' : 's'}` +
                                  (item?.payload?.lost_value ? ` · ${formatRupees(item.payload.lost_value)} budget` : ''),
                                  name,
                                ]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </ReportState>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Calling Performance' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Hourly Call Volume temporal Distribution</h3>
                        <div className="h-64">
                          <ReportState {...stateOf(hourlyCallsQ, emptyArray)} minHeight={256}
                            emptyMessage="No calls logged in this period.">
                            <ResponsiveContainer width="100%" height="100%">
                              {/* The days in the window are summed per hour;
                                  drawn raw, a 30-day range puts thirty points
                                  at every hour and reads as noise. */}
                              <AreaChart
                                data={hourlyByHour}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  const p = (e as { activePayload?: Array<{ payload?: { hour?: number } }> })
                                    ?.activePayload?.[0]?.payload;
                                  if (p?.hour === undefined) return;
                                  const label = `${String(p.hour).padStart(2, '0')}:00`;
                                  setDrill(callDrill(
                                    `Calls at ${label}`, `Hour: ${label}`, filters, { hour: p.hour },
                                  ));
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }}
                                  tickFormatter={(h: number) => `${String(h).padStart(2, '0')}:00`} />
                                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`} />
                                <Area type="monotone" dataKey="call_count" name="Calls" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} strokeWidth={3} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </ReportState>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">How Calls Ended</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel}</p>
                        <ReportState {...stateOf(dispositionQ, emptyArray)} minHeight={256}
                          emptyMessage="No calls logged in this period.">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={callDispositions}
                                  cx="50%" cy="50%"
                                  innerRadius={60} outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="count" nameKey="outcome"
                                  label={true}
                                  className="cursor-pointer"
                                  onClick={(slice) => {
                                    const outcome = (slice as { outcome?: string })?.outcome;
                                    if (!outcome || outcome === 'Not recorded') return;
                                    setDrill(callDrill(
                                      `Calls — ${outcome}`, `Outcome: ${outcome}`, filters, { outcome },
                                    ));
                                  }}
                                >
                                  {/* Coloured by what the outcome means, not by
                                      position: Connected keeps the same colour
                                      whether it is the biggest slice or the
                                      smallest. An outcome this build has not
                                      seen shows grey rather than borrowing
                                      another one's colour. */}
                                  {callDispositions.map((entry) => (
                                    <Cell key={entry.outcome} fill={outcomeColor(entry.outcome)} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number, name: string) => [
                                  `${value} call${value === 1 ? '' : 's'}`, name,
                                ]} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </ReportState>
                      </div>
                    </div>

                    {/* Calling Heatmap Component */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-150/70 shadow-sm">
                      <HeatmapChart data={hourlyCalls} />
                    </div>

                    {/* Recent Calls List drill-down */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                      <div className="flex items-baseline justify-between">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Call Log</h3>
                        {/* The cap is stated. Showing the newest 200 without
                            saying so reads as the complete list. */}
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                          {periodLabel}
                          {callsReport.length >= CALLS_REPORT_LIMIT && ` · newest ${CALLS_REPORT_LIMIT}`}
                        </p>
                      </div>
                      <ReportState {...stateOf(callsReportQ, emptyArray)} minHeight={200}
                        emptyMessage="No calls logged in this period.">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200 text-[9px] font-black text-slate-400 uppercase">
                                <th className="pb-2">Lead</th>
                                <th className="pb-2">Telecaller</th>
                                <th className="pb-2">Phone</th>
                                <th className="pb-2 text-center">Duration</th>
                                <th className="pb-2 text-center">Outcome</th>
                                <th className="pb-2 text-center">Interest</th>
                                <th className="pb-2">Notes</th>
                                <th className="pb-2 text-right">Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-bold text-slate-800">
                              {callsReport.map((call) => (
                                <tr key={call.id} className="hover:bg-white transition-all">
                                  <td className="py-3">{call.lead_name || 'Unknown lead'}</td>
                                  <td className="py-3">{call.agent_name || 'Unassigned'}</td>
                                  <td className="py-3 font-mono">
                                    {teamSettings?.hidePhoneNumbers
                                      ? '********' + (call.phone?.slice(-4) || '****')
                                      : (call.phone || '—')}
                                  </td>
                                  <td className="py-3 text-center font-mono">
                                    {formatDuration(parseDurationSeconds(call.duration))}
                                  </td>
                                  <td className="py-3 text-center">
                                    {/* Coloured from the outcome's own meaning.
                                        This used to test `=== 'Answered'`, a
                                        value the app never writes, so every
                                        connected call was painted red. */}
                                    <span
                                      className="px-2 py-0.5 rounded text-[9px] uppercase font-black"
                                      style={{
                                        color: outcomeColor(call.outcome || ''),
                                        backgroundColor: `${outcomeColor(call.outcome || '')}1a`,
                                      }}
                                    >
                                      {call.outcome || 'Not recorded'}
                                    </span>
                                  </td>
                                  <td className="py-3 text-center text-slate-500">{call.interest || '—'}</td>
                                  <td className="py-3 max-w-[200px] truncate text-[11px] font-medium text-slate-600" title={call.notes || ''}>
                                    {call.notes || '—'}
                                  </td>
                                  <td className="py-3 text-right font-mono text-gray-400">
                                    {new Date(call.timestamp).toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </ReportState>
                    </div>
                  </div>
                )}

                {activeReport === 'Agent Performance' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Calls per Telecaller</h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel}</p>
                      <ReportState {...stateOf(agentPerfQ, emptyArray)} minHeight={320}
                        emptyMessage="No calls logged in this period.">
                        <div className="h-80 overflow-y-auto custom-scrollbar">
                          <ResponsiveContainer width="100%" height={Math.max(320, agentTotals.length * 44)}>
                            <BarChart
                              data={agentTotals} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                              className="cursor-pointer"
                              onClick={(e) => {
                                const p = (e as { activePayload?: Array<{ payload?: { agent_id?: string; agent_name?: string } }> })
                                  ?.activePayload?.[0]?.payload;
                                if (!p?.agent_id) return;
                                setDrill(callDrill(
                                  `Calls by ${p.agent_name ?? 'this telecaller'}`,
                                  `Telecaller: ${p.agent_name ?? p.agent_id}`,
                                  filters, { agentId: p.agent_id },
                                ));
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                              <YAxis dataKey="agent_name" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} width={120} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                              {/* Dials, then how many of them connected, then
                                  how many of those said yes — three nested
                                  facts about the same calls, so they are drawn
                                  darkest to lightest rather than as unrelated
                                  colours. */}
                              <Bar dataKey="total_dials" name="Dialled" fill="#93c5fd" radius={[0, 4, 4, 0]} />
                              <Bar dataKey="connected" name="Connected" fill="#2563eb" radius={[0, 4, 4, 0]} />
                              <Bar dataKey="conversions" name="Interested" fill="#0d9488" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </ReportState>
                    </div>

                    <div className="overflow-x-auto bg-white border border-gray-100 rounded-3xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-slate-50/50">
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Consultant Name</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Total Dials</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Conversions</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Avg Duration</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Speed-to-Lead (TAT)</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">First Call</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Last Call</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Active Hours</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Idle Time</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Notes Added</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-right">Talk Time (s)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {/*
                          agentTotals, not agentPerf: the view is one row per
                          agent per day, so iterating it raw listed every
                          telecaller once for each day they worked.

                          Unknown is written as an em dash throughout. This
                          table used to print 'N/A' for a missing measurement
                          and 0 for a missing one — 0h 0m idle time for an agent
                          with no attendance record at all, which reads as an
                          agent who never stopped working.
                        */}
                        {agentTotals.map((agent) => {
                          const tc = telecallerMetrics.find(m => m.agent_id === agent.agent_id);
                          const tat = agentTAT.find(t => t.agent_id === agent.agent_id);

                          const hhmm = (mins: number | null | undefined) =>
                            mins === null || mins === undefined
                              ? '—'
                              : mins >= 60 ? `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m` : `${Math.round(mins)}m`;
                          const clock = (iso: string | null | undefined) =>
                            iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

                          return (
                            <tr
                              key={agent.agent_id}
                              className="hover:bg-slate-50 cursor-pointer transition-all"
                              onClick={() => {
                                setSelectedDrillDownAgentId(agent.agent_id);
                                setSelectedDrillDownAgentName(agent.agent_name);
                              }}
                            >
                              <td className="py-3.5 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-[10px]">
                                  {agent.agent_name ? agent.agent_name[0] : 'A'}
                                </div>
                                <span className="underline hover:text-brand-600 transition-colors">{agent.agent_name}</span>
                              </td>
                              <td className="py-3.5 text-center">{agent.total_dials}</td>
                              <td className="py-3.5 text-center text-emerald-600">{agent.conversions}</td>
                              <td className="py-3.5 text-center font-mono text-[11px]">
                                {formatDuration(tc?.avg_talk_seconds ?? null)}
                                {tc && tc.unreadable_durations > 0 && (
                                  <span className="ml-1 text-[9px] text-amber-600" title="Calls whose duration could not be read are excluded">
                                    ({tc.unreadable_durations} skipped)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-mono text-[11px] text-brand-600">{hhmm(tat?.avg_tat_minutes)}</td>
                              <td className="py-3.5 text-center font-mono text-[11px] text-gray-500">{clock(tc?.first_call_at)}</td>
                              <td className="py-3.5 text-center font-mono text-[11px] text-gray-500">{clock(tc?.last_call_at)}</td>
                              <td className="py-3.5 text-center text-slate-600">{hhmm(tc?.active_duration_minutes)}</td>
                              <td className="py-3.5 text-center text-amber-600">{hhmm(tc?.idle_minutes)}</td>
                              <td className="py-3.5 text-center text-indigo-600">{tc?.notes_count ?? '—'}</td>
                              <td className="py-3.5 text-right font-mono">{formatDuration(agent.talk_time_avg)}</td>
                            </tr>
                          );
                        })}
                        {agentTotals.length === 0 && (
                          <tr>
                            <td colSpan={11} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">
                              {agentPerfQ.isError ? 'This table could not load' : 'No calls logged in this period'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

                {activeReport === 'Lead Source Quality' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Leads by Channel</h3>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel}</p>
                        <ReportState {...stateOf(sourceYieldQ, emptyArray)} minHeight={256}
                          emptyMessage="No leads arrived in this period.">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={sourceYield}
                                  cx="50%" cy="50%"
                                  innerRadius={70} outerRadius={100}
                                  paddingAngle={6}
                                  dataKey="lead_count"
                                  nameKey="source"
                                  className="cursor-pointer"
                                  onClick={(slice) => {
                                    const source = (slice as { source?: string })?.source;
                                    if (!source || source === 'Unknown') return;
                                    setDrill(leadDrill(
                                      `Leads from ${source}`, `Source: ${source}`, filters, { source },
                                    ));
                                  }}
                                >
                                  {sourceYield.map((entry, index) => (
                                    <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value: number, name: string, item) => [
                                  `${value} lead${value === 1 ? '' : 's'} · ${item?.payload?.conversion_rate ?? 0}% converted`,
                                  name,
                                ]} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </ReportState>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Volume vs Conversions by Channel</h3>
                        {/* Both bars, because the point of this chart is that
                            the channel sending the most leads is usually not
                            the one converting best — and a conversions-only
                            bar hides exactly that. */}
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel}</p>
                        <ReportState {...stateOf(sourceConversionsQ, emptyArray)} minHeight={256}
                          emptyMessage="No leads arrived in this period.">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={sourceConversionsData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
                                className="cursor-pointer"
                                onClick={(e) => {
                                  const source = barLabel(e, 'source');
                                  if (source) setDrill(leadDrill(
                                    `Leads from ${source}`, `Source: ${source}`, filters, { source },
                                  ));
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                                <YAxis dataKey="source" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} width={80} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                                <Bar dataKey="lead_count" name="Leads" fill="#93c5fd" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="conversions" name="With a deal value" fill="#0d9488" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </ReportState>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Geographical Analytics' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Top Cities by Lead Volume</h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mb-5">{periodLabel} · top 20</p>
                      <ReportState {...stateOf(geoQ, emptyArray)} minHeight={320}
                        emptyMessage="No lead in this period has a city recorded.">
                      <div className="h-80 overflow-y-auto custom-scrollbar">
                        <ResponsiveContainer width="100%" height={Math.max(320, geoData.length * 44)}>
                          <BarChart
                            data={geoData} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
                            className="cursor-pointer"
                            onClick={(e) => {
                              const city = barLabel(e, 'city');
                              if (city && city !== 'Unknown') setDrill(leadDrill(
                                `Leads in ${city}`, `City: ${city}`, filters, { city },
                              ));
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                            <YAxis dataKey="city" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} width={120} />
                            <Tooltip formatter={(value: number, name: string, item) =>
                              name === 'Leads'
                                ? [`${value}`, name]
                                : [`${value}${item?.payload?.deal_value ? ` · ${formatRupees(item.payload.deal_value)}` : ''}`, name]
                            } />
                            <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                            <Bar dataKey="lead_count" fill="#93c5fd" radius={[0, 4, 4, 0]} name="Leads" />
                            <Bar dataKey="conversions" fill="#0d9488" radius={[0, 4, 4, 0]} name="With a deal value" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      </ReportState>
                    </div>
                  </div>
                )}

                {activeReport === 'Conversion Funnel' && (
                  <div className="space-y-4 max-w-xl mx-auto">
                    {funnelSteps.map((step, idx) => {
                      const total = funnelSteps.reduce((acc, s) => acc + s.count, 0) || 1;
                      const percentage = Math.round((step.count / total) * 100);
                      return (
                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-gray-150/70 space-y-2">
                          <div className="flex justify-between items-end text-xs font-bold text-slate-800">
                            <span>{step.status || 'New'}</span>
                            <span>{step.count} ({percentage}%)</span>
                          </div>
                          <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-gray-100">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeReport === 'Cohort Analysis' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Weekly Cohort</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Total SQL Leads</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Converted ≤ 7 Days</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Converted ≤ 14 Days</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-right">Converted ≤ 30 Days</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {cohortData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3.5 font-bold text-slate-900">{row.cohortName}</td>
                            <td className="py-3.5 text-center">{row.totalLeads}</td>
                            <td className="py-3.5 text-center text-indigo-500">{row.converted7d} ({row.rate7d})</td>
                            <td className="py-3.5 text-center text-brand-600">{row.converted14d} ({row.rate14d})</td>
                            <td className="py-3.5 text-right text-emerald-600">{row.converted30d} ({row.rate30d})</td>
                          </tr>
                        ))}
                        {cohortData.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No cohorts data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeReport === 'Attendance Metrics' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Consultant</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Days Present</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Hours Worked</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Late Count</th>
                          <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-right">Avg Check-In</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {attendanceSummary.map((row) => (
                          <tr key={row.agent_id} className="hover:bg-slate-50">
                            <td className="py-3.5">{row.agent_name}</td>
                            <td className="py-3.5 text-center">{row.days_present} days</td>
                            <td className="py-3.5 text-center font-mono">
                              {/* Real check_in-to-check_out time. This used to
                                  be days_present * 8.5, so an agent who left
                                  after twenty minutes scored the same as one
                                  who stayed till nine. A day with no check_out
                                  is unknown, not zero. */}
                              {row.hours_worked === null ? '—' : `${row.hours_worked} hrs`}
                              {row.open_days > 0 && (
                                <span className="ml-1 text-[9px] text-amber-600"
                                  title="Days checked in but never checked out, so hours cannot be known">
                                  ({row.open_days} open)
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-center text-amber-500 font-black">{row.late_count} times</td>
                            <td className="py-3.5 text-right font-mono text-slate-500">{row.avg_check_in || '—'}</td>
                          </tr>
                        ))}
                        {attendanceSummary.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">
                              {attendanceQ.isError ? 'This table could not load' : 'No attendance recorded in this period'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeReport === 'WhatsApp Report' && (
                  <div className="space-y-6">
                    <div className="bg-brand-50 border border-brand-100 p-5 rounded-2xl flex items-start gap-4">
                      <Sparkles size={20} className="text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        {/* The old copy said this "automatically generates
                            message logs matching conversions lifecycle
                            activity", which describes nothing that exists and
                            reads as a working automation. */}
                        <h4 className="text-xs font-black uppercase text-brand-700 tracking-wider">WhatsApp messages</h4>
                        <p className="text-[11px] text-brand-600 font-medium leading-relaxed mt-1">
                          Counted from messages this workspace actually sent. Delivery and read
                          receipts come from the provider, so a blank column means the provider
                          did not report one.
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Agent</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Messages Sent</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Delivered</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-center">Read</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-right">Replied</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                          {whatsappSummary.map((row, idx) => (
                            <tr key={row.id || idx}>
                              <td className="py-3.5">{row.agent_name}</td>
                              <td className="py-3.5 text-center">{row.sent}</td>
                              <td className="py-3.5 text-center text-slate-500">{row.delivered}</td>
                              <td className="py-3.5 text-center text-brand-600">{row.read}</td>
                              <td className="py-3.5 text-right text-emerald-600 font-black">{row.replied}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeReport === 'Reactivation Bot' && (
                  <div className="space-y-4">
                    {/* The number comes from the constant the query is given,
                        so the sentence cannot drift from the cutoff actually
                        used. It read "within 7 days" beside a function that
                        raised on every call. */}
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-4">
                      Leads with no contact in the last {STALE_AFTER_DAYS} days
                    </p>
                    <ReportState {...stateOf(staleLeadsQ, emptyArray)} minHeight={200}
                      emptyMessage={`No lead has gone ${STALE_AFTER_DAYS} days without contact.`}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Lead</th>
                              <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Phone</th>
                              <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Source</th>
                              <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Stage</th>
                              <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-right">Last contacted</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                            {staleLeadsQuery.map((lead) => (
                              <tr key={lead.id}>
                                {/* Unnamed, unknown source and no stage are all
                                    written as unknown rather than given a
                                    plausible-looking default — 'Direct' in
                                    particular named a channel the company may
                                    never have used. */}
                                <td className="py-3">{lead.name || 'Unnamed lead'}</td>
                                <td className="py-3 font-mono">
                                  {teamSettings?.hidePhoneNumbers
                                    ? '********' + (lead.phone?.slice(-4) || '****')
                                    : (lead.phone || '—')}
                                </td>
                                <td className="py-3">{lead.source || 'Unknown'}</td>
                                <td className="py-3">{lead.status || 'Unknown'}</td>
                                <td className="py-3 text-right">
                                  {lead.last_contact_at
                                    ? new Date(lead.last_contact_at).toLocaleDateString('en-IN')
                                    : <span className="text-rose-600">Never contacted</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </ReportState>
                  </div>
                )}

                {activeReport === 'Custom Report Workspace' && (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Custom filtered columns results summary</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {selectedColumns.map(col => (
                              <th key={col} className="py-3 text-[10px] font-black text-slate-400 uppercase">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                          {paginatedCustomReport.map((row, idx) => (
                            <tr key={idx}>
                              {selectedColumns.map(col => {
                                let val = row[col];
                                if (col === 'phone' && teamSettings?.hidePhoneNumbers) {
                                  val = '********' + (val?.slice(-4) || '****');
                                }
                                return (
                                  <td key={col} className="py-3">{String(val || 'N/A')}</td>
                                );
                              })}
                            </tr>
                          ))}
                          {customReportData.length === 0 && (
                            <tr>
                              <td colSpan={selectedColumns.length} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No matching leads in active scope</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    {totalCustomReportCount > 0 && (
                      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-4 gap-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Showing {(customReportPage - 1) * CUSTOM_REPORT_PAGE_SIZE + 1} to {Math.min(customReportPage * CUSTOM_REPORT_PAGE_SIZE, totalCustomReportCount)} of {totalCustomReportCount} entries
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCustomReportPage(p => Math.max(1, p - 1))}
                            disabled={customReportPage === 1}
                            className="px-3 py-1.5 bg-white border border-gray-150 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            Previous
                          </button>
                          <span className="text-[10px] font-bold text-slate-700 mx-2">Page {customReportPage} of {totalCustomReportPages}</span>
                          <button
                            onClick={() => setCustomReportPage(p => Math.min(totalCustomReportPages, p + 1))}
                            disabled={customReportPage === totalCustomReportPages}
                            className="px-3 py-1.5 bg-white border border-gray-150 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Report Builder Modal */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsBuilderOpen(false)} />
          <div className="relative w-full max-w-md bg-white p-6 rounded-3xl border border-gray-150 shadow-xl z-10 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-955 uppercase tracking-tight">Custom Report Builder</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select target columns for customized report lists</p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'name', label: 'Lead Name' },
                { key: 'phone', label: 'Contact Phone' },
                { key: 'email', label: 'Email Address' },
                { key: 'status', label: 'Current Status' },
                { key: 'source', label: 'Acquisition Source' },
                { key: 'assigned_to', label: 'Assigned Consultant' },
                { key: 'created_at', label: 'Creation Timestamp' }
              ].map(col => (
                <label key={col.key} className="flex items-center gap-3 py-1.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-955">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, col.key]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                      }
                    }}
                    className="w-3.5 h-3.5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  {col.label}
                </label>
              ))}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setIsBuilderOpen(false)}
                className="flex-1 py-3 bg-white border border-gray-150 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateCustomReport}
                className="flex-1 py-3 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-100"
              >
                Compile Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Scheduler Modal */}
      {isScheduleModalOpen && (
        <ScheduleReportModal 
          companyId={companyId}
          onClose={() => setIsScheduleModalOpen(false)}
        />
      )}

      {/* Agent Drill down Slider Sheet */}
      <AnimatePresence>
        {selectedDrillDownAgentId && (
          <AgentDrillDownSlider
            agentId={selectedDrillDownAgentId}
            agentName={selectedDrillDownAgentName}
            companyId={companyId}
            filters={filters}
            onClose={() => setSelectedDrillDownAgentId(null)}
          />
        )}
      </AnimatePresence>

      {/* The rows behind whichever chart segment was clicked. One panel serves
          every chart on the page — the descriptor carries the dimension and
          the filter bar, so the panel can only narrow what was on screen. */}
      <AnimatePresence>
        {drill && (
          <DrillDownPanel
            companyId={companyId}
            drill={drill}
            onClose={() => setDrill(null)}
            hidePhoneNumbers={teamSettings?.hidePhoneNumbers}
            canExport={plan.can('exports')}
            onExportBlocked={() => setShowExportUpgrade(true)}
          />
        )}
      </AnimatePresence>

      {/* Report export is a paid capability; the modal below was imported
          but never rendered, so exports were effectively ungated. */}
      <UpgradeModal
        isOpen={showExportUpgrade}
        onClose={() => setShowExportUpgrade(false)}
        title="Report export is a paid feature"
        description={`Exporting reports is not included in the ${plan.plan.name} plan.`}
        limitType="exports"
      />

      {/* Advanced Export Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExportCSV={handleExportCSV}
        activeReport={activeReport}
        companyName={teamSettings?.team_name || "Company"}
        userName={user?.displayName || "Admin"}
        dateRange={dateRange === 'Custom' ? `${customRange.start} to ${customRange.end}` : dateRange}
      />
    </div>
  );
};
