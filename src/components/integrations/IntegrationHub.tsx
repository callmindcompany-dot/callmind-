import {
  Facebook, ShoppingBag, Layout, FileSpreadsheet, Webhook,
  Database, MessageSquare, Mail, PhoneCall, Shuffle,
  Activity, CheckCircle2, ArrowRight, Search, Target,
} from 'lucide-react';
import { IntegrationCard } from './IntegrationCard';
import { ProviderCard } from './ProviderCard';
import { WorkflowCard } from './WorkflowCard';
import type { IntegrationWorkspace } from '@/types/integrations';
import { useIntegrationSyncStatus, type SyncProvider } from '@/hooks/useIntegrationSyncStatus';
import { useIntegrationRunSummary } from '@/hooks/useIntegrationRuns';
import { deriveIntegrationState, type DeliveryKind } from '@/lib/integrationState';

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
  const { data: runs } = useIntegrationRunSummary();

  /*
   * The sources, as data rather than nine hand-written cards.
   *
   * Written out this way so they can be ordered by what needs attention. Nine
   * fixed cards in a fixed grid meant a source that had failed four times
   * running sat wherever the author happened to type it, usually below three
   * that were fine -- and it looked identical to them, because the only two
   * states were "Live" and "Setup Ready".
   */
  const sources: Array<{
    // googleads and webhook are pushed rather than polled, so they have no
    // entry in integration_sync_status() -- but they do have runs, which is
    // what this key looks up.
    key: SyncProvider | 'googleads' | 'website' | 'csv' | 'webhook';
    workspace: IntegrationWorkspace;
    title: string;
    blurb: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    delivery: DeliveryKind;
    connected: boolean;
    action: string;
  }> = [
    {
      key: 'indiamart', workspace: 'indiamart', title: 'IndiaMart',
      blurb: 'GLUSR enquiries, pulled into your pipeline.',
      icon: <ShoppingBag size={24} />, iconBg: 'bg-orange-50', iconColor: 'text-orange-600',
      delivery: 'polled', connected: indiamartActive, action: 'Manage',
    },
    {
      key: 'justdial', workspace: 'justdial', title: 'Justdial',
      blurb: 'Listing enquiries, pulled into your pipeline.',
      icon: <Search size={24} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      delivery: 'polled', connected: justdialActive, action: 'Manage',
    },
    {
      key: 'tradeindia', workspace: 'tradeindia', title: 'TradeIndia',
      blurb: 'Buyer enquiries, pulled into your pipeline.',
      icon: <ShoppingBag size={24} />, iconBg: 'bg-orange-50', iconColor: 'text-orange-600',
      delivery: 'polled', connected: tradeindiaActive, action: 'Manage',
    },
    {
      key: 'facebook', workspace: 'facebook', title: 'Facebook Leads',
      blurb: 'Meta Ads lead forms, pulled into your pipeline.',
      icon: <Facebook size={24} />, iconBg: 'bg-[#1877F2]/10', iconColor: 'text-[#1877F2]',
      delivery: 'polled', connected: facebookActive, action: 'Manage',
    },
    {
      key: 'googleads', workspace: 'googleads', title: 'Google Ads',
      blurb: 'Google sends each lead form submission to your webhook.',
      icon: <Target size={24} />, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
      delivery: 'push', connected: googleadsActive, action: 'Manage',
    },
    {
      key: 'webhook', workspace: 'webhook', title: 'Webhook / API Source',
      blurb: 'Push leads from any custom system or Zapier to your inbound URL.',
      icon: <Webhook size={24} />, iconBg: 'bg-brand-50', iconColor: 'text-brand-600',
      // Always available: the URL exists for every company whether or not a
      // signing secret has been set.
      delivery: 'push', connected: true, action: 'Configure',
    },
    {
      key: 'website', workspace: 'website', title: 'Website Forms',
      blurb: 'Embed a form on your site; submissions arrive as leads.',
      icon: <Layout size={24} />, iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600',
      delivery: 'push', connected: true, action: 'Create Form',
    },
    {
      key: 'csv', workspace: 'csv', title: 'CSV Import',
      blurb: 'Bulk upload with AI column mapping and duplicate detection.',
      icon: <FileSpreadsheet size={24} />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
      delivery: 'manual', connected: true, action: 'Import Now',
    },
  ];

  const cards = sources
    .map((s) => ({
      ...s,
      state: deriveIntegrationState({
        connected: s.connected,
        delivery: s.delivery,
        scheduled: syncStatus?.[s.key as SyncProvider]?.is_scheduled ?? false,
        summary: runs?.[s.key],
      }),
    }))
    // Whatever is wrong comes first. A source failing since Tuesday should not
    // be below three that are fine because of the order they were typed in.
    .sort((a, b) => a.state.priority - b.state.priority);

  const needsAttention = cards.filter((c) => c.state.tone === 'bad' || c.state.tone === 'warn').length;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 items-start">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Integrations</h1>
        </div>
        {/* Was a permanent "Hub Active" pill, which said nothing about
            anything. This counts the sources that need somebody to look. */}
        {needsAttention > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-100">
            <Activity size={14} />
            {needsAttention} {needsAttention === 1 ? 'source needs' : 'sources need'} attention
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest border border-emerald-100">
            <CheckCircle2 size={14} /> All sources healthy
          </div>
        )}
      </div>

      <p className="text-gray-500 font-medium max-w-2xl leading-relaxed">
        Connect the places your leads come from, and see whether each one is still working.
      </p>

      {/* SECTION A: LEAD SOURCES */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-500 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Lead Sources</h2>
          <span className="text-[11px] font-semibold text-gray-400">
            Sorted by what needs attention
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c) => (
            <IntegrationCard
              key={c.key}
              title={c.title}
              description={c.blurb}
              icon={c.icon}
              iconBg={c.iconBg}
              iconColor={c.iconColor}
              status={c.state.label}
              statusDetail={c.state.detail}
              tone={c.state.tone}
              actionLabel={c.connected ? c.action : 'Configure'}
              onClick={() => onOpenWorkspace(c.workspace)}
            />
          ))}
          <IntegrationCard
            title="Google Sheets"
            description="Two-way sync with a spreadsheet. Not built yet — join the list and we will tell you when it is."
            icon={<Database size={24} />}
            iconBg="bg-yellow-50"
            iconColor="text-yellow-600"
            status="Not built"
            statusDetail="Register interest"
            tone="idle"
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
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sending Messages</h2>
          <span className="text-[11px] font-semibold text-gray-400">Not built yet</span>
        </div>

        {/*
          These three said "Enterprise Template / Proxy connection staging",
          "SMTP credentials registry" and "pending certificate signoff", with
          a "Configure Vault" button. None of those phrases describes anything,
          and all three read as a working system awaiting paperwork.

          What is true: send-whatsapp-message never called Meta and now answers
          501, receive-whatsapp-webhook stores nothing and answers 501, and
          send-email replies that custom-domain sending is disabled -- which it
          is, on every plan in src/config/pricing.ts. There is no telephony code
          at all. Storing credentials for any of them would collect a customer's
          secrets in exchange for nothing.
        */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 text-sm text-gray-600 font-medium max-w-3xl">
          CallMind does not send messages yet — not WhatsApp, not email, not calls through a
          provider. Your telecallers dial from their own SIM and message from their own WhatsApp,
          which is what the mobile app is built around. There is nothing to configure here, and
          we would rather say so than take your API keys for something that will not send.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProviderCard
            title="WhatsApp Business API"
            description="Sending from CallMind is not connected to Meta. Message the lead from WhatsApp directly for now."
            icon={<MessageSquare size={24} />}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
            status="Not built"
            statusDetail="Register interest"
            actionLabel="Join Waitlist"
            onClick={() => onOpenWorkspace('whatsapp-api')}
            isLocked={true}
          />
          <ProviderCard
            title="Email from your domain"
            description="Custom-domain sending is switched off on every plan; the mail function does not dispatch."
            icon={<Mail size={24} />}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
            status="Not built"
            statusDetail="Register interest"
            actionLabel="Join Waitlist"
            onClick={() => onOpenWorkspace('email-provider')}
            isLocked={true}
          />
          <ProviderCard
            title="VoIP Provider"
            description="Cloud telephony dialling. No provider is integrated; calls go through the telecaller's own SIM."
            icon={<PhoneCall size={24} />}
            iconBg="bg-gray-100"
            iconColor="text-gray-500"
            status="Not built"
            statusDetail="Register interest"
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
