import { CheckCircle2, AlertTriangle, Power, Clock, Activity, XCircle, Info, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GoogleAdsConfigPanelProps {
  googleWebhookUrl: string;
  googleVerifyToken: string; setGoogleVerifyToken: (v: string) => void;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
  onSave: () => void;
  onToggleActive: () => void;
  isSaving: boolean;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function GoogleAdsConfigPanel({
  googleWebhookUrl, googleVerifyToken, setGoogleVerifyToken,
  isActive, lastSyncedAt, lastSyncCount, lastSyncErrors,
  onSave, onToggleActive, isSaving,
}: GoogleAdsConfigPanelProps) {
  const hasErrors = lastSyncErrors && lastSyncErrors.length > 0;

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  return (
    <div className="col-span-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* ─── Setup Wizard Step-by-Step ─── */}
      <div className="lg:col-span-4 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-brand-600 border-b border-gray-50 pb-2">Google Ads Form Setup</h3>
        <div className="space-y-4 text-xs text-gray-500 font-medium leading-relaxed">
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-blue-50 text-brand-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">1</span>
            <p>
              Navigate to your Google Ads Campaign Manager and select{' '}
              <a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-600 font-bold hover:underline inline-flex items-center gap-0.5">
                Assets &gt; Lead Forms <ExternalLink size={10} />
              </a>.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-blue-50 text-brand-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">2</span>
            <p>Create a Lead Form extension and select the fields you want to collect (Name, Phone, Email, etc.).</p>
          </div>
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-blue-50 text-brand-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">3</span>
            <p>Under the Webhook section, copy and paste the Callback URL and Verification Token generated on the right.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-blue-50 text-brand-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">4</span>
            <p>Click "Send Test Data" in Google Ads to verify integration setup and import a mock lead.</p>
          </div>
          <div className="flex gap-3 border-t border-gray-50 pt-4 mt-2">
            <Info size={16} className="text-brand-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 font-medium">
              Google Ads webhook forwards lead records in real-time as soon as the customer clicks submit.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Config Panel Form ─── */}
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="lg:col-span-5 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <h3 className="text-md font-bold text-gray-900">Google Ads Webhook Credentials</h3>
          {isActive ? (
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase border border-emerald-100 flex items-center gap-1">
              <CheckCircle2 size={12} /> Sync Active
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold uppercase border border-amber-100 flex items-center gap-1">
              <AlertTriangle size={12} /> Sync Paused
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Google Ads Callback URL</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={googleWebhookUrl} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 outline-none text-xs font-mono font-bold text-gray-700 select-all" />
              <button type="button" onClick={() => copyToClipboard(googleWebhookUrl, '📋 Copied Google Callback URL')} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-all">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Google Ads Verify Token Key</label>
            <input type="text" required placeholder="Verify Token" value={googleVerifyToken} onChange={(e) => setGoogleVerifyToken(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-brand-200 text-xs font-mono font-bold" />
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-50 pt-6">
          <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isSaving}
            className={`px-6 py-3.5 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider flex items-center gap-2 ${
              isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Power size={14} />
            {isActive ? 'Pause' : 'Activate'}
          </button>
        </div>
      </form>

      {/* ─── Sync Status Panel ─── */}
      <div className="lg:col-span-3 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Sync Status</h3>

          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isActive
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <p className="text-xs font-bold text-gray-800">{isActive ? 'Sync Active' : 'Sync Paused'}</p>
                <p className="text-[10px] text-gray-400 font-semibold">Real-time webhook mode</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  <Clock size={10} /> Last Sync
                </div>
                <p className="text-xs font-bold text-gray-800">{timeAgo(lastSyncedAt)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  <Activity size={10} /> Leads Sync
                </div>
                <p className="text-xs font-bold text-gray-800">{lastSyncCount ?? '—'}</p>
              </div>
            </div>

            {hasErrors && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 space-y-1">
                <p className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                  <XCircle size={12} /> Last Sync Errors
                </p>
                {lastSyncErrors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-500 font-medium">{err}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
