import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { usePlatformAuditLogs } from '@/hooks/usePlatformAuditLogs';
import { 
  ArrowLeft, 
  Download, 
  ShieldAlert, 
  Activity, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { toast } from 'react-hot-toast';

export const PlatformAuditLog = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  
  // State variables for query criteria
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCompanyId, setFilterCompanyId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Search input debouncer (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query platform audit logs via React Query hook
  const { data, isLoading, error } = usePlatformAuditLogs(
    page,
    debouncedSearchQuery,
    filterCategory,
    filterCompanyId,
    startDate,
    endDate
  );

  const logs = data?.logs || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 100);

  // CSV download function with proper escaping logic
  const downloadCSV = async () => {
    if (totalCount === 0) {
      toast.error("No logs available to download.");
      return;
    }

    setIsExporting(true);
    
    try {
      let query = supabase
        .from('audit_logs')
        .select('*');

      // Re-apply same filter logic as query hook for export
      if (debouncedSearchQuery.trim()) {
        query = query.or(`action.ilike.%${debouncedSearchQuery.trim()}%,user_email.ilike.%${debouncedSearchQuery.trim()}%`);
      }
      if (filterCategory && filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }
      if (filterCompanyId.trim()) {
        query = query.ilike('company_id', `%${filterCompanyId.trim()}%`);
      }
      if (startDate) {
        query = query.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      const { data: allData, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) throw queryError;

      if (!allData || allData.length === 0) {
        toast.error("No matching logs found for export.");
        return;
      }

      const headers = ['Timestamp', 'Organization ID', 'Category', 'User Name', 'User Email', 'Action Taken', 'Details'];
      
      const escapeCSVField = (val: string | null | undefined): string => {
        if (val === null || val === undefined) return '""';
        let str = String(val);
        // Neutralize formula injection for Excel/Sheets
        if (['=', '+', '-', '@', '\t', '\r'].some(c => str.startsWith(c))) {
          str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = allData.map(log => {
        const dateStr = log.created_at || log.timestamp || new Date().toISOString();
        const date = new Date(dateStr).toLocaleString();
        return [
          escapeCSVField(date),
          escapeCSVField(log.company_id),
          escapeCSVField(log.category),
          escapeCSVField(log.user_name),
          escapeCSVField(log.user_email),
          escapeCSVField(log.action),
          escapeCSVField(log.details)
        ];
      });

      const csvString = [
        headers.map(h => escapeCSVField(h)).join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `platform_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("CSV export downloaded successfully!");
    } catch (err: unknown) {
      console.error("[PlatformAuditLog] Export failed:", err);
      toast.error("Failed to generate CSV log export.");
    } finally {
      setIsExporting(false);
    }
  };

  if (error) {
    toast.error("Error syncing platform audit logs.");
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">F-03: Platform Audit Log</h1>
            <p className="text-gray-500 font-medium mt-1">Immutable record of all system-level changes and security events.</p>
          </div>
        </div>
        <button 
          onClick={downloadCSV}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 bg-brand-50 hover:bg-brand-100 text-brand-600 disabled:opacity-50 rounded-xl font-bold transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
          ) : (
            <Download size={18} />
          )}
          <span>Export All CSV</span>
        </button>
      </div>

      {/* Query Filters & Controls Section */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* General Search Input */}
          <div className="flex-1 relative min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by action text or user email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-2xl outline-none font-medium text-sm transition-all"
            />
          </div>

          {/* Category Filter Select */}
          <div className="relative">
            <select 
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-500 hover:text-gray-900 outline-none text-sm font-semibold appearance-none pr-10 min-w-[160px]"
            >
              <option value="all">All Categories</option>
              <option value="Security">Security</option>
              <option value="Lead">Lead</option>
              <option value="Config">Config</option>
              <option value="Billing">Billing</option>
            </select>
          </div>

          {/* Org Search Input */}
          <div className="relative min-w-[150px]">
            <input 
              type="text" 
              placeholder="Filter by Org ID..." 
              value={filterCompanyId}
              onChange={(e) => {
                setFilterCompanyId(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-2xl outline-none text-sm font-semibold w-full"
            />
          </div>
        </div>

        {/* Date Filters Section */}
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-50 pt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span>From:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700 normal-case"
            />
          </div>

          <div className="flex items-center gap-2">
            <span>To:</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700 normal-case"
            />
          </div>

          {(startDate || endDate) && (
            <button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-[10px] text-red-500 hover:text-red-600 font-black cursor-pointer transition-colors"
            >
              Clear Date Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <div className="p-2 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Real-Time Security Feed</h2>
          {isLoading && <Activity size={16} className="text-gray-400 animate-pulse ml-2" />}
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-500">
              <Loader2 className="animate-spin text-brand-500" size={24} />
              <span className="font-semibold text-sm">Syncing security logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <ShieldAlert size={48} className="text-gray-300" />
              <span className="font-bold text-base">No audit records found</span>
              <span className="text-xs">Adjust your search parameters and try again.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Organization</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-600">
                      {log.company_id}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                        log.category === 'Security' ? 'bg-red-50 text-red-600 border-red-100' :
                        log.category === 'Lead' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        log.category === 'Config' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        log.category === 'Billing' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{log.user_name || '-'}</p>
                      <p className="text-[10px] text-gray-400">{log.user_email || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="font-bold">
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 italic max-w-xs truncate" title={log.details || ''}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Server-Side Pagination Panel */}
        {!isLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 px-8 py-5 bg-gray-50 gap-4">
            <div className="text-sm text-gray-500 font-semibold">
              Showing <span className="font-bold text-gray-800">{Math.min(totalCount, (page - 1) * 100 + 1)}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(totalCount, page * 100)}</span> of{' '}
              <span className="font-bold text-gray-800">{totalCount}</span> security records
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
                // Truncate pagination for many pages
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
