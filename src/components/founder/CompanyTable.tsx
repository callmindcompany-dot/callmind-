import React, { useMemo } from 'react';
import { CompanyStats } from '@/types/founder';
import { 
  Building2, Users, FileSpreadsheet, ArrowUpDown, ChevronLeft, ChevronRight, Search, Filter 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CompanyTableProps {
  companies: CompanyStats[];
  totalCount: number;
  search: string;
  setSearch: (s: string) => void;
  plan: string;
  setPlan: (p: string) => void;
  status: string;
  setStatus: (s: string) => void;
  sortBy: keyof CompanyStats;
  setSortBy: (s: keyof CompanyStats) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (o: 'asc' | 'desc') => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  onSelectCompany: (company: CompanyStats) => void;
}

export const CompanyTable = React.memo(({
  companies,
  totalCount,
  search,
  setSearch,
  plan,
  setPlan,
  status,
  setStatus,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  page,
  setPage,
  pageSize,
  onSelectCompany,
}: CompanyTableProps) => {
  
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleSort = (column: keyof CompanyStats) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleExportCSV = () => {
    try {
      if (companies.length === 0) {
        toast.error("No company records to export!");
        return;
      }
      const headers = ['ID', 'Name', 'Plan', 'Status', 'Leads', 'Agents', 'MRR ($)', 'Health Score', 'Storage Used (GB)', 'Storage Limit (GB)', 'Renewal Date'];
      const rows = companies.map(c => [
        c.id,
        c.name,
        c.plan || 'Basic',
        c.status || 'Active',
        c.leads_count,
        c.agents_count,
        c.mrr,
        c.health_score,
        c.storage_used,
        c.storage_limit,
        c.renewal_date ? new Date(c.renewal_date).toLocaleDateString() : 'N/A'
      ]);

      const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `CallMind_Companies_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV file downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to export CSV: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[280px] flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by company name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl shadow-xs outline-none focus:border-brand-500 text-xs font-semibold text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-xs">
            <Filter size={14} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Plan:</span>
            <select
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer border-none p-0 focus:ring-0"
            >
              <option value="All">All Plans</option>
              <option value="Basic">Basic</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-xs">
            <Building2 size={14} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none cursor-pointer border-none p-0 focus:ring-0"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Suspended">Suspended</option>
              <option value="Churned">Churned</option>
            </select>
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 hover:border-brand-200 text-gray-700 hover:text-brand-600 rounded-xl transition-all shadow-xs text-xs font-bold btn-tactile"
        >
          <FileSpreadsheet size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Companies Grid/Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {[
                  { key: 'name', label: 'Company' },
                  { key: 'plan', label: 'Plan' },
                  { key: 'status', label: 'Status' },
                  { key: 'leads_count', label: 'Leads' },
                  { key: 'agents_count', label: 'Agents' },
                  { key: 'mrr', label: 'MRR' },
                  { key: 'health_score', label: 'Health' },
                  { key: 'renewal_date', label: 'Renewal' }
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key as keyof CompanyStats)}
                    className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.label}</span>
                      <ArrowUpDown size={12} className="text-gray-300" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs font-medium">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                    No client companies match the selected criteria.
                  </td>
                </tr>
              ) : (
                companies.map((c) => {
                  const isAtRisk = c.health_score < 50;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCompany(c)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-bold text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <span className="block font-black text-sm text-gray-900 group-hover:text-brand-600 transition-colors">
                              {c.name}
                            </span>
                            <span className="block text-[10px] text-gray-400 font-normal">
                              ID: {c.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded tracking-wider">
                          {c.plan || 'Basic'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'Active' ? 'bg-green-500 animate-pulse' :
                            c.status === 'Paused' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          <span className="font-bold text-gray-700">{c.status || 'Active'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-700">
                        {c.leads_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Users size={14} className="text-gray-400" />
                          <span>{c.agents_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-black text-gray-900">
                        ${c.mrr.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full font-mono font-black text-[10px] ${
                          c.health_score >= 80 ? 'bg-green-50 text-green-600' : 
                          c.health_score >= 50 ? 'bg-blue-50 text-blue-600' : 
                          'bg-red-50 text-red-600 animate-pulse border border-red-100'
                        }`}>
                          {c.health_score} / 100
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-semibold">
                        {c.renewal_date ? new Date(c.renewal_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-xs">
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Showing Page {page} of {totalPages} ({totalCount} total records)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 disabled:opacity-40 rounded-lg border border-gray-100 transition-colors disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 disabled:opacity-40 rounded-lg border border-gray-100 transition-colors disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
