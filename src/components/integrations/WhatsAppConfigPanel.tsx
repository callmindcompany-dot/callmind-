import { Eye, EyeOff, Info } from 'lucide-react';
import { BSP_FIELDS } from '@/hooks/useWhatsAppConfig';
import type { BspProvider } from '@/types/integrations';

interface WhatsAppConfigPanelProps {
  provider: BspProvider; setProvider: (v: BspProvider) => void;
  apiKey: string; setApiKey: (v: string) => void;
  endpoint: string; setEndpoint: (v: string) => void;
  campaignName: string; setCampaignName: (v: string) => void;
  isActive: boolean; setIsActive: (v: boolean) => void;
  showToken: boolean; setShowToken: (v: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
}

const PROVIDERS: Array<{ id: BspProvider; name: string; note: string }> = [
  { id: 'wati', name: 'WATI', note: 'Templates and 24-hour replies' },
  { id: 'interakt', name: 'Interakt', note: 'Templates only' },
  { id: 'aisensy', name: 'AiSensy', note: 'Templates, one campaign each' },
];

/**
 * Connect the WhatsApp account this company already pays for.
 *
 * This asked for a Meta Developer App ID, a Phone Number ID, a WhatsApp
 * Business Account ID and a System User access token, behind a button reading
 * "Deploy WhatsApp Webhook Secret Credentials". That is the raw Meta Cloud API
 * path, which needs Business verification and template review on Facebook
 * Business Manager -- work an SME running six telecallers will not finish. So
 * they were four boxes nobody could fill, under a sentence claiming the values
 * were "securely saved via Supabase encrypted columns", which they were not:
 * the column is ordinary JSONB.
 *
 * It asks for a BSP account instead. The honest note about storage is at the
 * bottom.
 */
export function WhatsAppConfigPanel({
  provider, setProvider,
  apiKey, setApiKey,
  endpoint, setEndpoint,
  campaignName, setCampaignName,
  isActive, setIsActive,
  showToken, setShowToken,
  onSave, isSaving,
}: WhatsAppConfigPanelProps) {
  const needs = BSP_FIELDS[provider];

  return (
    <>
      <form
        onSubmit={(e) => { e.preventDefault(); onSave(); }}
        className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-6"
      >
        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-md font-bold text-gray-900">Connect your WhatsApp provider</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">
            CallMind sends through the WhatsApp Business account you already have. We do not hold
            one of our own.
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Who is your provider?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <label
                key={p.id}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col gap-1 transition-all ${
                  provider === p.id
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-gray-50/50 border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="bsp"
                    value={p.id}
                    checked={provider === p.id}
                    onChange={() => setProvider(p.id)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-gray-900">{p.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-semibold">{p.note}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900 font-medium leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>{needs.help}</span>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
            API key
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              required
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono font-semibold focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              aria-label={showToken ? 'Hide API key' : 'Show API key'}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {needs.endpoint && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              API endpoint
            </label>
            <input
              type="url"
              required
              placeholder="https://live-mt-server.wati.io/123456"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-mono font-semibold focus:border-emerald-500"
            />
            {/* Asked for rather than guessed: WATI gives every tenant its own
                host, so a constructed one would 404 for every customer. */}
            <p className="text-[10px] text-gray-400 font-semibold mt-1.5">
              Yours is different from everyone else&rsquo;s — copy it exactly.
            </p>
          </div>
        )}

        {needs.campaign && (
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Campaign name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. lead_followup"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-semibold focus:border-emerald-500"
            />
          </div>
        )}

        <label className="flex items-center gap-3 text-xs font-semibold text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Use this provider for sending</span>
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm uppercase transition-colors tracking-wider disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save provider'}
        </button>
      </form>

      <div className="col-span-1 bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col justify-between gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">
            What you can send
          </h3>
          {/* The constraint that shapes the whole feature, said where the
              person configuring it will read it -- not discovered later when a
              message to a cold lead fails. */}
          <p className="text-xs text-gray-600 font-semibold leading-relaxed">
            WhatsApp only lets a business message someone first using a{' '}
            <strong>template you have had approved</strong> with your provider. Free text is allowed
            only within 24 hours of the customer messaging you.
          </p>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            So your telecallers pick an approved template and fill in the blanks. Approve your
            templates with {PROVIDERS.find((p) => p.id === provider)?.name} first — CallMind cannot
            approve them for you.
          </p>
          {provider !== 'wati' && (
            <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 rounded-xl p-3 leading-relaxed">
              {PROVIDERS.find((p) => p.id === provider)?.name} does not offer free-text replies
              through its API, so even inside the 24-hour window your team will send templates.
              WATI does.
            </p>
          )}
        </div>

        <span className="block p-4 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-semibold text-gray-500 leading-relaxed">
          Your key is stored in a table only admins and founders of your company can read. It is not
          separately encrypted at column level — treat it as you would any credential, and rotate it
          from your provider&rsquo;s dashboard if you need to.
        </span>
      </div>
    </>
  );
}
