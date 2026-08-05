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
import { useReportsData } from '@/hooks/useReportsData';
import { useTeamSettingsQuery } from '@/hooks/useTeamSettingsQuery';
import { useAttendanceSummary } from '@/hooks/useAttendanceSummary';
import { useCallsReport } from '@/hooks/useCallsReport';
import { useWhatsAppReport } from '@/hooks/useWhatsAppReport';
import { useReportSchedules } from '@/hooks/useReportSchedules';
import { useCallDisposition } from '@/hooks/useCallDisposition';
import { useTelecallerMetrics } from '@/hooks/useTelecallerMetrics';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useStaleLeads } from '@/hooks/useStaleLeads';
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
    className="bg-white p-6 rounded-[28px] border border-gray-150/70 shadow-sm flex flex-col justify-between group transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl group-hover:bg-brand-600 group-hover:text-white transition-all duration-300 shadow-sm">
        <Icon size={18} />
      </div>
      {change && (
        <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isPositive ? 'text-emerald-600 bg-emerald-50 border-emerald-150' : 'text-rose-600 bg-rose-50 border-rose-150'}`}>
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
    className={`bg-white/80 p-6 rounded-[28px] border border-gray-150/70 text-left group flex flex-col justify-between h-full relative overflow-hidden transition-all shadow-sm
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
  const [selectedDrillDownAgentId, setSelectedDrillDownAgentId] = useState<string | null>(null);
  const [selectedDrillDownAgentName, setSelectedDrillDownAgentName] = useState<string | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Stale Leads reactbot state
  const [staleLeads, setStaleLeads] = useState<any[]>([]);
  const [isLoadingStale, setIsLoadingStale] = useState(false);

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

  // Pre-aggregated Database View Queries (Lazy loaded based on activeReport)
  const { data: hourlyCalls = [], isLoading: loadingHourly } = useHourlyCallsReport(
    companyId,
    dateRange,
    dateRange === 'Custom' ? customRange : undefined
  );

  const { data: funnelSteps = [], isLoading: loadingFunnel } = useConversionFunnelReport(companyId);

  const { data: agentPerf = [], isLoading: loadingAgent } = useAgentPerformanceReport(
    companyId,
    dateRange,
    selectedAgent,
    dateRange === 'Custom' ? customRange : undefined
  );

  const { data: sourceYield = [], isLoading: loadingSource } = useLeadSourceYieldReport(companyId);

  const { data: comparisonData, isLoading: loadingCompare } = useComparisonMetrics(
    companyId,
    dateRange,
    dateRange === 'Custom' ? customRange : undefined,
    compareMode
  );

  // New Insight queries
  const { data: attendanceSummary = [], isLoading: loadingAttendance } = useAttendanceSummary(companyId, dateRange);
  const { data: callsReport = [], isLoading: loadingCallsList } = useCallsReport(companyId, dateRange, selectedAgent, dateRange === 'Custom' ? customRange : undefined);
  const { data: whatsappSummary = [] } = useWhatsAppReport(companyId);
  const { schedules = [] } = useReportSchedules(companyId);

  const { data: callDispositions = [] } = useCallDisposition(
    companyId,
    dateRange,
    selectedAgent,
    dateRange === 'Custom' ? customRange : undefined
  );

  const { data: telecallerMetrics = [] } = useTelecallerMetrics(
    companyId,
    dateRange,
    dateRange === 'Custom' ? customRange : undefined
  );

  const { data: dashboardSummary } = useDashboardSummary(companyId);
  const { data: staleLeadsQuery = [], isLoading: isLoadingStaleQuery, refetch: refetchStaleLeads } = useStaleLeads(companyId);

  const { data: geoData = [] } = useGeographicDistribution(companyId);
  const { data: lostReasonsData = [] } = useLostReasons(companyId);
  const { data: pipelineData = [] } = useLeadStatusPipeline(companyId);
  const { data: sourceConversionsData = [] } = useSourceConversions(companyId);
  
  const { data: agentTAT = [] } = useAgentTAT(companyId);
  const { data: revenuePipeline = [] } = useRevenuePipeline(companyId);
  const { data: detailedChurn = [] } = useDetailedChurn(companyId);

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

    // Linear Revenue Forecasting projection
    const daysElapsed = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const estMonthlyConversions = daysElapsed > 0 ? (conversions / daysElapsed) * daysInMonth : conversions;
    const avgDealValue = 10000;
    const revenueProjection = Math.round(estMonthlyConversions * avgDealValue);

    return {
      totalLeads,
      totalCalls,
      conversions,
      connectRate,
      revenueProjection
    };
  }, [dashboardSummary, teamSettings]);

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

  // Run Reactivation Bot (Supabase query)
  const handleRunReactivation = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingStale(true);
    try {
      await refetchStaleLeads();
      setStaleLeads(staleLeadsQuery);
      setActiveReport('Reactivation Bot');
      toast.success('Bot scan complete. Check active workspace panel.');
    } catch (e: any) {
      toast.error('Scan failed');
    } finally {
      setIsLoadingStale(false);
    }
  }, [companyId, staleLeadsQuery, refetchStaleLeads]);

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
      const rows = data.map(l => {
        const name = l.name || 'N/A';
        const phone = teamSettings?.hidePhoneNumbers 
          ? '********' + (l.phone?.slice(-4) || '****')
          : (l.phone || 'N/A');
        const email = l.email || 'N/A';
        const status = l.status || 'New';
        const source = l.source || 'Direct';
        const agent = l.assignedTo || 'Unassigned';
        const createdAt = l.created_at ? new Date(l.created_at).toLocaleString() : 'N/A';

        return [name, phone, email, status, source, agent, createdAt].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `crm_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-brand-700 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Calendar size={12} /> Schedule Dispatch
              </button>

              <button 
                onClick={() => (plan.can('exports') ? setIsExportModalOpen(true) : setShowExportUpgrade(true))}
                className="px-4 py-2 bg-white text-slate-700 border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download size={12} /> Export Report
              </button>

              <button 
                onClick={() => setIsBuilderOpen(true)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle size={14} /> Custom Builder
              </button>

              <button 
                onClick={handleRunReactivation}
                disabled={isLoadingStale}
                className="px-4 py-2 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {isLoadingStale ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />} Reactivate Bot
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
                <PerformanceCard 
                  title="Projected Sales Value" 
                  value={`$${summaryMetrics.revenueProjection.toLocaleString()}`} 
                  change="Forecasting" 
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
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Pipeline Funnel Distribution</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={funnelSteps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="status" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                            <Tooltip />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                              {funnelSteps.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-6">
                      <h3 className="text-xs font-black uppercase text-brand-400 tracking-wider">Operational Insights</h3>
                      <div className="space-y-4 text-xs font-medium text-slate-300">
                        <p>• Estimated monthly revenue is projected at <span className="text-emerald-400 font-bold">${summaryMetrics.revenueProjection.toLocaleString()}</span> based on conversions velocity.</p>
                        <p>• Average call connect rate stands at <span className="text-brand-400 font-bold">{summaryMetrics.connectRate}%</span>.</p>
                        <p>• Acquisition source yield indicates <span className="text-white font-bold">{sourceYield[0]?.source || 'Direct'}</span> is the highest-performing channel.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Sales Performance' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Run-rate Projection</h4>
                        <p className="text-2xl font-black text-slate-955">${summaryMetrics.revenueProjection.toLocaleString()}</p>
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
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">True Revenue Pipeline</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenuePipeline} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(val) => `₹${val}`} />
                              <YAxis dataKey="status" type="category" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} width={80} />
                              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Pipeline Value']} />
                              <Bar dataKey="total_value" radius={[0, 8, 8, 0]}>
                                {revenuePipeline.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Detailed Lost Reasons (Churn)</h3>
                        <div className="h-64">
                          {detailedChurn.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={detailedChurn}
                                  cx="50%" cy="50%"
                                  innerRadius={60} outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="count" nameKey="reason"
                                  label={true}
                                >
                                  {detailedChurn.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#f59e0b', '#eab308'][index % 4]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                              No churn data available
                            </div>
                          )}
                        </div>
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
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={hourlyCalls}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                              <Tooltip />
                              <Area type="monotone" dataKey="call_count" stroke="#6366f1" fill="#818cf8" fillOpacity={0.1} strokeWidth={3} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Call Disposition Breakdown</h3>
                        <div className="h-64">
                          {callDispositions.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={callDispositions}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={85}
                                  paddingAngle={5}
                                  dataKey="count"
                                  nameKey="outcome"
                                  label={true}
                                >
                                  {callDispositions.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                              No data available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Calling Heatmap Component */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-150/70 shadow-sm">
                      <HeatmapChart data={hourlyCalls} />
                    </div>

                    {/* Recent Calls List drill-down */}
                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Historical Logs Drill-Down</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 text-[9px] font-black text-slate-400 uppercase">
                              <th className="pb-2">Lead</th>
                              <th className="pb-2">Agent</th>
                              <th className="pb-2">Phone</th>
                              <th className="pb-2 text-center">Duration</th>
                              <th className="pb-2 text-center">Outcome</th>
                              <th className="pb-2 text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs font-bold text-slate-800">
                            {callsReport.slice(0, 50).map((call, i) => (
                              <tr key={call.id || i} className="hover:bg-white transition-all">
                                <td className="py-3">{call.lead_name || 'Anonymous'}</td>
                                <td className="py-3">{call.agent_name || 'System'}</td>
                                <td className="py-3 font-mono">{teamSettings?.hidePhoneNumbers ? '********' + (call.phone?.slice(-4) || '****') : (call.phone || 'N/A')}</td>
                                <td className="py-3 text-center font-mono">{call.duration}</td>
                                <td className="py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black
                                    ${call.outcome === 'Answered' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {call.outcome}
                                  </span>
                                </td>
                                <td className="py-3 text-right font-mono text-gray-400">
                                  {new Date(call.timestamp).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Agent Performance' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Top Performers Leaderboard</h3>
                      <div className="h-80 overflow-y-auto custom-scrollbar">
                        <ResponsiveContainer width="100%" height={Math.max(320, agentPerf.length * 40)}>
                          <BarChart data={agentPerf} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                            <YAxis dataKey="agent_name" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} width={120} />
                            <Tooltip />
                            <Bar dataKey="conversions" fill="#10b981" radius={[0, 4, 4, 0]} name="Conversions" />
                            <Bar dataKey="total_dials" fill="#6366f1" radius={[0, 4, 4, 0]} name="Total Calls" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
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
                        {agentPerf.map((agent, idx) => {
                          const target = 50;
                          const actual = agent.total_dials || 0;
                          const pct = Math.min(100, Math.round((actual / target) * 100));

                          // Match telecaller metrics
                          const tcMetric = telecallerMetrics.find(m => m.agent_id === agent.agent_id);
                          const avgMinutes = tcMetric ? Math.floor(tcMetric.avg_talk_seconds / 60) : 0;
                          const avgSeconds = tcMetric ? tcMetric.avg_talk_seconds % 60 : 0;
                          const avgStr = tcMetric ? `Avg: ${avgMinutes}m ${avgSeconds}s` : 'N/A';

                          const firstCallStr = tcMetric && tcMetric.first_call_at 
                            ? new Date(tcMetric.first_call_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : 'N/A';
                          
                          const lastCallStr = tcMetric && tcMetric.last_call_at 
                            ? new Date(tcMetric.last_call_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : 'N/A';

                          const activeHoursStr = tcMetric && tcMetric.login_time 
                            ? `${Math.floor(tcMetric.active_duration_minutes / 60)}h ${tcMetric.active_duration_minutes % 60}m` 
                            : 'N/A';

                          const idleStr = tcMetric && tcMetric.login_time 
                            ? `${Math.floor(tcMetric.idle_minutes / 60)}h ${tcMetric.idle_minutes % 60}m` 
                            : 'N/A';

                          const notesCount = tcMetric ? tcMetric.notes_count : 0;
                          
                          const tatMetric = agentTAT.find(t => t.agent_id === agent.agent_id);
                          const tatMinutes = tatMetric ? tatMetric.avg_tat_minutes : 0;
                          const tatStr = tatMinutes ? (tatMinutes > 60 ? `${Math.floor(tatMinutes/60)}h ${Math.floor(tatMinutes%60)}m` : `${tatMinutes}m`) : 'N/A';

                          return (
                            <tr 
                              key={agent.agent_id || idx} 
                              className="hover:bg-slate-50 cursor-pointer transition-all"
                              onClick={() => {
                                setSelectedDrillDownAgentId(agent.agent_id);
                                setSelectedDrillDownAgentName(agent.agent_name || 'Agent');
                              }}
                            >
                              <td className="py-3.5 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-[10px]">
                                  {agent.agent_name ? agent.agent_name[0] : 'A'}
                                </div>
                                <span className="underline hover:text-brand-600 transition-colors">{agent.agent_name || 'System / Unassigned'}</span>
                              </td>
                              <td className="py-3.5 text-center">{agent.total_dials}</td>
                              <td className="py-3.5 text-center text-emerald-600">{agent.conversions}</td>
                              <td className="py-3.5 text-center font-mono text-[11px]">{avgStr}</td>
                              <td className="py-3.5 text-center font-mono text-[11px] text-brand-600">{tatStr}</td>
                              <td className="py-3.5 text-center font-mono text-[11px] text-gray-500">{firstCallStr}</td>
                              <td className="py-3.5 text-center font-mono text-[11px] text-gray-500">{lastCallStr}</td>
                              <td className="py-3.5 text-center text-slate-600">{activeHoursStr}</td>
                              <td className="py-3.5 text-center text-amber-600">{idleStr}</td>
                              <td className="py-3.5 text-center text-indigo-600">{notesCount}</td>
                              <td className="py-3.5 text-right font-mono">{agent.talk_time_avg}s</td>
                            </tr>
                          );
                        })}
                        {agentPerf.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No agent records logged</td>
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
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Leads Count by Source Channel</h3>
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
                              >
                                {sourceYield.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Conversions by Source (Yield)</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceConversionsData} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                              <YAxis dataKey="source" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} width={80} />
                              <Tooltip />
                              <Bar dataKey="conversions" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Conversions" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeReport === 'Geographical Analytics' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-6">Top Cities by Lead Volume</h3>
                      <div className="h-80 overflow-y-auto custom-scrollbar">
                        <ResponsiveContainer width="100%" height={Math.max(320, geoData.length * 40)}>
                          <BarChart data={geoData} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                            <YAxis dataKey="city" type="category" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} width={120} />
                            <Tooltip />
                            <Bar dataKey="lead_count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Leads" />
                            <Bar dataKey="conversions" fill="#10b981" radius={[0, 4, 4, 0]} name="Conversions" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
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
                        {attendanceSummary.map((row, idx) => (
                          <tr key={row.agent_id || idx} className="hover:bg-slate-50">
                            <td className="py-3.5">{row.agent_name}</td>
                            <td className="py-3.5 text-center">{row.days_present} days</td>
                            <td className="py-3.5 text-center font-mono">{row.hours_worked} hrs</td>
                            <td className="py-3.5 text-center text-amber-500 font-black">{row.late_count} times</td>
                            <td className="py-3.5 text-right font-mono text-slate-500">{row.avg_check_in || 'N/A'}</td>
                          </tr>
                        ))}
                        {attendanceSummary.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No attendance records logged</td>
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
                        <h4 className="text-xs font-black uppercase text-brand-700 tracking-wider">WhatsApp sequence dispatcher Cloud Gateway</h4>
                        <p className="text-[11px] text-brand-600 font-medium leading-relaxed mt-1">Automatically generates message logs matching conversions lifecycle activity.</p>
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
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-4">Neglected leads identified with no active logs within 7 days</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Lead Identity</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Contact Number</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase">Acquisition Source</th>
                            <th className="py-3 text-[10px] font-black text-slate-400 uppercase text-right">Last Action Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                          {staleLeads.map((lead, idx) => (
                            <tr key={lead.id || idx}>
                              <td className="py-3">{lead.name || 'Anonymous'}</td>
                              <td className="py-3 font-mono">{teamSettings?.hidePhoneNumbers ? '********' + (lead.phone?.slice(-4) || '****') : (lead.phone || 'N/A')}</td>
                              <td className="py-3">{lead.source || 'Direct'}</td>
                              <td className="py-3 text-right">{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}</td>
                            </tr>
                          ))}
                          {staleLeads.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-emerald-600 font-bold uppercase tracking-widest">All caught up! No stale records detected.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
            dateRange={dateRange}
            customRange={dateRange === 'Custom' ? customRange : undefined}
            onClose={() => setSelectedDrillDownAgentId(null)}
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
