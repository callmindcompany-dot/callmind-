import { useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { useSourcePerformance } from '@/hooks/useSourcePerformance';

/**
 * Which lead source is worth renewing.
 *
 * The health screen already showed leads per source, which sorts the sources
 * by how loud they are rather than by what they earn. This puts contacted and
 * valued beside the volume, because the row at the top is often the one worth
 * least -- and that is the whole reason to look.
 *
 * No conversion percentage. Deciding which status means "won" would be a guess,
 * and a percentage gets believed in a way that two raw counts do not.
 */

const inr = new Intl.NumberFormat('en-IN');
const money = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${inr.format(Math.round(n))}`;

const WINDOWS = [7, 30, 90] as const;

export function SourcePerformancePanel() {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, isError, error } = useSourcePerformance(days);

  const rows = data ?? [];
  const maxLeads = Math.max(1, ...rows.map((r) => r.leads));

  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
      <div className="border-b border-gray-100 pb-4 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp size={22} className="text-brand-500" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">
              What each source is worth
            </h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Volume beside value, so the loudest is not mistaken for the best
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setDays(w)}
              className={`px-3 py-1 text-xs font-extrabold rounded-lg transition-all ${
                days === w ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-xs font-semibold text-gray-400">Loading…</p>
      ) : isError ? (
        <div className="py-10 flex flex-col items-center gap-2 text-center">
          <AlertCircle size={24} className="text-gray-300" />
          <p className="text-xs font-bold text-gray-600">Could not load source performance.</p>
          <p className="text-[11px] text-gray-400 font-medium max-w-sm">
            {(error as Error)?.message || 'The request failed.'} These figures are unknown, not zero.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-xs font-semibold text-gray-400">
          No leads in the last {days} days.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                <th className="text-left pb-3">Source</th>
                <th className="text-right pb-3">Leads</th>
                <th className="text-right pb-3">Contacted</th>
                <th className="text-right pb-3">Closed with a value</th>
                <th className="text-right pb-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.source} className="border-t border-gray-50">
                  <td className="py-3 pr-4">
                    <div className="text-xs font-bold text-gray-900">{r.source}</div>
                    <div className="mt-1.5 w-full max-w-[10rem] bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 rounded-full h-1.5"
                        style={{ width: `${Math.round((r.leads / maxLeads) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-3 text-right text-xs font-bold text-gray-900 tabular-nums">
                    {inr.format(r.leads)}
                  </td>
                  <td className="py-3 text-right text-xs font-semibold text-gray-600 tabular-nums">
                    {inr.format(r.contacted)}
                  </td>
                  <td className="py-3 text-right text-xs font-semibold text-gray-600 tabular-nums">
                    {inr.format(r.valued)}
                  </td>
                  <td className={`py-3 text-right text-xs font-black tabular-nums ${
                    r.total_value > 0 ? 'text-emerald-600' : 'text-gray-300'
                  }`}>
                    {r.total_value > 0 ? money(r.total_value) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 text-[11px] text-gray-400 font-medium">
            “Closed with a value” counts leads that have a deal value recorded. CallMind does not
            guess which of your pipeline stages means won — you choose those yourself in Settings.
          </p>
        </div>
      )}
    </div>
  );
}
