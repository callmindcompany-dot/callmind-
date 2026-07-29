import { Copy, Terminal, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WebhookConfigPanelProps {
  webhookUrl: string;
  webhookSecret: string;
  onRegenerateSecret: () => void;
  onTestWebhook: () => void;
  isSaving: boolean;
}

export function WebhookConfigPanel({
  webhookUrl, webhookSecret, onRegenerateSecret, onTestWebhook, isSaving,
}: WebhookConfigPanelProps) {
  return (
    <>
      <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <h3 className="text-md font-bold text-gray-900">Developer Webhook Hook-Up</h3>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase border border-emerald-100 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" /> Active Endpoint
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Inbound API POST URL</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={webhookUrl} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-mono font-bold text-gray-700 select-all border border-gray-200" />
              <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied webhook URL'); }} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-all">
                <Copy size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Signature validation token secret</label>
            <div className="flex gap-2">
              <input type="text" readOnly value={webhookSecret} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-mono font-bold text-gray-700 select-all border border-gray-200" />
              <button onClick={onRegenerateSecret} className="px-4 py-3 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-xl text-xs font-bold uppercase transition-colors shrink-0">
                Regenerate
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4 flex items-center gap-1">
            <Terminal size={14} /> Simulate Payload
          </h4>
          <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
            Simulate passing an inbound JSON webhook lead to this active API node to confirm immediate data routing.
          </p>
          <button onClick={onTestWebhook} disabled={isSaving} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider disabled:opacity-50">
            {isSaving ? 'Triggering...' : 'Trigger Inbound JSON Mock Packet'}
          </button>
        </div>
      </div>

      <div className="col-span-1 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col justify-between space-y-6">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">JSON Expected Format</h3>
          <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-2xl overflow-x-auto leading-relaxed">
{`POST /api/webhooks/incoming
Header: "X-CallMind-Signature"

{
  "name": "Rahul Sharma",
  "phone": "919999988888",
  "email": "rahul@gmail.com",
  "budget": "1.5 Cr",
  "property": "3 BHK"
}`}
          </pre>
        </div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-relaxed">
          Webhook payloads are mapped directly onto internal standard fields via active Global Field Aliases rules.
        </p>
      </div>
    </>
  );
}
