import { useState } from 'react';
import { useImportLogsQuery } from '@/hooks/useImportLogsQuery';
import { Database as DbIcon, FileSpreadsheet, CheckCircle2, AlertTriangle, Filter, Calendar } from 'lucide-react';

interface ImportLogsTableProps {
  companyId: string | null;
}

export function ImportLogsTable({ companyId }: ImportLogsTableProps) {
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: importLogs = [], isLoading } = useImportLogsQuery(companyId, {
    source,
    status,
    startDate,
    endDate,
  });

  const clearFilters = () => {
    setSource('');
    setStatus('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
      <div className="border-b border-gray-100 pb-4 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <DbIcon size={20} className="text-cyan-600" />
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Import Operations History</h3>
        </div>
        <span className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
          <FileSpreadsheet size={12} /> Live Ingestion History
        </span>
      </div>

      {/* ─── Premium Filter Bar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 items-end">
        {/* Source Dropdown */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Filter size={10} /> Ingestion Channel
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold outline-none"
          >
            <option value="">All Channels</option>
            <option value="CSV">Smart CSV</option>
            <option value="Webhook">Webhooks</option>
            <option value="IndiaMART">IndiaMART</option>
            <option value="Justdial">Justdial</option>
            <option value="TradeIndia">TradeIndia</option>
            <option value="Facebook">Facebook Ads</option>
            <option value="Google">Google Ads</option>
          </select>
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold outline-none"
          >
            <option value="">All Statuses</option>
            <option value="completed">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {/* Date Range Start */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Calendar size={10} /> From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold outline-none text-gray-700"
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Calendar size={10} /> To Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs font-semibold outline-none text-gray-700"
          />
        </div>

        {/* Actions */}
        <div>
          <button
            onClick={clearFilters}
            className="w-full py-2 bg-white hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl border border-gray-200 transition-colors uppercase tracking-wider"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : importLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50/20 rounded-2xl border border-dashed border-gray-150">
          <FileSpreadsheet size={40} className="text-gray-200 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-400 font-semibold">No spreadsheet imports matched your filters.</p>
          <p className="text-xs text-gray-300 mt-1">Try updating date ranges or channel selections above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-4 py-3 text-left">Filename / Channel</th>
                <th className="px-4 py-3 text-left">Rows Imported</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {importLogs.map((log) => (
                <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-700 flex items-center gap-2">
                    <FileSpreadsheet size={14} className="text-gray-300" />
                    {log.filename}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{log.row_count}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase inline-flex items-center gap-1 ${
                      log.status === 'completed' || log.status === 'success'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : log.status === 'error' || log.status === 'failed'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {log.status === 'completed' || log.status === 'success' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-medium">
                    {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
