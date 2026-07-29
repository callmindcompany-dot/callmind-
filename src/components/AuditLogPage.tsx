import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Download, 
  Shield, 
  AlertCircle,
  Clock,
  ExternalLink,
  Calendar,
  FileText,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useAuditLogs, useDeleteAuditLog } from '@/hooks/useAuditLogs';
import CallMindLoader from './CallMindLoader';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

export const AuditLogPage = () => {
  const { isSuperFounder, user } = useAuth();
  const { companyId } = useCompany();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Types');
  const [quickFilter, setQuickFilter] = useState<'all' | '24h'>('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [showOrgId, setShowOrgId] = useState(false);
  const [showRetentionWarning, setShowRetentionWarning] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Query Hook
  const { data: logs = [], isLoading, isError, refetch } = useAuditLogs(companyId, {
    searchQuery,
    category: filterType,
    mineOnly,
    userEmail: user?.email || null,
    dateRange,
    globalView: isSuperFounder && showOrgId,
  });

  const deleteLogMutation = useDeleteAuditLog();

  const handleDeleteLog = async (logId: string) => {
    if (!isSuperFounder) {
      toast.error("Access Denied: Only Super Admin can delete audit logs.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this log entry? It will be permanently removed.")) {
      return;
    }
    deleteLogMutation.mutate(logId);
  };

  const exportToCSV = () => {
    const headers = ['Action', 'User', 'Target', 'Category', 'Timestamp', 'Company ID'];
    const rows = logs.map(log => {
      const getSafeString = (str: any) => `"${String(str || '').replace(/"/g, '""')}"`;
      const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
      
      return [
        getSafeString(log.action),
        getSafeString(log.actor_email || log.details || 'System'),
        getSafeString(log.target),
        getSafeString(log.category),
        getSafeString(dateStr),
        getSafeString(log.company_id)
      ];
    });

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV report downloaded!");
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica");
      doc.setFontSize(18);
      doc.text("CallMind Enterprise Audit Logs", 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Scope: ${isSuperFounder && showOrgId ? 'Global Platform View' : 'Organization Scoped View'}`, 14, 34);
      
      let y = 45;
      logs.forEach((log, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`${index + 1}. [${log.category?.toUpperCase() || 'GENERAL'}] ${log.action}`, 14, y);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
        doc.text(`Actor: ${log.actor_email || log.details || 'System'} | Time: ${dateStr} | Target: ${log.target || 'N/A'}`, 14, y + 5);
        
        y += 15;
      });
      
      doc.save(`audit_logs_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF report generated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to generate PDF: " + err.message);
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'security': return 'bg-red-50 text-red-600 border-red-150';
      case 'config': return 'bg-blue-50 text-blue-600 border-blue-150';
      case 'data': return 'bg-purple-50 text-purple-600 border-purple-150';
      case 'billing': return 'bg-green-50 text-green-600 border-green-150';
      default: return 'bg-gray-50 text-gray-600 border-gray-150';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {showRetentionWarning && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Security Retention Notice</p>
              <p className="text-xs text-amber-700">Some logs are approaching the 15-day expiration limit and will be auto-purged.</p>
            </div>
          </div>
          <button 
            onClick={() => setShowRetentionWarning(false)}
            className="text-xs font-black text-amber-900 uppercase hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-50 rounded-lg">
              <Shield className="text-brand-600" size={20} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Enterprise Audit Trails</h1>
          </div>
          <p className="text-gray-500 font-medium">
            Immutable record of all actions across the {isSuperFounder && showOrgId ? 'entire platform' : 'organization'}.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isSuperFounder && (
            <button 
              onClick={() => setShowOrgId(!showOrgId)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all btn-tactile ${
                showOrgId 
                  ? 'bg-brand-600 text-white border-brand-600' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Toggle Org View
            </button>
          )}
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition-all shadow-xs btn-tactile"
          >
            Export CSV
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all shadow-xs btn-tactile"
          >
            <FileText size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs glass-card">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Events Captured</p>
          <div className="flex items-end gap-2">
            <h3 className="text-3xl font-black text-gray-900">{logs.length}</h3>
            <span className="text-[10px] font-bold text-emerald-500 mb-1">Live</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs glass-card">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Recent Security Alerts</p>
          <h3 className="text-3xl font-black text-red-500">{logs.filter(l => l.category?.toLowerCase() === 'security').length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs glass-card">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique Actors Logged</p>
          <h3 className="text-3xl font-black text-blue-500">
            {new Set(logs.map(l => l.actor_email || l.details || 'System')).size}
          </h3>
        </div>
      </div>

      {/* Filters Drawer bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by action, entity, or description..." 
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-2xl text-xs font-semibold outline-none focus:bg-white focus:border-brand-100 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-2xl border border-gray-100">
          <button
            onClick={() => setMineOnly(false)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${!mineOnly ? 'bg-white text-brand-600 shadow-xs border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            All Activity
          </button>
          <button
            onClick={() => setMineOnly(true)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${mineOnly ? 'bg-white text-brand-600 shadow-xs border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
          >
            My Actions
          </button>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-2xl border border-gray-100">
          {['All Types', 'Security', 'Data', 'Config'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${filterType === type ? 'bg-white text-brand-600 shadow-xs border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
          <Calendar size={12} className="text-gray-400 ml-1" />
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
            className="bg-transparent border-none text-[10px] font-bold outline-none"
          />
          <span className="text-gray-300">-</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
            className="bg-transparent border-none text-[10px] font-bold outline-none"
          />
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden min-h-[350px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs z-30">
            <CallMindLoader size="md" text="Syncing logs with Supabase..." />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
            <AlertCircle size={40} className="text-red-500 animate-bounce" />
            <h3 className="text-base font-bold text-gray-800">Connection Failed</h3>
            <p className="text-xs text-gray-500 max-w-sm">We couldn't synchronize the audit logs from database. Please verify connections and credentials.</p>
            <button 
              onClick={() => refetch()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase rounded-xl transition-all btn-tactile shadow-xs"
            >
              Retry Connection
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <History size={50} className="text-gray-200 mb-4" />
            <h3 className="text-base font-bold text-gray-400">No matching activities found</h3>
            <p className="text-xs text-gray-400 mt-1">Adjust filters or input parameters and check again.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max text-xs">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Action Event</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Initiated By</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Impact/Target</th>
                  {showOrgId && <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Company ID</th>}
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Timeline</th>
                  <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                  {isSuperFounder && <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Delete</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  let detailsObj: any = null;
                  try {
                    if (log.details) {
                      detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                    }
                  } catch (e) {
                    detailsObj = log.details;
                  }
                  
                  const methodStr = detailsObj?.method || (typeof detailsObj === 'string' ? detailsObj : 'Manual UI');

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 text-xs">{log.action}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
                          Method: {methodStr}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-600 shadow-inner group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                            {(log.actor_email || log.details || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{log.actor_email || log.details || 'System'}</p>
                            <p className="text-[9px] text-gray-400 font-bold">UID: {log.actor_id?.substring(0, 8) || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-700 flex items-center gap-1.5">
                          {log.target || 'N/A'}
                          {log.target_id && (
                            <ExternalLink size={11} className="text-gray-300 group-hover:text-brand-500 cursor-pointer" />
                          )}
                        </div>
                      </td>
                      {showOrgId && (
                         <td className="px-6 py-4">
                          <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">
                            {log.company_id}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-gray-500">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Clock size={11} className="opacity-40" />
                          {log.timestamp ? new Date(log.timestamp).toLocaleString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border ${getCategoryColor(log.category)}`}>
                          {log.category || 'General'}
                        </span>
                      </td>
                      {isSuperFounder && (
                        <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => handleDeleteLog(log.id)}
                             disabled={deleteLogMutation.isPending}
                             className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                             title="Permenantly remove log"
                           >
                             <Trash2 size={13} />
                           </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
