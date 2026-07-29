import { Eye, EyeOff, AlertTriangle, CheckCircle2, RefreshCw, Power, Clock, Activity, XCircle } from 'lucide-react';

interface JustdialConfigPanelProps {
  apiKey: string; setApiKey: (v: string) => void;
  listingId: string; setListingId: (v: string) => void;
  isActive: boolean;
  showKey: boolean; setShowKey: (v: boolean) => void;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
  onSave: () => void;
  onToggleActive: () => void;
  onPollNow: () => void;
  isPolling: boolean;
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

export function JustdialConfigPanel({
  apiKey, setApiKey, listingId, setListingId,
  isActive, showKey, setShowKey,
  lastSyncedAt, lastSyncCount, lastSyncErrors,
  onSave, onToggleActive, onPollNow,
  isPolling, isSaving,
}: JustdialConfigPanelProps) {
  const hasCredentials = apiKey.trim().length > 0 && listingId.trim().length > 0;
  const hasErrors = lastSyncErrors && lastSyncErrors.length > 0;

  return (
    <>
      {/* ─── Credentials Form ─── */}
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <h3 className="text-md font-bold text-gray-900">Justdial API Credentials</h3>
          {isActive ? (
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase border border-emerald-100 flex items-center gap-1">
              <CheckCircle2 size={12} /> Polling Active
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold uppercase border border-amber-100 flex items-center gap-1">
              <AlertTriangle size={12} /> Polling Paused
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Justdial Listing ID</label>
            <input type="text" required placeholder="e.g. 022PXX22.XX22..." value={listingId} onChange={(e) => setListingId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-brand-200 text-xs font-semibold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Justdial API Key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} required placeholder="e.g. JD_KEY_982348" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-gray-50 rounded-xl border border-transparent outline-none focus:bg-white focus:border-brand-200 text-xs font-mono font-semibold" />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Credentials'}
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
            {isActive ? 'Pause Polling' : 'Activate Polling'}
          </button>
        </div>
      </form>

      {/* ─── Sync Status Panel ─── */}
      <div className="col-span-1 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Sync Status</h3>

          <div className="space-y-4">
            {/* Status Indicator */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isActive
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-gray-50 border-gray-100'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <p className="text-xs font-bold text-gray-800">{isActive ? 'Auto-Polling Active' : 'Polling Paused'}</p>
                <p className="text-[10px] text-gray-400 font-semibold">{isActive ? 'Checking for new listings on schedule' : 'Activate to start automatic sync'}</p>
              </div>
            </div>

            {/* Last Sync Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  <Clock size={10} /> Last Sync
                </div>
                <p className="text-xs font-bold text-gray-800">{timeAgo(lastSyncedAt)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  <Activity size={10} /> Leads Imported
                </div>
                <p className="text-xs font-bold text-gray-800">{lastSyncCount ?? '—'}</p>
              </div>
            </div>

            {/* Errors */}
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

        {/* Manual Poll Button */}
        <button
          onClick={onPollNow}
          disabled={isPolling || !hasCredentials}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isPolling ? 'animate-spin' : ''} />
          {isPolling ? 'Polling Justdial API...' : 'Poll Now (Manual Sync)'}
        </button>
      </div>
    </>
  );
}
