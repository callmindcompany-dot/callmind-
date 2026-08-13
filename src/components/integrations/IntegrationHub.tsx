import {
  Facebook, ShoppingBag, Layout, FileSpreadsheet, Webhook,
  Database, MessageSquare, Mail, PhoneCall, Shuffle,
  Activity, CheckCircle2, ArrowRight, Search, Target,
} from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { ProviderCard } from './ProviderCard';
import { WorkflowCard } from './WorkflowCard';
import type { IntegrationWorkspace } from '@/types/integrations';
import {
  useIntegrationSyncStatus,
  describeSchedule,
  type SyncProvider,
} from '@/hooks/useIntegrationSyncStatus';

interface IntegrationHubProps {
  onOpenWorkspace: (ws: IntegrationWorkspace) => void;
  assignmentRule: 'Manual' | 'RoundRobin';
  isSaving: boolean;
  quickToggle: (rule: 'Manual' | 'RoundRobin') => void;
  indiamartActive: boolean;
  justdialActive: boolean;
  tradeindiaActive: boolean;
  facebookActive: boolean;
  googleadsActive: boolean;
}

export function IntegrationHub({ onOpenWorkspace, assignmentRule, isSaving, quickToggle, indiamartActive, justdialActive, tradeindiaActive, facebookActive, googleadsActive }: IntegrationHubProps) {
  /*
   * Every polled card used to say "Live" and "Auto-Sync Active" the moment a
   * config existed. Nothing polled: the four functions were invoked only from a
   * Sync Now button, so a customer who connected IndiaMART and walked away
   * received nothing while the card said it was live.
   *
   * The status is read from the database now -- integration_sync_status()
   * reports what cron.job actually holds -- so a card can only claim automatic
   * sync when a schedule exists. See 20260819000200_integration_poll_schedule.
   */
  const { data: syncStatus } = useIntegrationSyncStatus();

  /** What a connected, polled source can honestly say about itself. */
  const polled = (provider: SyncProvider, connected: boolean) => {
    if (!connected) {
      return { status: 'Setup Ready' as const, detail: 'Config required' };
    }
    const every = describeSchedule(syncStatus?.[provider]?.schedule ?? null);
    return syncStatus?.[provider]?.is_scheduled && every
      ? { status: 'Live' as const, detail: `Syncing ${every}` }
      : { status: 'Connected' as const, detail: 'Manual sync only' };
  };

  const im = polled('indiamart', indiamartActive);
  const jd = polled('justdial', justdialActive);
  const ti = polled('tradeindia', tradeindiaActive);
  const fb = polled('facebook', facebookActive);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Integrations</h1>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full text-xs font-bold uppercase tracking-widest border border-brand-100">
          <Database size={14} /> Hub Active
        </div>
      </div>

      <p className="text-gray-500 font-medium max-w-2xl leading-relaxed">
        Connect external lead sources, configure communication providers, and manage data routing workflows to keep your pipeline running smoothly.
      </p>

      {/* SECTION A: LEAD SOURCES */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-500 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Lead Sources</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <IntegrationCard
            title="Facebook Leads"
            description={facebookActive ? "Meta Ads lead forms, pulled into your pipeline." : "Connect Meta developer credentials to auto-import leads from Facebook Ads Forms."}
            icon={<Facebook size={24} />}
            iconBg="bg-[#1877F2]/10"
            iconColor="text-[#1877F2]"
            status={fb.status}
            statusDetail={fb.detail}
            actionLabel={facebookActive ? 'Manage' : 'Configure'}
            onClick={() => onOpenWorkspace('facebook')}
          />
          <IntegrationCard
            title="IndiaMart"
            description={indiamartActive ? "GLUSR enquiries, pulled into your pipeline." : "Connect your GLUSR API credentials to start auto-importing seller enquiries."}
            icon={<ShoppingBag size={24} />}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            status={im.status}
            statusDetail={im.detail}
            actionLabel={indiamartActive ? 'Manage' : 'Configure'}
            onClick={() => onOpenWorkspace('indiamart')}
          />
          <IntegrationCard
            title="Justdial"
            description={justdialActive ? "Listing enquiries, pulled into your pipeline." : "Connect your Justdial API Key and Listing ID to start auto-importing listing enquiries."}
            icon={<Search size={24} />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            status={jd.status}
            statusDetail={jd.detail}
            actionLabel={justdialActive ? 'Manage' : 'Configure'}
            onClick={() => onOpenWorkspace('justdial')}
          />
          <IntegrationCard
            title="TradeIndia"
            description={tradeindiaActive ? "Buyer enquiries, pulled into your pipeline." : "Connect your TradeIndia API key to start auto-importing buyer enquiries."}
            icon={<ShoppingBag size={24} />}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            status={ti.status}
            statusDetail={ti.detail}
            actionLabel={tradeindiaActive ? 'Manage' : 'Configure'}
            onClick={() => onOpenWorkspace('tradeindia')}
          />
          <IntegrationCard
            title="Google Ads"
            description={googleadsActive ? "Google sends each lead form submission to your webhook." : "Connect Google Ads Lead Form webhook verify tokens to auto-import leads."}
            icon={<Target size={24} />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            status={googleadsActive ? 'Live' : 'Setup Ready'}
            statusDetail={googleadsActive ? 'Arrives on submission' : 'Config required'}
            actionLabel={googleadsActive ? 'Manage' : 'Configure'}
            onClick={() => onOpenWorkspace('googleads')}
          />
          <IntegrationCard
            title="Website Forms"
            description="Generate custom HTML forms to embed on your website for instant lead capture."
            icon={<Layout size={24} />}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            status="Live"
            statusDetail="Embed widgets ready"
            actionLabel="Create Form"
            onClick={() => onOpenWorkspace('website')}
          />
          <IntegrationCard
            title="CSV Import"
            description="Bulk upload leads with AI-powered column mapping, dedup detection, and smart validation."
            icon={<FileSpreadsheet size={24} />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            status="Live"
            statusDetail="Smart Import Engine"
            actionLabel="Import Now"
            onClick={() => onOpenWorkspace('csv')}
          />
          <IntegrationCard
            title="Webhook / API Source"
            description="Use an inbound webhook URL to push leads from any custom system or Zapier."
            icon={<Webhook size={24} />}
            iconBg="bg-brand-50"
            iconColor="text-brand-600"
            status="Live"
            statusDetail="End-to-End ingestion active"
            actionLabel="Configure"
            onClick={() => onOpenWorkspace('webhook')}
          />
          <IntegrationCard
            title="Google Sheets"
            description="Two-way sync. Automatically update Google Sheets. In development."
            icon={<Database size={24} />}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-600"
            status="Beta Waitlist"
            statusDetail="Registration Open"
            actionLabel="Join Waitlist"
            onClick={() => onOpenWorkspace('sheets')}
            isLocked={true}
          />
        </div>
      </div>

      {/* SECTION B: COMMUNICATION PROVIDERS */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-brand-500 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Communication Providers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProviderCard
            title="WhatsApp Business API"
            description="Meta API credentials profile template. Setup archives keys securely; background dispatching and templating run internally."
            icon={<MessageSquare size={24} />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            status="Enterprise Template"
            statusDetail="Proxy connection staging"
            actionLabel="Configure Vault"
            onClick={() => onOpenWorkspace('whatsapp-api')}
          />
          <ProviderCard
            title="Email Provider"
            description="Configure custom business domains (SMTP/IMAP) to archive outbounds. Mail delivery service is pending certificate signoff."
            icon={<Mail size={24} />}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            status="Enterprise Template"
            statusDetail="SMTP credentials registry"
            actionLabel="Configure Vault"
            onClick={() => onOpenWorkspace('email-provider')}
          />
          <ProviderCard
            title="VoIP Provider"
            description="Integrate cloud telephony dialers. Direct dialing pipeline is currently locked inside our core sandbox staging."
            icon={<PhoneCall size={24} />}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
            status="Beta Waitlist"
            statusDetail="Registration Open"
            actionLabel="Join Waitlist"
            onClick={() => onOpenWorkspace('voip')}
            isLocked={true}
          />
        </div>
      </div>

      {/* SECTION C: DATA & WORKFLOW */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-slate-800 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Data & Workflow</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Lead Routing Rules — special inline card with quick toggle */}
          <div onClick={() => onOpenWorkspace('routing')} className="bg-white border border-gray-100 text-left rounded-3xl p-6 shadow-sm hover:border-brand-200 transition-all flex flex-col group cursor-pointer justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 w-full">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                    <Shuffle size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-md">Lead Routing Rules</h3>
                </div>
                <div className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 size={12} /> Live
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">Control how incoming leads from any source are distributed to your telecallers.</p>

              <div className="flex items-center gap-2 bg-gray-50 w-full p-2 rounded-2xl border border-gray-100 relative z-10" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => quickToggle('Manual')}
                  disabled={isSaving}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all uppercase ${
                    assignmentRule === 'Manual'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:bg-white/50'
                  }`}
                >
                  Manual
                </button>
                <button
                  onClick={() => quickToggle('RoundRobin')}
                  disabled={isSaving}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all uppercase ${
                    assignmentRule === 'RoundRobin'
                      ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:bg-white/50'
                  }`}
                >
                  Auto-Assign
                </button>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-xs font-semibold text-gray-600 w-full">
              <span className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Configure Rules</span>
              <span className="text-brand-600 font-bold flex items-center gap-1">Open <ArrowRight size={14} className="group-hover:translate-x-1" /></span>
            </div>
          </div>

          <WorkflowCard
            title="Data Mappings"
            description="Manage field aliases for Facebook, CSVs, and Webhooks mapping to internal targets."
            icon={<Layout size={20} />}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            status="Live"
            actionLabel="View Mappings"
            onClick={() => onOpenWorkspace('mapping')}
          />
          <WorkflowCard
            title="Integration Health"
            description="Monitor lead count distribution across different external data sources."
            icon={<Activity size={20} />}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            status="Live"
            actionLabel="Check Health"
            onClick={() => onOpenWorkspace('health')}
          />
          <WorkflowCard
            title="Import Operations"
            description="Review history of spreadsheet imports, duplicate skips, and column maps."
            icon={<Database size={20} />}
            iconBg="bg-cyan-50"
            iconColor="text-cyan-600"
            status="Live"
            actionLabel="View Logs"
            onClick={() => onOpenWorkspace('import-logs')}
          />
        </div>
      </div>
    </>
  );
}
