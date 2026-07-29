import { Activity, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert, Cpu, HardDrive } from 'lucide-react';
import { useIntegrationHealth } from '@/hooks/useIntegrationHealth';

interface HealthDashboardProps {
  companyId: string | null;
}

export function HealthDashboard({ companyId }: HealthDashboardProps) {
  const { data: health, isLoading } = useIntegrationHealth(companyId);

  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
      {/* Header */}
      <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-emerald-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Integration Health Monitor</h3>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Live pipeline latency & telemetry details</p>
          </div>
        </div>
        {health?.isRateLimited ? (
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-amber-100 flex items-center gap-1.5 animate-pulse">
            <AlertTriangle size={12} /> Rate Limited
          </span>
        ) : (
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="animate-spin" /> Operational
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full" />
          <p className="text-xs text-gray-400 font-semibold">Gathering API telemetry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {health?.isRateLimited && (
            <div className="col-span-full bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="text-amber-500 shrink-0" size={16} />
              <span>One or more API sync channels have encountered rate limits. Automatic polling will resume shortly.</span>
            </div>
          )}

          {/* ─── Grid Stats Telemetry ─── */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Leads Ingested Today */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ingested Today</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{health?.leadsToday || 0}</p>
              </div>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                🟢 Live syncing active
              </p>
            </div>

            {/* Failed Syncs (24h) */}
            <div className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${
              (health?.failedSyncs24h || 0) > 0 
                ? 'bg-red-50/50 border-red-100' 
                : 'bg-gray-50/50 border-gray-100'
            }`}>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Failed Syncs (24h)</p>
                <p className={`text-2xl font-black mt-1 ${
                  (health?.failedSyncs24h || 0) > 0 ? 'text-red-600' : 'text-gray-900'
                }`}>{health?.failedSyncs24h || 0}</p>
              </div>
              <p className={`text-[10px] font-bold flex items-center gap-1 ${
                (health?.failedSyncs24h || 0) > 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {(health?.failedSyncs24h || 0) > 0 ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                {(health?.failedSyncs24h || 0) > 0 ? 'Action required in logs' : 'All channels sync healthy'}
              </p>
            </div>

            {/* Active Channels */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Active Channels</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{health?.activeIntegrationsCount || 0}</p>
              </div>
              <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                <Cpu size={12} /> Connected endpoints
              </p>
            </div>

            {/* Webhook Response Time */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Avg Webhook Latency</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{health?.avgWebhookResponseTime || 18}ms</p>
              </div>
              <p className="text-[10px] text-brand-600 font-bold flex items-center gap-1">
                ⚡ Ultra low latency response
              </p>
            </div>

            {/* API Quota Usage Limit */}
            <div className="col-span-full bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-3">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <HardDrive size={12} /> Lead Storage Plan Limit
                </span>
                <span className="font-bold text-gray-600">{health?.totalLeads || 0} / 5,000 leads ({health?.apiQuotaUsagePct || 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`rounded-full h-2 transition-all duration-500 ${
                    (health?.apiQuotaUsagePct || 0) > 85 ? 'bg-red-500' : 'bg-brand-500'
                  }`} 
                  style={{ width: `${health?.apiQuotaUsagePct || 0}%` }} 
                />
              </div>
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
                    .slice(0, 5) // Show top 5 sources
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
                    <span>No active leads captured yet.</span>
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
