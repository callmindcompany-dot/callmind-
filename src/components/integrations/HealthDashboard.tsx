import { Activity, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, Cpu, HardDrive } from 'lucide-react';
import { useIntegrationHealth } from '@/hooks/useIntegrationHealth';

interface HealthDashboardProps {
  companyId: string | null;
}

const inr = new Intl.NumberFormat('en-IN');

/**
 * What the integrations are doing, as far as we can actually tell.
 *
 * This screen used to assert things it had not measured. The header badge read
 * "Operational" unconditionally, because the rate-limit check scanned columns
 * that do not exist. A tile read "18ms — Ultra low latency response" for every
 * customer forever, because nothing measures webhook latency and both the hook
 * and this file fell back to a hand-picked 18. The quota bar divided by a
 * hardcoded 5,000, which is not the lead ceiling of any plan. And the whole
 * thing had no error state, so a failed query rendered as a confident row of
 * zeroes with "All channels sync healthy" underneath.
 *
 * The rule applied here: a number is shown when it was measured, and the screen
 * says so plainly when it was not.
 */
export function HealthDashboard({ companyId }: HealthDashboardProps) {
  const { data: health, isLoading, isError, error } = useIntegrationHealth(companyId);

  const failed = health?.failedSyncs24h ?? 0;
  const quotaPct =
    health && health.leadLimit
      ? Math.min(Math.round((health.totalLeads / health.leadLimit) * 100), 100)
      : null;

  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Activity size={22} className={isError ? 'text-gray-300' : 'text-emerald-500'} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Integration Health Monitor</h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Lead volume, connected channels and sync failures
            </p>
          </div>
        </div>

        {/* The badge follows the numbers instead of leading them. */}
        {isError ? (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-gray-200 flex items-center gap-1.5">
            <AlertCircle size={12} /> Status unknown
          </span>
        ) : health?.isRateLimited ? (
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-amber-100 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Rate limited
          </span>
        ) : failed > 0 ? (
          <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-red-100 flex items-center gap-1.5">
            <AlertCircle size={12} /> Syncs failing
          </span>
        ) : (
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> No failures reported
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full" />
          <p className="text-xs text-gray-400 font-semibold">Loading…</p>
        </div>
      ) : isError ? (
        /* A row of zeroes would read as "everything is fine and empty", which
           is a different claim from "we could not ask". */
        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
          <AlertCircle size={28} className="text-gray-300" />
          <p className="text-xs font-bold text-gray-600">Could not load integration health.</p>
          <p className="text-[11px] text-gray-400 font-medium max-w-sm">
            {(error as Error)?.message || 'The request failed.'} These figures are unknown right
            now — they are not zero.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {health?.isRateLimited && (
            <div className="col-span-full bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="text-amber-500 shrink-0" size={16} />
              <span>A sync channel reported a rate limit from its provider. The next scheduled run will retry.</span>
            </div>
          )}

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Leads Ingested Today */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ingested Today</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{health?.leadsToday ?? 0}</p>
              </div>
              {/* Was "🟢 Live syncing active", which is the same false auto-sync
                  claim the hub carried. Whether anything is scheduled is shown
                  on the source cards, where it is read from cron.job. */}
              <p className="text-[10px] text-gray-500 font-bold">
                {inr.format(health?.totalLeads ?? 0)} leads in total
              </p>
            </div>

            {/* Failed Syncs (24h) */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${
              failed > 0 ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'
            }`}>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Failed Syncs (24h)</p>
                <p className={`text-2xl font-black mt-1 ${failed > 0 ? 'text-red-600' : 'text-gray-900'}`}>{failed}</p>
              </div>
              <p className={`text-[10px] font-bold flex items-center gap-1 ${failed > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {failed > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                {/* "All channels sync healthy" claimed more than a zero count
                    can support -- a channel that has never run also reports 0. */}
                {failed > 0 ? 'Action required in logs' : 'No failures recorded'}
              </p>
            </div>

            {/* Active Channels */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Channels</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{health?.activeIntegrationsCount ?? 0}</p>
              </div>
              <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                <Cpu size={12} /> Switched on
              </p>
            </div>

            {/* Sources seen */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sources Seen</p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {Object.keys(health?.sourceCounts ?? {}).length}
                </p>
              </div>
              {/* Replaces "Avg Webhook Latency 18ms". Nothing measures latency;
                  this counts distinct values of leads.source, which is real. */}
              <p className="text-[10px] text-brand-600 font-bold">Distinct lead sources on record</p>
            </div>

            {/* Lead plan limit */}
            <div className="col-span-full bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-[10px] gap-3">
                <span className="font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <HardDrive size={12} /> Lead Storage Plan Limit
                </span>
                <span className="font-bold text-gray-600">
                  {health?.leadLimit
                    ? `${inr.format(health.totalLeads)} / ${inr.format(health.leadLimit)} leads (${quotaPct}%)`
                    : `${inr.format(health?.totalLeads ?? 0)} leads · no limit on this plan`}
                </span>
              </div>
              {quotaPct !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`rounded-full h-2 transition-all duration-500 ${
                      quotaPct > 85 ? 'bg-red-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* ─── Source Distribution Breakdown ─── */}
          <div className="lg:col-span-4 bg-gray-50/50 p-6 rounded-[24px] border border-gray-100 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">Traffic Distribution</h4>
              <div className="space-y-4 mt-4">
                {health && Object.keys(health.sourceCounts).length > 0 ? (
                  Object.entries(health.sourceCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([source, count]) => {
                      const pct = health.totalLeads > 0 ? Math.round((count / health.totalLeads) * 100) : 0;
                      return (
                        <div key={source} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
                            <span className="truncate pr-2">{source}</span>
                            <span className="font-bold text-gray-500 shrink-0">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200/60 rounded-full h-1.5">
                            <div className="bg-brand-600 rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-8 text-center text-gray-400 italic text-xs flex flex-col items-center gap-2">
                    <ShieldAlert size={24} className="text-gray-300" />
                    <span>No leads captured yet.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-gray-400 font-bold bg-white p-3.5 rounded-xl border border-gray-100">
              💡 Tip: Leverage Field Aliases under mapping configurations to normalize lead formats before routing.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
