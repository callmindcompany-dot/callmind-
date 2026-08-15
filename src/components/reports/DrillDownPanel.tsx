import React from 'react';
import { motion } from 'framer-motion';
import { X, Download, Lock } from 'lucide-react';
import { useDrillDown } from '@/hooks/useDrillDown';
import { DRILL_ROW_LIMIT, type DrillDown } from '@/lib/drillDown';
import { describeDateWindow } from '@/lib/reportFilters';
import { formatRupees } from '@/lib/formatRupees';
import { formatDuration, parseDurationSeconds } from '@/lib/callDuration';
import { downloadCsv } from '@/lib/downloadCsv';
import { ReportState, stateOf } from './ReportState';

interface DrillDownPanelProps {
  companyId: string | null;
  drill: DrillDown | null;
  onClose: () => void;
  /** Mirrors the rest of the page: the last four digits only. */
  hidePhoneNumbers?: boolean;
  /** Export is a paid capability; the panel offers an upgrade instead. */
  canExport: boolean;
  onExportBlocked: () => void;
}

/** Column headings whose values are rendered, not printed raw. */
const MONEY_COLUMN = 'Deal value';
const DURATION_COLUMN = 'Duration';
const DATE_COLUMNS = new Set(['Created', 'When']);
const PHONE_COLUMN = 'Phone';

function maskPhone(value: string): string {
  return value.length <= 4 ? '****' : '********' + value.slice(-4);
}

export const DrillDownPanel = React.memo(({
  companyId, drill, onClose, hidePhoneNumbers, canExport, onExportBlocked,
}: DrillDownPanelProps) => {
  const query = useDrillDown(companyId, drill);
  const { data } = query;

  const rows = data?.rows ?? [];
  const columns = data?.columns ?? [];
  const total = data?.total ?? 0;
  const capped = total > rows.length;

  /** Renders one cell the way its column should read. */
  const render = (column: string, value: string | number | null): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (column === MONEY_COLUMN) return formatRupees(Number(value));
    if (column === DURATION_COLUMN) return formatDuration(parseDurationSeconds(value));
    if (DATE_COLUMNS.has(column)) return new Date(String(value)).toLocaleString('en-IN');
    if (column === PHONE_COLUMN && hidePhoneNumbers) return maskPhone(String(value));
    return String(value);
  };

  /**
   * The file is built from the rows already rendered, not from a second query.
   *
   * Re-querying for the download is how a file comes to disagree with the
   * screen: the period rolls over, a lead is edited, and the spreadsheet the
   * reader forwards no longer matches the chart they were looking at. Masked
   * phone numbers stay masked, for the same reason they are masked on screen.
   */
  const handleDownload = () => {
    if (!canExport) { onExportBlocked(); return; }
    if (!drill || rows.length === 0) return;
    downloadCsv(
      `${drill.subject}_${drill.subtitle.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.csv`,
      columns,
      rows.map(r => r.cells.map((cell, i) => {
        const column = columns[i];
        if (cell === null || cell === undefined) return '';
        if (column === PHONE_COLUMN && hidePhoneNumbers) return maskPhone(String(cell));
        // Money and durations go out as raw numbers so the file can be summed
        // and sorted. A formatted "₹1,20,000" is text to a spreadsheet.
        if (column === MONEY_COLUMN) return Number(cell);
        if (column === DURATION_COLUMN) return parseDurationSeconds(cell) ?? '';
        return cell;
      })),
    );
  };

  if (!drill) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        role="dialog"
        aria-label={drill.title}
        className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black uppercase tracking-tight text-slate-900">
              {drill.title}
            </h3>
            {/* The dimension clicked and the resolved dates, so the reader can
                see exactly which slice is in front of them. */}
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {drill.subtitle} · {describeDateWindow(drill.filters.dateRange, drill.filters.customRange)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
            >
              {canExport ? <Download size={12} /> : <Lock size={12} />} Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-6 py-4">
          <ReportState
            {...stateOf(query, d => !d || d.rows.length === 0)}
            minHeight={240}
            emptyMessage="No rows behind this segment."
          >
            <>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {/* The cap is stated whenever it bites. A panel silently
                    showing the newest 500 of 3,120 invites the reader to
                    count what is in front of them and be wrong. */}
                {capped
                  ? `Showing the newest ${rows.length} of ${total}`
                  : `${total} row${total === 1 ? '' : 's'}`}
              </p>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-[9px] font-black uppercase text-slate-400">
                    {columns.map(c => (
                      <th key={c} className={`pb-2 ${c === MONEY_COLUMN ? 'text-right' : ''}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                  {rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {row.cells.map((cell, i) => (
                        <td
                          key={columns[i]}
                          className={`py-3 ${columns[i] === MONEY_COLUMN ? 'text-right font-mono' : ''} ${
                            columns[i] === PHONE_COLUMN ? 'font-mono' : ''
                          }`}
                        >
                          {render(columns[i], cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {capped && (
                <p className="mt-4 text-[10px] font-medium text-slate-400">
                  Narrow the period or a filter to see the rest. The download
                  contains the {rows.length} rows shown here.
                </p>
              )}
            </>
          </ReportState>
        </div>
      </motion.aside>
    </div>
  );
});

DrillDownPanel.displayName = 'DrillDownPanel';
