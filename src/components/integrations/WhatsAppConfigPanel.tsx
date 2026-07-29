import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface WhatsAppConfigPanelProps {
  appId: string; setAppId: (v: string) => void;
  phoneId: string; setPhoneId: (v: string) => void;
  wabaId: string; setWabaId: (v: string) => void;
  token: string; setToken: (v: string) => void;
  showToken: boolean; setShowToken: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function WhatsAppConfigPanel({
  appId, setAppId, phoneId, setPhoneId, wabaId, setWabaId,
  token, setToken, showToken, setShowToken, onSave, isSaving,
}: WhatsAppConfigPanelProps) {
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="lg:col-span-2 bg-slate-900 text-white rounded-[32px] p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-md font-bold text-white">WhatsApp Business Account Sync (Meta)</h3>
          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-bold uppercase border border-amber-500/10 flex items-center gap-1">
            <AlertTriangle size={12} /> Sandbox Token Config
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Meta Developer App ID</label>
            <input type="text" required placeholder="e.g. 192839210" value={appId} onChange={(e) => setAppId(e.target.value)} className="w-full px-4 py-3 bg-slate-800 rounded-xl outline-none text-xs font-semibold border border-transparent focus:border-emerald-500 text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp Phone Number ID</label>
            <input type="text" required placeholder="e.g. 10249210219" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="w-full px-4 py-3 bg-slate-800 rounded-xl outline-none text-xs font-semibold border border-transparent focus:border-emerald-500 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp Business Account ID (WABA)</label>
            <input type="text" required placeholder="e.g. 54910249210" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="w-full px-4 py-3 bg-slate-800 rounded-xl outline-none text-xs font-semibold border border-transparent focus:border-emerald-500 text-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">System User access token</label>
            <div className="relative">
              <input type={showToken ? 'text' : 'password'} required placeholder="EAAZB2k..." value={token} onChange={(e) => setToken(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-slate-800 rounded-xl outline-none text-xs font-mono font-semibold border border-transparent focus:border-emerald-500 text-white" />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg uppercase transition-colors tracking-wider disabled:opacity-50">
          {isSaving ? 'Deploying...' : 'Deploy WhatsApp Webhook Secret Credentials'}
        </button>
      </form>

      <div className="col-span-1 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">WhatsApp API Functions</h3>
          <p className="text-xs text-gray-500 font-semibold leading-relaxed">
            Deploying Meta key profiles allows you to verify message-templates, register system webhooks from Meta, and map inbound texts.
          </p>
        </div>
        <span className="block p-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 mt-6 leading-relaxed">
          🚨 Important: Permanent developer token configs are securely saved via Supabase encrypted columns. Only admins can modify this registry.
        </span>
      </div>
    </>
  );
}
