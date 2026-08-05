import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Clock, ExternalLink } from 'lucide-react';
import { IntegrationHealthItem } from '../../services/integrationHealth.service';

interface IntegrationHealthCenterProps {
  userRole?: string;
}

export const IntegrationHealthCenter: React.FC<IntegrationHealthCenterProps> = ({ userRole = 'founder' }) => {
  const [items, setItems] = useState<IntegrationHealthItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [retryingProvider, setRetryingProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integration-health');
      if (!res.ok) throw new Error('Failed to fetch integration health data');
      const data = await res.json();
      setItems(data.health || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error loading integrations' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRetry = async (providerName: string) => {
    if (!['founder', 'admin'].includes(userRole)) {
      setMessage({ type: 'error', text: 'Unauthorized. Only Founder or Admin can trigger retries.' });
      return;
    }

    setRetryingProvider(providerName);
    setMessage(null);
    try {
      const res = await fetch('/api/integration-health/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerName }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Retry failed');

      setMessage({ type: 'success', text: data.message || `Retry initiated for ${providerName}` });
      await fetchHealth();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to trigger retry' });
    } finally {
      setRetryingProvider(null);
    }
  };

  const healthyCount = items.filter(i => i.status === 'healthy').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-500" />
            Integration Health Center
          </h1>
          <p className="text-sm text-slate-500 font-sans mt-1">
            Real-time operational monitoring for IndiaMART, JustDial, WhatsApp, Razorpay, and Telephony systems.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold text-sm shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-200/80 bg-white/60">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Active Integrations</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{items.length}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40">
          <div className="text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Healthy Systems
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{healthyCount}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-100 bg-amber-50/40">
          <div className="text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Degraded / Warning
          </div>
          <div className="text-3xl font-black text-amber-600 mt-1">{warningCount}</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-red-100 bg-red-50/40">
          <div className="text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="w-4 h-4 text-red-500" /> Failed Systems
          </div>
          <div className="text-3xl font-black text-red-600 mt-1">{errorCount}</div>
        </div>
      </div>

      {/* Integration Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((item) => (
          <div key={item.providerName} className="glass-card p-5 rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {item.providerName}
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide flex items-center gap-1 ${
                  item.status === 'healthy' ? 'bg-emerald-100 text-emerald-800' :
                  item.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.status === 'healthy' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {item.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {item.status === 'error' && <XCircle className="w-3.5 h-3.5" />}
                  {item.status}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 my-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Last Sync:</span>
                  <span className="font-semibold text-slate-700">
                    {item.lastSuccessAt ? new Date(item.lastSuccessAt).toLocaleString('en-IN') : 'Never'}
                  </span>
                </div>
                {item.retryCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Retry Count:</span>
                    <span className="font-semibold text-amber-600">{item.retryCount} attempts</span>
                  </div>
                )}
                {item.nextRetryAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Next Scheduled Retry:</span>
                    <span className="font-semibold text-brand-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.nextRetryAt).toLocaleTimeString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {item.safeErrorSummary && (
                <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl text-xs text-red-700 font-mono break-all my-2">
                  <span className="font-bold block text-red-900 mb-0.5">Error Log:</span>
                  {item.safeErrorSummary}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Backoff: {item.retryCount > 0 ? `${Math.pow(2, item.retryCount)}m` : 'Immediate'}</span>
              <button
                onClick={() => handleRetry(item.providerName)}
                disabled={retryingProvider === item.providerName || !['founder', 'admin'].includes(userRole)}
                className="px-3 py-1.5 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-bold text-xs shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retryingProvider === item.providerName ? 'animate-spin' : ''}`} />
                Manual Retry
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
