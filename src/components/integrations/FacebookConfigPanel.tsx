import { Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw, Power, Clock, Activity, XCircle, Info, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FacebookConfigPanelProps {
  pageId: string; setPageId: (v: string) => void;
  formId: string; setFormId: (v: string) => void;
  appId: string; setAppId: (v: string) => void;
  appSecret: string; setAppSecret: (v: string) => void;
  accessToken: string; setAccessToken: (v: string) => void;
  syncMethod: 'Webhook' | 'Polling'; setSyncMethod: (v: 'Webhook' | 'Polling') => void;
  syncFrequency: number; setSyncFrequency: (v: number) => void;
  isActive: boolean;
  showToken: boolean; setShowToken: (v: boolean) => void;
  showSecret: boolean; setShowSecret: (v: boolean) => void;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
  onSave: () => void;
  onToggleActive: () => void;
  onPollNow: () => void;
  isPolling: boolean;
  isSaving: boolean;
  companyId: string | null;
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

export function FacebookConfigPanel({
  pageId, setPageId, formId, setFormId,
  appId, setAppId, appSecret, setAppSecret, accessToken, setAccessToken,
  syncMethod, setSyncMethod, syncFrequency, setSyncFrequency,
  isActive, showToken, setShowToken, showSecret, setShowSecret,
  lastSyncedAt, lastSyncCount, lastSyncErrors,
  onSave, onToggleActive, onPollNow,
  isPolling, isSaving, companyId,
}: FacebookConfigPanelProps) {
  const generatedWebhookUrl = `https://api.callmind.app/v1/webhooks/facebook/${companyId || 'company_id'}`;
  const verifyToken = companyId ? `fb_verify_${companyId}` : 'fb_verify_token';
  const hasCredentials = appId.trim().length > 0 && pageId.trim().length > 0 && formId.trim().length > 0 && accessToken.trim().length > 0;
  const hasErrors = lastSyncErrors && lastSyncErrors.length > 0;

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  return (
    <div className="col-span-full grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* ─── Setup Wizard Step-by-Step ─── */}
      <div className="lg:col-span-4 bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 border-b border-gray-50 pb-2">Setup Instructions</h3>
        <div className="space-y-4 text-xs text-gray-500 font-medium leading-relaxed">
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">1</span>
            <p>
              Create a Facebook App in the{' '}
              <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-0.5">
                Developer Console <ExternalLink size={10} />
              </a>.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">2</span>
            <p>Link your Meta Business Page and select the specific Lead Generation Form under the page settings.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">3</span>
            <p>Generate a permanent page access token in your Meta App Dashboard under Messenger or Webhooks setup.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center rounded-full text-[10px] shrink-0">4</span>
            <p>Enter the credentials on the right and select your preferred lead synchronization strategy.</p>
          </div>
          <div className="flex gap-3 border-t border-gray-50 pt-4 mt-2">
            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 font-medium">
              Webhooks trigger lead imports instantly. Polling acts as a backup that scans Graph endpoints regularly.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Config Panel Form ─── */}
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="lg:col-span-5 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <h3 className="text-md font-bold text-gray-900">Facebook API Settings</h3>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Meta App ID</label>
            <input type="text" required placeholder="e.g. 192839210" value={appId} onChange={(e) => setAppId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-indigo-200 text-xs font-semibold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Meta App Secret</label>
            <div className="relative">
              <input type={showSecret ? 'text' : 'password'} required placeholder="e.g. 398ab89f38f..." value={appSecret} onChange={(e) => setAppSecret(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-indigo-200 text-xs font-mono font-semibold" />
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Facebook Page ID</label>
            <input type="text" required placeholder="e.g. 1092830182" value={pageId} onChange={(e) => setPageId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-indigo-200 text-xs font-semibold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Facebook Lead Form ID</label>
            <input type="text" required placeholder="e.g. 8712398123" value={formId} onChange={(e) => setFormId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-indigo-200 text-xs font-semibold" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Permanent Page Access Token</label>
          <div className="relative">
            <input type={showToken ? 'text' : 'password'} required placeholder="EAAZB..." value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-indigo-200 text-xs font-mono font-semibold" />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-50 pt-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sync Method</label>
            <select value={syncMethod} onChange={(e) => setSyncMethod(e.target.value as 'Webhook' | 'Polling')} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-transparent text-xs font-bold focus:border-indigo-200 outline-none">
              <option value="Webhook">Webhook (Real-time)</option>
              <option value="Polling">Graph API Polling</option>
            </select>
          </div>
          {syncMethod === 'Polling' && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Polling Frequency</label>
              <select value={syncFrequency} onChange={(e) => setSyncFrequency(Number(e.target.value))} className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-transparent text-xs font-bold focus:border-indigo-200 outline-none">
                <option value={5}>Every 5 Mins</option>
                <option value={15}>Every 15 Mins</option>
                <option value={30}>Every 30 Mins</option>
              </select>
            </div>
          )}
        </div>

        {/* Webhook Configuration Parameters Output (Only when Webhook method selected) */}
        {syncMethod === 'Webhook' && (
          <div className="p-4 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Webhook Callback URL</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={generatedWebhookUrl} className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-[10px] font-mono select-all text-emerald-400 border border-slate-700 outline-none" />
                <button type="button" onClick={() => copyToClipboard(generatedWebhookUrl, '📋 Copied webhook URL')} className="px-3 bg-slate-850 hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors">
                  <Copy size={12} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Webhook Verify Token</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={verifyToken} className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-[10px] font-mono select-all text-emerald-400 border border-slate-700 outline-none" />
                <button type="button" onClick={() => copyToClipboard(verifyToken, '📋 Copied verify token')} className="px-3 bg-slate-850 hover:bg-slate-800 rounded-lg flex items-center justify-center transition-colors">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            disabled={!hasCredentials || isSaving}
            className={`px-6 py-3.5 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 ${
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
                <p className="text-[10px] text-gray-400 font-semibold">{syncMethod === 'Webhook' ? 'Real-time Webhook mode' : 'Background Graph API polling'}</p>
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

        {/* Manual Poll Button (Only when Polling is configured) */}
        {syncMethod === 'Polling' && (
          <button
            type="button"
            onClick={onPollNow}
            disabled={isPolling || !hasCredentials}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isPolling ? 'animate-spin' : ''} />
            {isPolling ? 'Polling Graph API...' : 'Poll Now (Manual Sync)'}
          </button>
        )}
      </div>
    </div>
  );
}
