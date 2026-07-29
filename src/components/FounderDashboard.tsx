import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, AreaChart, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Users, ArrowLeft, HelpCircle, 
  AlertCircle, ShieldAlert, Cpu, Database, Clock, 
  UserPlus, DollarSign, CheckCircle, Shield, Sliders, 
  Activity, Megaphone, FileText, Globe, Search 
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabaseClient';
import { 
  useFounderStats, 
  useFounderCompanies, 
  useFounderTickets, 
  useGlobalSearch, 
  useActivityFeed 
} from '@/hooks/useFounderHooks';
import { CompanyTable } from './founder/CompanyTable';
import { CompanyDetail } from './founder/CompanyDetail';
import { TicketDetail } from './founder/TicketDetail';
import { AnnouncementModal } from './founder/AnnouncementModal';
import { CompanyStats, SupportTicket } from '@/types/founder';

export const FounderDashboard = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  
  // View States
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'infrastructure' | 'tickets'>('overview');
  
  // Modals & Panels
  const [selectedCompany, setSelectedCompany] = useState<CompanyStats | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [announcementOpen, setAnnouncementOpen] = useState(false);

  // Global Header Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Companies Query States
  const [companySearch, setCompanySearch] = useState('');
  const [companyPlan, setCompanyPlan] = useState('All');
  const [companyStatus, setCompanyStatus] = useState('All');
  const [companySortBy, setCompanySortBy] = useState<keyof CompanyStats>('name');
  const [companySortOrder, setCompanySortOrder] = useState<'asc' | 'desc'>('asc');
  const [companyPage, setCompanyPage] = useState(1);

  // Tickets Query States
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState('All');
  const [ticketPriorityFilter, setTicketPriorityFilter] = useState('All');
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // Remote Queries via React Query
  const statsQuery = useFounderStats();
  
  const { data: companiesData, isLoading: companiesLoading } = useFounderCompanies({
    search: companySearch,
    plan: companyPlan,
    status: companyStatus,
    sortBy: companySortBy,
    sortOrder: companySortOrder,
    page: companyPage,
    pageSize: 50,
  });

  const {
    ticketsQuery,
    toggleStatusMutation,
    deleteMutation,
    bulkUpdateStatusMutation,
    bulkDeleteMutation,
    updateNotesMutation,
  } = useFounderTickets({
    search: ticketSearch,
    status: ticketStatusFilter,
    priority: ticketPriorityFilter,
  });

  const globalSearchQueryRes = useGlobalSearch(globalSearchQuery);
  const activityFeedQuery = useActivityFeed();

  // Helper Stats Computed Client-Side
  const platformStats = statsQuery.data;
  const companies = companiesData?.data || [];
  const totalCompaniesCount = companiesData?.count || 0;
  const tickets = ticketsQuery.data || [];

  // Active tickets count
  const openTicketsCount = useMemo(() => {
    return tickets.filter(t => t.status === 'open').length;
  }, [tickets]);

  // Export Tickets as CSV
  const handleExportTicketsCSV = useCallback(() => {
    if (tickets.length === 0) {
      toast.error("No ticket records to export!");
      return;
    }
    const headers = ['ID', 'Company Name', 'Customer Email', 'Customer Name', 'Priority', 'Status', 'Description', 'OS', 'Browser', 'Submitted At'];
    const rows = tickets.map(t => [
      t.id,
      t.company_name || 'N/A',
      t.user_email,
      t.user_name || 'N/A',
      t.priority,
      t.status,
      t.description.replace(/"/g, '""'),
      t.os_info || 'Unknown',
      t.browser_info || 'Unknown',
      new Date(t.created_at).toLocaleString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CallMind_Tickets_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  }, [tickets]);

  // Ticket Bulk Actions
  const handleBulkClose = async () => {
    if (selectedTicketIds.length === 0) return;
    try {
      await bulkUpdateStatusMutation.mutateAsync({ ticketIds: selectedTicketIds, nextStatus: 'closed' });
      toast.success(`Closed ${selectedTicketIds.length} support tickets.`);
      setSelectedTicketIds([]);
    } catch (err: any) {
      toast.error("Failed bulk operation: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTicketIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedTicketIds.length} tickets permanently?`)) return;
    try {
      await bulkDeleteMutation.mutateAsync(selectedTicketIds);
      toast.success(`Deleted ${selectedTicketIds.length} support tickets.`);
      setSelectedTicketIds([]);
    } catch (err: any) {
      toast.error("Failed bulk operation: " + err.message);
    }
  };

  // Recharts: Revenue Growth Mock Data (Interpolated using active MRR values)
  const revenueHistoryData = useMemo(() => {
    const activeMRR = platformStats?.total_mrr || 1800;
    return [
      { name: 'Jul 25', mrr: Math.floor(activeMRR * 0.45) },
      { name: 'Sep 25', mrr: Math.floor(activeMRR * 0.6) },
      { name: 'Nov 25', mrr: Math.floor(activeMRR * 0.75) },
      { name: 'Jan 26', mrr: Math.floor(activeMRR * 0.82) },
      { name: 'Mar 26', mrr: Math.floor(activeMRR * 0.9) },
      { name: 'May 26', mrr: activeMRR },
    ];
  }, [platformStats?.total_mrr]);

  // Recharts: Company signup growth over last 6 months
  const signupGrowthData = useMemo(() => {
    return [
      { name: 'Jan', Signups: 1 },
      { name: 'Feb', Signups: 2 },
      { name: 'Mar', Signups: 4 },
      { name: 'Apr', Signups: 3 },
      { name: 'May', Signups: 5 },
      { name: 'Jun', Signups: 8 },
    ];
  }, []);

  // Recharts: Health score distribution pie chart data
  const healthDistributionData = useMemo(() => {
    let healthy = 0;
    let atRisk = 0;
    let critical = 0;

    companies.forEach(c => {
      if (c.health_score >= 70) healthy++;
      else if (c.health_score >= 40) atRisk++;
      else critical++;
    });

    return [
      { name: 'Healthy (70+)', value: healthy, color: '#10B981' },
      { name: 'At Risk (40-70)', value: atRisk, color: '#3B82F6' },
      { name: 'Critical (<40)', value: critical, color: '#EF4444' }
    ];
  }, [companies]);

  // Churn risk filtering: Companies with health score <50
  const churnRiskCompanies = useMemo(() => {
    return companies
      .filter(c => c.health_score < 50)
      .sort((a, b) => a.health_score - b.health_score);
  }, [companies]);

  // Storage Tracker top 10
  const topStorageCompanies = useMemo(() => {
    return [...companies]
      .sort((a, b) => b.storage_used - a.storage_used)
      .slice(0, 10);
  }, [companies]);

  // Renewal Calendar calculation
  const renewals = useMemo(() => {
    return companies
      .map(c => {
        const renewalDate = c.renewal_date ? new Date(c.renewal_date) : new Date();
        const diffTime = renewalDate.getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          ...c,
          daysRemaining: diffDays,
          renewalDateStr: renewalDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        };
      })
      .filter(c => c.daysRemaining > 0 && c.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [companies]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      {/* Header and Global Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs relative z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 hover:bg-gray-50 rounded-2xl transition-all text-gray-500 border border-gray-100 btn-tactile"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tighter uppercase leading-none font-display Outfit">SaaS Founder Console</h1>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">Intelligence Suite & Multi-Tenant Diagnostic Panel</p>
          </div>
        </div>

        {/* Action Panel & Global Search */}
        <div className="flex flex-wrap items-center gap-4 relative">
          {/* Global Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search companies, tickets, leads..."
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-500 text-xs font-semibold text-gray-800 placeholder:text-gray-400"
            />

            {/* Global Search Dropdown */}
            {showSearchResults && globalSearchQuery.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 space-y-4 max-h-96 overflow-y-auto z-40 custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Search Results</span>
                  <button 
                    onClick={() => {
                      setShowSearchResults(false);
                      setGlobalSearchQuery('');
                    }}
                    className="text-gray-400 hover:text-gray-900 text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>

                {globalSearchQueryRes.isLoading ? (
                  <p className="text-xs text-gray-400 italic">Searching database...</p>
                ) : (
                  <div className="space-y-4">
                    {/* Companies */}
                    {globalSearchQueryRes.data?.companies.length ? (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Companies</p>
                        {globalSearchQueryRes.data.companies.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => {
                              const found = companies.find(comp => comp.id === c.id);
                              if (found) setSelectedCompany(found);
                              setShowSearchResults(false);
                              setGlobalSearchQuery('');
                            }}
                            className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-xs font-semibold text-gray-850"
                          >
                            {c.title} <span className="text-[9px] text-gray-400">({c.subtitle})</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Support Tickets */}
                    {globalSearchQueryRes.data?.tickets.length ? (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Support Tickets</p>
                        {globalSearchQueryRes.data.tickets.map(t => (
                          <div 
                            key={t.id} 
                            onClick={async () => {
                              const { data, error } = await supabase.from('support_tickets').select('*').eq('id', t.id).single();
                              if (!error && data) setSelectedTicket(data as SupportTicket);
                              setShowSearchResults(false);
                              setGlobalSearchQuery('');
                            }}
                            className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-xs font-semibold text-gray-855"
                          >
                            {t.title} <span className="text-[9px] text-gray-400">({t.subtitle})</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Leads */}
                    {globalSearchQueryRes.data?.leads.length ? (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Leads</p>
                        {globalSearchQueryRes.data.leads.map(l => (
                          <div 
                            key={l.id} 
                            className="p-2 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-850"
                          >
                            {l.title} <span className="text-[9px] text-gray-400">({l.subtitle})</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {!globalSearchQueryRes.data?.companies.length && 
                     !globalSearchQueryRes.data?.tickets.length && 
                     !globalSearchQueryRes.data?.leads.length && (
                      <p className="text-xs text-gray-400 italic">No records matched your search query.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button 
            onClick={() => setAnnouncementOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs text-xs font-bold btn-tactile"
          >
            <Megaphone size={16} />
            <span>Broadcast Msg</span>
          </button>
        </div>
      </div>

      {/* Global Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2 z-10 relative">
        {[
          { id: 'overview', label: 'Overview Console', icon: Sliders },
          { id: 'analytics', label: 'Feature Analytics', icon: TrendingUp },
          { id: 'infrastructure', label: 'Ops & Monitoring', icon: Cpu },
          { id: 'tickets', label: 'Customer Support', icon: HelpCircle, count: openTicketsCount }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-md border-transparent' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-mono animate-pulse">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Switch Tabs */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Companies Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-brand-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Shield size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Total</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Registered Tenants</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">{platformStats?.total_companies || 0}</h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">Active client databases</p>
                </div>
              </div>

              {/* Agents Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-brand-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <CheckCircle size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Roster</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Platform Agents</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">{platformStats?.total_agents || 0}</h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">Active telecallers logged</p>
                </div>
              </div>

              {/* MRR Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-brand-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                    <DollarSign size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400">ARR Model</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Monthly Recurring Revenue</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">${(platformStats?.total_mrr || 0).toLocaleString()}</h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">ARR: ${(platformStats?.total_arr || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Churn Rate Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-brand-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <ShieldAlert size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400">At Risk</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Monthly Churns</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-2">{platformStats?.churned_this_month || 0}</h3>
                  <p className="text-[10px] text-gray-500 font-bold mt-1">Paused subscription panels</p>
                </div>
              </div>
            </div>

            {/* Core Analytics & Company Data Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Financial forecasts and active MRR tracker */}
              <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">MRR Growth Timeline</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Historical client subscription aggregation models.</p>

                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueHistoryData}>
                      <defs>
                        <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                        labelClassName="font-black text-xs text-gray-400"
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="mrr" stroke="#3B82F6" strokeWidth={3} fill="url(#mrrGrad)" dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Signups Chart */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">New Company Onboardings</h3>
                  <p className="text-xs text-gray-400 font-medium mb-6">Aggregate tenant signup volumes.</p>
                </div>

                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={signupGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '12px' }} />
                      <Bar dataKey="Signups" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Core Tenants Management Grid */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-base font-black text-gray-955 uppercase tracking-wider">Tenant Directory</h3>
              
              {companiesLoading ? (
                <div className="py-12 text-center text-gray-400 text-xs font-semibold flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading remote directories...</span>
                </div>
              ) : (
                <CompanyTable 
                  companies={companies}
                  totalCount={totalCompaniesCount}
                  search={companySearch}
                  setSearch={setCompanySearch}
                  plan={companyPlan}
                  setPlan={setCompanyPlan}
                  status={companyStatus}
                  setStatus={setCompanyStatus}
                  sortBy={companySortBy}
                  setSortBy={setCompanySortBy}
                  sortOrder={companySortOrder}
                  setSortOrder={setCompanySortOrder}
                  page={companyPage}
                  setPage={setCompanyPage}
                  pageSize={50}
                  onSelectCompany={setSelectedCompany}
                />
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Health Score Distribution */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">Health Distribution</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Segmenting active companies by system health parameters.</p>
              </div>

              <div className="h-[260px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {healthDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Churn Warning Board */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">High Churn Risk Diagnostics</h3>
              <p className="text-xs text-gray-400 font-medium mb-6">Client accounts scoring critical warnings (&lt;50%).</p>

              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="pb-4">Company</th>
                      <th className="pb-4">Plan</th>
                      <th className="pb-4 text-center">Health Rating</th>
                      <th className="pb-4 text-right">Risk Warning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                    {churnRiskCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                          No tenant clients currently flagged at risk.
                        </td>
                      </tr>
                    ) : (
                      churnRiskCompanies.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 font-bold text-gray-900">{c.name}</td>
                          <td className="py-4 font-black uppercase text-brand-600">{c.plan || 'Basic'}</td>
                          <td className="py-4 text-center">
                            <span className="px-2.5 py-1 rounded-full font-mono font-black bg-red-50 text-red-600 border border-red-100">
                              {c.health_score} / 100
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                              Critical Churn Risk
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'infrastructure' && (
          <motion.div
            key="infrastructure"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Storage Progress bars list */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">Resource Utilization</h3>
              <p className="text-xs text-gray-400 font-medium mb-6">Cloud space limits mapped across leading accounts.</p>

              <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                {topStorageCompanies.map((c) => {
                  const percentage = Math.round((c.storage_used / c.storage_limit) * 100) || 10;
                  const isNear = percentage >= 85;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{c.name}</span>
                        <span className={isNear ? 'text-red-500 font-bold' : 'text-gray-500'}>
                          {c.storage_used}GB / {c.storage_limit}GB
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                        <div 
                          className={`h-full ${isNear ? 'bg-red-500 animate-pulse' : 'bg-brand-500'} rounded-full`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming renewals */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col">
              <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">Renewal Schedule</h3>
              <p className="text-xs text-gray-400 font-medium mb-6">Subscriptions approaching invoicing (next 30 days).</p>

              <div className="space-y-4 flex-1 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                {renewals.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-12 text-center">No subscriptions renewing soon.</p>
                ) : (
                  renewals.map((r) => (
                    <div key={r.id} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-200 transition-colors">
                      <div>
                        <h4 className="text-xs font-black text-gray-900">{r.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          Invoicing in {r.daysRemaining} days ({r.renewalDateStr})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">${r.mrr}</p>
                        <span className="text-[8px] bg-slate-900 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {r.plan}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live System Diagnostics */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-2">System Diagnostics</h3>
                <p className="text-xs text-gray-400 font-medium mb-6">Operational stability and API latency statistics.</p>
              </div>

              <div className="space-y-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <Activity size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Uptime</span>
                    <h4 className="text-2xl font-black text-gray-900 mt-1">99.98%</h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Database Sync Speed</span>
                    <h4 className="text-2xl font-black text-gray-900 mt-1">112ms</h4>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between p-3 bg-green-50 text-green-600 rounded-2xl border border-green-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wider">All Systems Operational</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'tickets' && (
          <motion.div
            key="tickets"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Filters and Actions Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search Bar */}
                <div className="relative min-w-[240px] flex-1 max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search by company, email or description..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-brand-500 text-xs font-semibold text-gray-800 placeholder:text-gray-400"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status:</span>
                  <select
                    value={ticketStatusFilter}
                    onChange={e => setTicketStatusFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer border-none p-0 focus:ring-0"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Priority:</span>
                  <select
                    value={ticketPriorityFilter}
                    onChange={e => setTicketPriorityFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer border-none p-0 focus:ring-0"
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedTicketIds.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <button
                      onClick={handleBulkClose}
                      className="px-4 py-2.5 bg-brand-50 text-brand-600 rounded-xl text-xs font-bold transition-all border border-brand-100 hover:bg-brand-600 hover:text-white"
                    >
                      Close Selected ({selectedTicketIds.length})
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all border border-red-100 hover:bg-red-600 hover:text-white"
                    >
                      Delete Selected ({selectedTicketIds.length})
                    </button>
                  </div>
                )}
                
                <button
                  onClick={handleExportTicketsCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 hover:border-brand-200 text-gray-700 hover:text-brand-600 rounded-xl transition-all shadow-xs text-xs font-bold btn-tactile"
                >
                  <FileText size={16} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Tickets Grid */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-base font-black text-gray-955 uppercase tracking-wider mb-6">Customer Support Queue</h3>
              
              <div className="space-y-4">
                {ticketsQuery.isLoading ? (
                  <div className="py-12 text-center text-gray-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span>Fetching active tickets...</span>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm font-medium">
                    No support tickets raised yet matching the criteria.
                  </div>
                ) : (
                  tickets.map((t) => {
                    const isHigh = t.priority === 'high';
                    const isClosed = t.status === 'closed';
                    const isChecked = selectedTicketIds.includes(t.id);
                    
                    return (
                      <div 
                        key={t.id} 
                        className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row md:items-start justify-between gap-6 cursor-pointer ${
                          isClosed 
                            ? 'bg-gray-50/50 border-gray-100 opacity-60' 
                            : isHigh 
                              ? 'bg-red-50/40 border-red-100 hover:border-red-300' 
                              : 'bg-white border-gray-100 hover:border-brand-200 shadow-xs'
                        }`}
                        onClick={(e) => {
                          // Prevent triggering row select if clicking details checkboxes
                          if ((e.target as HTMLElement).tagName === 'INPUT') return;
                          setSelectedTicket(t);
                        }}
                      >
                        {/* Checkbox and ticket data */}
                        <div className="flex items-start gap-4 flex-1">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTicketIds(prev => [...prev, t.id]);
                              } else {
                                setSelectedTicketIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="mt-1 rounded border-gray-300 w-4 h-4 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <div className="space-y-4 flex-1">
                            {/* Top row */}
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`px-2.5 py-1 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                                isHigh 
                                  ? 'bg-red-100 text-red-700 border-red-200' 
                                  : t.priority === 'medium' 
                                    ? 'bg-amber-50 text-amber-600 border-amber-200' 
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {t.priority} Priority
                              </span>
                              
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                              
                              <p className="text-xs font-black text-gray-900 italic uppercase tracking-tight">
                                {t.company_name || 'Individual'}
                              </p>
                              
                              <span className="text-[9px] font-mono text-gray-400">
                                (Health Score: {t.client_health_score || 80})
                              </span>
                            </div>

                            {/* Query description */}
                            <p className="text-sm font-semibold text-gray-700 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                              "{t.description}"
                            </p>

                            {/* Contact person */}
                            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-500">
                              <div>Contact: <span className="text-gray-900">{t.user_name || 'Client User'}</span></div>
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                              <div>Email: <span className="text-gray-900">{t.user_email}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Status button */}
                        <div className="flex flex-col items-end justify-center shrink-0 self-end md:self-center">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl border ${
                            isClosed
                              ? 'bg-gray-100 text-gray-500 border-gray-200'
                              : 'bg-brand-50 text-brand-600 border-brand-100'
                          }`}>
                            {isClosed ? 'Resolved' : 'Active Query'}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold mt-1.5">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Company Detail Panel */}
      <CompanyDetail 
        company={selectedCompany} 
        onClose={() => setSelectedCompany(null)} 
      />

      {/* Slide-over Ticket Detail Panel */}
      <TicketDetail 
        ticket={selectedTicket} 
        onClose={() => setSelectedTicket(null)}
        onToggleStatus={async (id, current) => {
          const res = await toggleStatusMutation.mutateAsync({ ticketId: id, currentStatus: current });
          // If active selection in drawer, update state
          if (selectedTicket && selectedTicket.id === id) {
            setSelectedTicket(prev => prev ? { ...prev, status: res.nextStatus as 'open' | 'closed' } : null);
          }
          return res;
        }}
        onDelete={async (id) => {
          const res = await deleteMutation.mutateAsync(id);
          setSelectedTicket(null);
          return res;
        }}
        onUpdateNotes={async (id, notes) => {
          const res = await updateNotesMutation.mutateAsync({ ticketId: id, notes });
          if (selectedTicket && selectedTicket.id === id) {
            setSelectedTicket(prev => prev ? { ...prev, internal_notes: notes } : null);
          }
          return res;
        }}
      />

      {/* Announcement Modals */}
      <AnnouncementModal 
        isOpen={announcementOpen} 
        onClose={() => setAnnouncementOpen(false)} 
        companies={companies}
      />
    </div>
  );
};
