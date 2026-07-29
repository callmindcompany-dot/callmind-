import { Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface EmailConfigPanelProps {
  smtpServer: string; setSmtpServer: (v: string) => void;
  smtpPort: string; setSmtpPort: (v: string) => void;
  smtpUser: string; setSmtpUser: (v: string) => void;
  smtpPass: string; setSmtpPass: (v: string) => void;
  showPass: boolean; setShowPass: (v: boolean) => void;
  imapServer: string; setImapServer: (v: string) => void;
  imapPort: string; setImapPort: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function EmailConfigPanel({
  smtpServer, setSmtpServer, smtpPort, setSmtpPort,
  smtpUser, setSmtpUser, smtpPass, setSmtpPass,
  showPass, setShowPass, imapServer, setImapServer,
  imapPort, setImapPort, onSave, isSaving,
}: EmailConfigPanelProps) {
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4">
          <h3 className="text-md font-bold text-gray-900">Connect Corporate SMTP Server</h3>
          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold uppercase border border-amber-100 flex items-center gap-1">
            <AlertTriangle size={12} /> SSL Sandbox Mode
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">SMTP Outgoing Host Server</label>
            <input type="text" required placeholder="e.g. smtp.secureserver.net" value={smtpServer} onChange={(e) => setSmtpServer(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-semibold focus:bg-white focus:border-brand-100" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Outgoing Port</label>
            <input type="text" required placeholder="e.g. 465" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-semibold focus:bg-white focus:border-brand-100 font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">SMTP Server Username (Email)</label>
            <input type="text" required placeholder="user@corporate.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-semibold focus:bg-white focus:border-brand-100" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">SMTP Server Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} required placeholder="🔒 Server App Key" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="w-full pl-4 pr-10 py-3 bg-gray-50 rounded-xl outline-none text-xs font-mono font-semibold" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-50 pt-4">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">IMAP Incoming Host Server (Optional)</label>
            <input type="text" placeholder="e.g. imap.secureserver.net" value={imapServer} onChange={(e) => setImapServer(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-semibold focus:bg-white focus:border-brand-100" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Incoming Port (IMAP)</label>
            <input type="text" placeholder="e.g. 993" value={imapPort} onChange={(e) => setImapPort(e.target.value)} className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none text-xs font-semibold focus:bg-white focus:border-brand-100 font-mono" />
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors uppercase tracking-wider disabled:opacity-50">
          {isSaving ? 'Committing...' : 'Commit SMTP parameters'}
        </button>
      </form>

      <div className="col-span-1 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Active Sync Status</h3>
          <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
            Securely connects corporate mail SMTP configurations. This setup prevents sent CRM emails from falling into spam folders and routes incoming responses to lead timelines automatically.
          </p>
        </div>
        <span className="block p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-100 text-[10px] font-semibold leading-relaxed">
          ⚠️ SSL Sandbox Mode: Credentials saved securely. Outbound dispatch queues remain paused until TXT and SPF DNS parameters are finalized on our active server.
        </span>
      </div>
    </>
  );
}
