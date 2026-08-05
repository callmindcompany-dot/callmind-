import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp,
  Settings,
  Bell
} from 'lucide-react';
import { SlaSummary, CompanySlaSettings } from '../../types/lead';
import { useAuth } from '../../AuthContext';
import toast from 'react-hot-toast';

export const SlaDashboardWidget: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.companyId || '';

  const [summary, setSummary] = useState<SlaSummary | null>(null);
  const [settings, setSettings] = useState<CompanySlaSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const fetchSlaData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [sumRes, setRes] = await Promise.all([
        fetch(`/api/sla/summary?companyId=${encodeURIComponent(companyId)}`),
        fetch(`/api/sla/settings?companyId=${encodeURIComponent(companyId)}`)
      ]);

      const sumData = await sumRes.json();
      const setData = await setRes.json();

      if (sumData.success) setSummary(sumData.summary);
      if (setData.success) setSettings(setData.settings);
    } catch (err) {
      console.error('[SLA Widget Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlaData();
  }, [companyId]);

  const handleManualCheck = async () => {
    if (!companyId) return;
    setChecking(true);
    try {
      const res = await fetch('/api/sla/check-breaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`SLA Check Complete: ${data.breachedCount} breaches found, ${data.reassignedCount} reassigned.`);
        fetchSlaData();
      } else {
        toast.error(data.error || 'Failed to check SLA breaches');
      }
    } catch (err) {
      toast.error('Network error checking SLA breaches');
    } finally {
      setChecking(false);
    }
  };

  const handleToggleAutoReassign = async (enabled: boolean) => {
    if (!companyId || !settings) return;
    try {
      const updatedSettings = { ...settings, autoReassignEnabled: enabled };
      const res = await fetch('/api/sla/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        toast.success(enabled ? 'Auto-reassign ENABLED' : 'Auto-reassign DISABLED (Admin Alert Only)');
      }
    } catch (err) {
      toast.error('Failed to update SLA settings');
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
          <div className="h-20 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-600" />
            Lead SLA & Auto-Reassignment
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor first response times, callback deadlines, and auto-rotation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualCheck}
            disabled={checking}
            className="btn-tactile px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 font-medium text-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Run SLA Audit
          </button>

          <button
            onClick={() => setShowSettingsModal(!showSettingsModal)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="SLA Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active SLA Breaches */}
        <div className={`p-4 rounded-xl border ${summary?.activeBreachesCount ? 'bg-red-50/60 border-red-200 text-red-900' : 'bg-slate-50/60 border-slate-150 text-slate-800'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active SLA Breaches
            </span>
            <AlertTriangle className={`w-4 h-4 ${summary?.activeBreachesCount ? 'text-red-500' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {summary?.activeBreachesCount || 0}
            </span>
            <span className="text-xs text-slate-500">leads overdue</span>
          </div>
        </div>

        {/* Card 2: Stale Leads */}
        <div className="p-4 rounded-xl border bg-slate-50/60 border-slate-150 text-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stale Leads ({settings?.staleLeadThresholdDays || 7}d+)
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {summary?.staleLeadsCount || 0}
            </span>
            <span className="text-xs text-slate-500">uncontacted</span>
          </div>
        </div>

        {/* Card 3: Compliance Rate */}
        <div className="p-4 rounded-xl border bg-slate-50/60 border-slate-150 text-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              First Response SLA Rate
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {summary?.firstResponseComplianceRatePct || 100}%
            </span>
            <span className="text-xs text-emerald-600 font-medium">compliant</span>
          </div>
        </div>
      </div>

      {/* Auto-Reassign Toggle Bar */}
      <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings?.autoReassignEnabled ? (
            <UserCheck className="w-5 h-5 text-emerald-600" />
          ) : (
            <Bell className="w-5 h-5 text-amber-500" />
          )}
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Auto-Reassignment Rule Mode:
            </span>
            <span className="text-xs text-slate-600">
              {settings?.autoReassignEnabled 
                ? 'YES — Auto-rotate breached leads to eligible active agents with dual notifications'
                : 'NO — Retain lead with current agent and dispatch urgent SLA Breach Alerts to Admin'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleAutoReassign(true)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              settings?.autoReassignEnabled 
                ? 'bg-brand-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            YES (Auto-Reassign)
          </button>
          <button
            onClick={() => handleToggleAutoReassign(false)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
              !settings?.autoReassignEnabled 
                ? 'bg-amber-600 text-white shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            NO (Alert Only)
          </button>
        </div>
      </div>

      {/* Recent Auto-Reassignments Log */}
      {summary?.recentReassignments && summary.recentReassignments.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Recent SLA Auto-Reassignments
          </h4>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 rounded-l-lg">Lead</th>
                  <th className="p-2.5">From Agent</th>
                  <th className="p-2.5">To Agent</th>
                  <th className="p-2.5">Reason</th>
                  <th className="p-2.5 rounded-r-lg">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {summary.recentReassignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-2.5 font-medium text-slate-900">{item.leadName}</td>
                    <td className="p-2.5 text-slate-600">{item.fromUserId}</td>
                    <td className="p-2.5 text-brand-600 font-semibold">{item.toUserId}</td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{item.reason}</td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
