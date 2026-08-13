/**
 * IntegrationsPage.tsx  –  CallMind CRM · Integration Hub
 *
 * Orchestrates workspace routing between the hub dashboard and
 * individual integration config panels. All data via Supabase + React Query.
 *
 * Architecture:
 *   - Types:       src/types/integrations.ts
 *   - Hooks:       useIntegrationSettings, useWebhookConfig, useFacebookConfig, etc.
 *   - Components:  src/components/integrations/*.tsx
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Database, PhoneCall, Mail, MessageSquare } from 'lucide-react';
import { useCompany } from '@/CompanyContext';
import { ErrorBoundary } from './ErrorBoundary';

// ─── Types ────────────────────────────────────────────────────────────────────
import type { IntegrationWorkspace } from '@/types/integrations';

// ─── Custom Hooks ─────────────────────────────────────────────────────────────
import { useIntegrationSettings } from '@/hooks/useIntegrationSettings';
import { useWebhookConfig } from '@/hooks/useWebhookConfig';
import { useFacebookConfig } from '@/hooks/useFacebookConfig';
import { useIndiaMartConfig } from '@/hooks/useIndiaMartConfig';
import { useJustdialConfig } from '@/hooks/useJustdialConfig';
import { useTradeIndiaConfig } from '@/hooks/useTradeIndiaConfig';
import { useGoogleAdsConfig } from '@/hooks/useGoogleAdsConfig';
import { useWhatsAppConfig } from '@/hooks/useWhatsAppConfig';
import { useEmailConfig } from '@/hooks/useEmailConfig';
import { useRoutingConfig } from '@/hooks/useRoutingConfig';
import { useFieldAliases } from '@/hooks/useFieldAliases';

// ─── Sub-Components ───────────────────────────────────────────────────────────
import { IntegrationHub } from './integrations/IntegrationHub';
import { FacebookConfigPanel } from './integrations/FacebookConfigPanel';
import { IndiaMartConfigPanel } from './integrations/IndiaMartConfigPanel';
import { JustdialConfigPanel } from './integrations/JustdialConfigPanel';
import { TradeIndiaConfigPanel } from './integrations/TradeIndiaConfigPanel';
import { GoogleAdsConfigPanel } from './integrations/GoogleAdsConfigPanel';
import { WebsiteFormPanel } from './integrations/WebsiteFormPanel';
import { WebhookConfigPanel } from './integrations/WebhookConfigPanel';
import { CommunicationRedirectPanel } from './integrations/CommunicationRedirectPanel';
import { RoutingConfigPanel } from './integrations/RoutingConfigPanel';
import { FieldAliasesPanel } from './integrations/FieldAliasesPanel';
import { HealthDashboard } from './integrations/HealthDashboard';
import { ImportLogsTable } from './integrations/ImportLogsTable';
import { WaitlistPanel } from './integrations/WaitlistPanel';
import { SmartImportModal } from './SmartImportModal';

// ─── Workspace Titles ─────────────────────────────────────────────────────────
const WORKSPACE_TITLES: Record<string, string> = {
  facebook: 'Facebook Lead Ads',
  indiamart: 'IndiaMart GLUSR',
  justdial: 'Justdial Integration',
  tradeindia: 'TradeIndia Integration',
  googleads: 'Google Ads Integration',
  website: 'Website Forms',
  csv: 'Smart CSV Import',
  webhook: 'Webhook / API',
  sheets: 'Google Sheets',
  'whatsapp-api': 'WhatsApp Business API',
  'email-provider': 'Email Provider',
  voip: 'VoIP Provider',
  routing: 'Lead Routing Rules',
  mapping: 'Data Mappings',
  health: 'Integration Health',
  'import-logs': 'Import Logs',
};

function IntegrationsPageContent() {
  const { companyId } = useCompany();

  // ─── Workspace Router ─────────────────────────────────────────────────────
  const [activeWorkspace, setActiveWorkspace] = useState<IntegrationWorkspace>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // ─── Master Settings Hook ─────────────────────────────────────────────────
  const { settings, isLoading, saveMutation } = useIntegrationSettings();

  // ─── Individual Config Hooks ──────────────────────────────────────────────
  const facebookHook = useFacebookConfig({ initialConfig: settings.facebookConfig, saveMutation, companyId });
  const indiaMartHook = useIndiaMartConfig({ initialConfig: settings.indiamartConfig, saveMutation, companyId });
  const justdialHook = useJustdialConfig({ initialConfig: settings.justdialConfig, saveMutation, companyId });
  const tradeindiaHook = useTradeIndiaConfig({ initialConfig: settings.tradeindiaConfig, saveMutation, companyId });
  const googleadsHook = useGoogleAdsConfig({ initialConfig: settings.googleadsConfig, saveMutation, companyId });
  const whatsAppHook = useWhatsAppConfig({ initialConfig: settings.whatsappConfig, saveMutation });
  const emailHook = useEmailConfig({ initialConfig: settings.emailConfig, saveMutation });
  const webhookHook = useWebhookConfig({ companyId, initialConfig: settings.webhookConfig, saveMutation });
  const routingHook = useRoutingConfig({ companyId, initialConfig: settings.routingConfig, saveMutation });
  const aliasesHook = useFieldAliases({ initialAliases: settings.fieldAliases, saveMutation });

  // ─── Sync local state when server data changes ────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      facebookHook.syncFromSettings(settings.facebookConfig);
      indiaMartHook.syncFromSettings(settings.indiamartConfig);
      justdialHook.syncFromSettings(settings.justdialConfig);
      tradeindiaHook.syncFromSettings(settings.tradeindiaConfig);
      googleadsHook.syncFromSettings(settings.googleadsConfig);
      whatsAppHook.syncFromSettings(settings.whatsappConfig);
      emailHook.syncFromSettings(settings.emailConfig);
      webhookHook.syncFromSettings(settings.webhookConfig);
      routingHook.syncFromSettings(settings.routingConfig);
      aliasesHook.syncFromSettings(settings.fieldAliases);
    }
    // Only sync when isLoading transitions from true → false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // ─── Workspace Navigation ────────────────────────────────────────────────
  const handleOpenWorkspace = (ws: IntegrationWorkspace) => {
    if (ws === 'csv') {
      setCsvModalOpen(true);
      return;
    }
    setActiveWorkspace(ws);
  };

  const handleBackToHub = () => setActiveWorkspace(null);

  // ─── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-400 font-semibold">Loading integrations...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* SmartImportModal — replaces old duplicate CSV engine */}
      {companyId && (
        <SmartImportModal
          isOpen={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          companyId={companyId}
        />
      )}

      <AnimatePresence mode="wait">
        {!activeWorkspace ? (
          /* ────────────────── HUB DASHBOARD ────────────────── */
          <motion.div
            key="hub"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10"
          >
            <IntegrationHub
              onOpenWorkspace={handleOpenWorkspace}
              assignmentRule={routingHook.assignmentRule}
              isSaving={saveMutation.isPending}
              quickToggle={routingHook.quickToggle}
              indiamartActive={indiaMartHook.isActive}
              justdialActive={justdialHook.isActive}
              tradeindiaActive={tradeindiaHook.isActive}
              facebookActive={facebookHook.isActive}
              googleadsActive={googleadsHook.isActive}
            />
          </motion.div>
        ) : (
          /* ────────────────── WORKSPACE PANEL ────────────────── */
          <motion.div
            key={activeWorkspace}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="space-y-6"
          >
            {/* Back Navigation Header */}
            <div className="flex items-center gap-4">
              <button onClick={handleBackToHub} className="p-2 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                <ArrowLeft size={18} className="text-gray-600" />
              </button>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Integration Hub</p>
                <h1 className="text-xl font-bold text-gray-900">{WORKSPACE_TITLES[activeWorkspace] || activeWorkspace}</h1>
              </div>
            </div>

            {/* Workspace Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {activeWorkspace === 'facebook' && (
                <FacebookConfigPanel
                  pageId={facebookHook.pageId} setPageId={facebookHook.setPageId}
                  formId={facebookHook.formId} setFormId={facebookHook.setFormId}
                  appId={facebookHook.appId} setAppId={facebookHook.setAppId}
                  appSecret={facebookHook.appSecret} setAppSecret={facebookHook.setAppSecret}
                  accessToken={facebookHook.accessToken} setAccessToken={facebookHook.setAccessToken}
                  syncMethod={facebookHook.syncMethod} setSyncMethod={facebookHook.setSyncMethod}
                  syncFrequency={facebookHook.syncFrequency} setSyncFrequency={facebookHook.setSyncFrequency}
                  isActive={facebookHook.isActive}
                  showToken={facebookHook.showToken} setShowToken={facebookHook.setShowToken}
                  showSecret={facebookHook.showSecret} setShowSecret={facebookHook.setShowSecret}
                  lastSyncedAt={facebookHook.lastSyncedAt}
                  lastSyncCount={facebookHook.lastSyncCount}
                  lastSyncErrors={facebookHook.lastSyncErrors}
                  onSave={facebookHook.saveConfig}
                  onToggleActive={facebookHook.toggleActive}
                  onPollNow={() => facebookHook.pollNowMutation.mutate()}
                  isPolling={facebookHook.pollNowMutation.isPending}
                  isSaving={facebookHook.isSaving}
                  companyId={companyId}
                />
              )}

              {activeWorkspace === 'indiamart' && (
                <IndiaMartConfigPanel
                  apiKey={indiaMartHook.apiKey} setApiKey={indiaMartHook.setApiKey}
                  mobile={indiaMartHook.mobile} setMobile={indiaMartHook.setMobile}
                  isActive={indiaMartHook.isActive}
                  showKey={indiaMartHook.showKey} setShowKey={indiaMartHook.setShowKey}
                  lastSyncedAt={indiaMartHook.lastSyncedAt}
                  lastSyncCount={indiaMartHook.lastSyncCount}
                  lastSyncErrors={indiaMartHook.lastSyncErrors}
                  onSave={indiaMartHook.saveConfig}
                  onToggleActive={indiaMartHook.toggleActive}
                  onPollNow={() => indiaMartHook.pollNowMutation.mutate()}
                  isPolling={indiaMartHook.pollNowMutation.isPending}
                  isSaving={indiaMartHook.isSaving}
                />
              )}

              {activeWorkspace === 'justdial' && (
                <JustdialConfigPanel
                  apiKey={justdialHook.apiKey} setApiKey={justdialHook.setApiKey}
                  listingId={justdialHook.listingId} setListingId={justdialHook.setListingId}
                  isActive={justdialHook.isActive}
                  showKey={justdialHook.showKey} setShowKey={justdialHook.setShowKey}
                  lastSyncedAt={justdialHook.lastSyncedAt}
                  lastSyncCount={justdialHook.lastSyncCount}
                  lastSyncErrors={justdialHook.lastSyncErrors}
                  onSave={justdialHook.saveConfig}
                  onToggleActive={justdialHook.toggleActive}
                  onPollNow={() => justdialHook.pollNowMutation.mutate()}
                  isPolling={justdialHook.pollNowMutation.isPending}
                  isSaving={justdialHook.isSaving}
                />
              )}

              {activeWorkspace === 'tradeindia' && (
                <TradeIndiaConfigPanel
                  apiKey={tradeindiaHook.apiKey} setApiKey={tradeindiaHook.setApiKey}
                  userid={tradeindiaHook.userid} setUserid={tradeindiaHook.setUserid}
                  isActive={tradeindiaHook.isActive}
                  showKey={tradeindiaHook.showKey} setShowKey={tradeindiaHook.setShowKey}
                  lastSyncedAt={tradeindiaHook.lastSyncedAt}
                  lastSyncCount={tradeindiaHook.lastSyncCount}
                  lastSyncErrors={tradeindiaHook.lastSyncErrors}
                  onSave={tradeindiaHook.saveConfig}
                  onToggleActive={tradeindiaHook.toggleActive}
                  onPollNow={() => tradeindiaHook.pollNowMutation.mutate()}
                  isPolling={tradeindiaHook.pollNowMutation.isPending}
                  isSaving={tradeindiaHook.isSaving}
                />
              )}

              {activeWorkspace === 'googleads' && (
                <GoogleAdsConfigPanel
                  googleWebhookUrl={googleadsHook.googleWebhookUrl}
                  googleVerifyToken={googleadsHook.googleVerifyToken}
                  setGoogleVerifyToken={googleadsHook.setGoogleVerifyToken}
                  isActive={googleadsHook.isActive}
                  lastSyncedAt={googleadsHook.lastSyncedAt}
                  lastSyncCount={googleadsHook.lastSyncCount}
                  lastSyncErrors={googleadsHook.lastSyncErrors}
                  onSave={googleadsHook.saveConfig}
                  onToggleActive={googleadsHook.toggleActive}
                  isSaving={googleadsHook.isSaving}
                />
              )}

              {activeWorkspace === 'website' && (
                <WebsiteFormPanel companyId={companyId} />
              )}

              {activeWorkspace === 'webhook' && (
                <WebhookConfigPanel
                  webhookUrl={webhookHook.webhookUrl}
                  webhookSecret={webhookHook.webhookSecret}
                  onRegenerateSecret={webhookHook.regenerateSecret}
                  onTestWebhook={() => webhookHook.testWebhookMutation.mutate()}
                  isSaving={webhookHook.testWebhookMutation.isPending}
                />
              )}

              {activeWorkspace === 'whatsapp-api' && (
                <CommunicationRedirectPanel
                  serviceName="WhatsApp Business API"
                  serviceIcon={<MessageSquare size={28} className="text-emerald-600" />}
                  serviceDescription="Configure your Meta WhatsApp Business API Cloud settings, message templates, verification keys, and webhook endpoints directly from the Communication control room."
                />
              )}

              {activeWorkspace === 'email-provider' && (
                <CommunicationRedirectPanel
                  serviceName="SMTP / Email Provider"
                  serviceIcon={<Mail size={28} className="text-blue-600" />}
                  serviceDescription="Configure custom corporate SMTP/IMAP credentials, business signatures, and transactional mail templates under the Communication settings tab."
                />
              )}

              {activeWorkspace === 'routing' && (
                <RoutingConfigPanel
                  assignmentRule={routingHook.assignmentRule} setAssignmentRule={routingHook.setAssignmentRule}
                  onSave={routingHook.saveRouting}
                  isSaving={routingHook.isSaving}
                />
              )}

              {activeWorkspace === 'mapping' && (
                <FieldAliasesPanel
                  fieldAliases={aliasesHook.fieldAliases}
                  newAliasField={aliasesHook.newAliasField} setNewAliasField={aliasesHook.setNewAliasField}
                  newAliasValue={aliasesHook.newAliasValue} setNewAliasValue={aliasesHook.setNewAliasValue}
                  onAddAlias={aliasesHook.addAlias}
                  onRemoveAlias={aliasesHook.removeAlias}
                />
              )}

              {activeWorkspace === 'health' && (
                <HealthDashboard companyId={companyId} />
              )}

              {activeWorkspace === 'import-logs' && (
                <ImportLogsTable companyId={companyId} />
              )}

              {activeWorkspace === 'sheets' && (
                <WaitlistPanel
                  companyId={companyId}
                  serviceName="Google Sheets Sync"
                  serviceIcon={<Database size={28} className="text-yellow-600" />}
                  serviceDescription="Bidirectional Google Sheets sync is under active development. Join our priority waitlist to be among the first to enable this workflow."
                />
              )}

              {activeWorkspace === 'voip' && (
                <WaitlistPanel
                  companyId={companyId}
                  serviceName="VoIP / Cloud Telephony"
                  serviceIcon={<PhoneCall size={28} className="text-gray-500" />}
                  serviceDescription="Integrate cloud telephony dialers for one-click calling directly from CRM. Currently in beta staging with select enterprise partners."
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <ErrorBoundary componentName="IntegrationsPage">
      <IntegrationsPageContent />
    </ErrorBoundary>
  );
}
