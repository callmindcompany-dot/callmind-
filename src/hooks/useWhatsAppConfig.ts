import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { WhatsAppConfig, IntegrationConfigPayload, BspProvider } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseWhatsAppConfigParams {
  initialConfig: WhatsAppConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * Which WhatsApp provider this company sends through.
 *
 * This collected a Meta Developer App ID, a Phone Number ID, a WhatsApp
 * Business Account ID and a System User access token -- the raw Meta Cloud API
 * path. An Indian SME running six telecallers will not complete Business
 * verification and template review on Facebook Business Manager, so those four
 * boxes were four boxes nobody could fill.
 *
 * They already pay a BSP -- WATI, Interakt or AiSensy -- who has done all of
 * that. So CallMind asks for that account instead, and holds no WhatsApp
 * credentials of its own.
 *
 * The fields differ by provider, which is the point of asking which one first:
 *   WATI      needs its per-tenant endpoint as well as the token
 *   AiSensy   needs the campaign name it insists on creating per template
 *   Interakt  needs only the secret key
 */

/** What each provider needs, so the form can ask for exactly that. */
export const BSP_FIELDS: Record<BspProvider, { endpoint: boolean; campaign: boolean; help: string }> = {
  wati: {
    endpoint: true,
    campaign: false,
    help: 'API endpoint and access token from WATI: Settings → API Docs. The endpoint looks like https://live-mt-server.wati.io/<tenant-id>.',
  },
  interakt: {
    endpoint: false,
    campaign: false,
    help: 'Secret key from Interakt: Settings → Developer Setting → Secret Key.',
  },
  aisensy: {
    endpoint: false,
    campaign: true,
    help: 'API key from AiSensy: Manage → API Key. AiSensy also needs an API campaign per template, set to Live.',
  },
};

export function useWhatsAppConfig({ initialConfig, saveMutation }: UseWhatsAppConfigParams) {
  const [provider, setProvider] = useState<BspProvider>(initialConfig.provider || 'wati');
  const [apiKey, setApiKey] = useState(initialConfig.apiKey || '');
  const [endpoint, setEndpoint] = useState(initialConfig.endpoint || '');
  const [campaignName, setCampaignName] = useState(initialConfig.campaignName || '');
  const [isActive, setIsActive] = useState(Boolean(initialConfig.isActive));
  const [showToken, setShowToken] = useState(false);

  const syncFromSettings = useCallback((config: WhatsAppConfig) => {
    setProvider(config.provider || 'wati');
    setApiKey(config.apiKey || '');
    setEndpoint(config.endpoint || '');
    setCampaignName(config.campaignName || '');
    setIsActive(Boolean(config.isActive));
  }, []);

  const saveConfig = useCallback(() => {
    const needs = BSP_FIELDS[provider];

    // Checked here rather than left to the send to fail later, because a
    // missing endpoint produces a 404 against a host that does not exist, and
    // that is a much harder message to act on than this one.
    if (needs.endpoint && !endpoint.trim()) {
      toast.error('WATI needs the API endpoint from your dashboard.');
      return;
    }
    if (needs.campaign && !campaignName.trim()) {
      toast.error('AiSensy needs the campaign name you created for this template.');
      return;
    }

    saveMutation.mutate(
      {
        whatsapp_config: {
          provider,
          apiKey: apiKey.trim(),
          endpoint: endpoint.trim(),
          campaignName: campaignName.trim(),
          isActive,
        },
      },
      {
        onSuccess: () =>
          toast.success('WhatsApp provider saved. Send a test message to confirm it works.'),
      },
    );
  }, [saveMutation, provider, apiKey, endpoint, campaignName, isActive]);

  return {
    provider, setProvider,
    apiKey, setApiKey,
    endpoint, setEndpoint,
    campaignName, setCampaignName,
    isActive, setIsActive,
    showToken, setShowToken,
    saveConfig,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
