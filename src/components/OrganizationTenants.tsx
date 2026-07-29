import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Users, 
  ArrowLeft, 
  Search, 
  CreditCard, 
  ExternalLink,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useOrganizationTenants } from '@/hooks/useOrganizationTenants';
import { toast } from 'react-hot-toast';

export const OrganizationTenants = ({ onBack }: { onBack: () => void }) => {
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset page to 1 when search changes
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query paginated, filtered tenants
  const { data, isLoading, error } = useOrganizationTenants(
    page,
    debouncedSearchQuery,
    filterPlan,
    filterStatus
  );

  const tenants = data?.tenants || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 50);

  // Lead capacity limit calculation
  const getLeadLimit = (plan: string): number => {
    const p = plan.toLowerCase();
    if (p.includes('enterprise')) return 10000;
    if (p.includes('professional')) return 5000;
    if (p.includes('basic') || p.includes('growth') || p.includes('team')) return 2000;
    return 500; // Trial limit
  };

  // Progress color configuration
  const getProgressBarColor = (percentage: number): string => {
    if (percentage < 70) return 'bg-emerald-500';
    if (percentage < 90) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // CSV Export utility
  const handleExportCSV = async () => {
    try {
      let query = supabase
        .from('organization_tenants_view')
        .select('*');

      if (debouncedSearchQuery.trim()) {
        query = query.ilike('name', `%${debouncedSearchQuery.trim()}%`);
      }
      if (filterPlan && filterPlan !== 'all') {
        query = query.eq('plan', filterPlan);
      }
      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data: allData, error: queryError } = await query.order('name', { ascending: true });
      
      if (queryError) throw queryError;

      if (!allData || allData.length === 0) {
        toast.error('No tenant data to export.');
        return;
      }

      const headers = [
        'ID', 
        'Organization Name', 
        'Domain', 
        'Plan', 
        'Status', 
        'Agents Count', 
        'Leads Count', 
        'Monthly MRR (INR)', 
        'Health Score'
      ];
      
      const rows = allData.map(row => [
        row.id,
        row.name,
        row.domain || '',
        row.plan || 'Trial',
        row.status || 'Active',
        row.user_count || 0,
        row.lead_count || 0,
        row.mrr || 0,
        row.health_score || 80
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `tenants_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV exported successfully!');
    } catch (err: unknown) {
      console.error('[CSV Export] Failed:', err);
      toast.error('Failed to export CSV data.');
    }
  };

  // Impersonate Action
  const handleImpersonate = async (companyId: string) => {
    setImpersonatingId(companyId);
    try {
      const { data: responseData, error: functionError } = await supabase.functions.invoke<{ success: boolean }>('impersonate-company', {
        body: { company_id: companyId }
      });

      if (functionError) throw functionError;

      if (responseData?.success) {
        window.open('/api/auth/impersonate-login', '_blank');
        toast.success('Impersonation session established. Dashboard opening...');
      } else {
        throw new Error('Impersonation cookie registration failed.');
      }
    } catch (err: unknown) {
      console.error('[Impersonate] Failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Please check permission configurations.';
      toast.error(`Impersonation failed: ${errMsg}`);
    } finally {
      setImpersonatingId(null);
    }
  };

  if (error) {
    toast.error('Error loading tenants metadata.');
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Tenant Management</h1>
            <p className="text-gray-500 font-medium mt-1">Cross-organization monitoring and lifecycle management.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search Input */}
        <div className="flex-1 relative min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by company name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:border-brand-500 transition-all font-medium text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select 
              value={filterPlan}
              onChange={(e) => {
                setFilterPlan(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-500 hover:text-gray-900 outline-none text-sm font-semibold appearance-none pr-10"
            >
              <option value="all">All Plans</option>
              <option value="Basic">Basic</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
              <option value="trial">Trial</option>
            </select>
          </div>

          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-500 hover:text-gray-900 outline-none text-sm font-semibold appearance-none pr-10"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Churned">Churned</option>
              <option value="Trialing">Trialing</option>
              <option value="Paused">Paused</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* CSV Export Button */}
          <button 
            onClick={handleExportCSV}
            className="px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl shadow-sm font-bold text-sm transition-all flex items-center gap-2"
          >
             <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-500">
              <Loader2 className="animate-spin text-brand-500" size={24} />
              <span className="font-semibold text-sm">Syncing tenant logs...</span>
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <Building2 size={48} className="text-gray-300" />
              <span className="font-bold text-base">No tenants found</span>
              <span className="text-xs">Adjust your search filters and try again.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Organization</th>
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Health & Plan</th>
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Utilization</th>
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right pr-8">Revenue</th>
                  <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tenants.map((tenant) => {
                  // Lead capacity progress calculation
                  const leadLimit = getLeadLimit(tenant.plan);
                  const leadPercent = Math.min(100, Math.max(0, (tenant.leadCount / leadLimit) * 100));
                  
                  // Agent seat allocation capacity calculation
                  const agentPercent = Math.min(100, Math.max(0, (tenant.userCount / tenant.seatLimit) * 100));

                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-brand-600 shadow-sm group-hover:scale-110 transition-transform shrink-0">
                            <Building2 size={24} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-black text-gray-900 leading-tight truncate">{tenant.name}</p>
                            <p className="text-xs text-gray-400 font-bold mt-0.5 truncate">{tenant.domain}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              tenant.status.toLowerCase() === 'active' 
                                ? 'bg-green-500 animate-pulse' 
                                : tenant.status.toLowerCase() === 'trialing' 
                                ? 'bg-blue-500' 
                                : 'bg-red-500'
                            }`} />
                            <span className="text-xs font-bold text-gray-700 capitalize">{tenant.status}</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg w-fit">
                            <CreditCard size={12} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{tenant.plan}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5 max-w-[220px]">
                          {/* Leads progress bar */}
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-black text-gray-400">
                            <span>Leads ({leadPercent.toFixed(0)}%)</span>
                            <span>{tenant.leadCount.toLocaleString()} / {leadLimit.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${getProgressBarColor(leadPercent)} rounded-full transition-all duration-500`} style={{ width: `${leadPercent}%` }} />
                          </div>
                          
                          {/* Agents progress bar */}
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-black text-gray-400 pt-2">
                            <span>Seats ({agentPercent.toFixed(0)}%)</span>
                            <span>{tenant.userCount} / {tenant.seatLimit}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${getProgressBarColor(agentPercent)} rounded-full transition-all duration-500`} style={{ width: `${agentPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right pr-8 shrink-0">
                        <p className="text-lg font-black text-gray-900">₹{tenant.mrr.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Monthly MRR</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button
                          onClick={() => handleImpersonate(tenant.id)}
                          disabled={impersonatingId === tenant.id}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 min-w-[120px]"
                        >
                          {impersonatingId === tenant.id ? (
                            <Loader2 className="w-3 animate-spin text-white" />
                          ) : (
                            <ExternalLink size={12} />
                          )}
                          <span>View as Hub</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Server-Side Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 px-8 py-5 bg-gray-50 gap-4">
            <div className="text-sm text-gray-500 font-semibold">
              Showing <span className="font-bold text-gray-800">{Math.min(totalCount, (page - 1) * 50 + 1)}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(totalCount, page * 50)}</span> of{' '}
              <span className="font-bold text-gray-800">{totalCount}</span> sub-hubs
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                // Render truncated page numbers if there are too many pages
                if (totalPages > 5 && Math.abs(page - p) > 1 && p !== 1 && p !== totalPages) {
                  if (p === 2 && page > 3) return <span key={p} className="text-gray-400 px-1 font-bold">...</span>;
                  if (p === totalPages - 1 && page < totalPages - 2) return <span key={p} className="text-gray-400 px-1 font-bold">...</span>;
                  return null;
                }
                
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      page === p
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                        : 'bg-white border border-gray-100 text-gray-600 hover:text-gray-950'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
