import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { WhatsAppConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseWhatsAppConfigParams {
  initialConfig: WhatsAppConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * useWhatsAppConfig
 *
 * Local form state for WhatsApp Business API configuration.
 */
export function useWhatsAppConfig({ initialConfig, saveMutation }: UseWhatsAppConfigParams) {
  const [appId, setAppId] = useState(initialConfig.appId);
  const [phoneId, setPhoneId] = useState(initialConfig.phoneId);
  const [wabaId, setWabaId] = useState(initialConfig.wabaId);
  const [token, setToken] = useState(initialConfig.token);
  const [showToken, setShowToken] = useState(false);

  const syncFromSettings = useCallback((config: WhatsAppConfig) => {
    setAppId(config.appId);
    setPhoneId(config.phoneId);
    setWabaId(config.wabaId);
    setToken(config.token);
  }, []);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        whatsapp_config: {
          appId: appId.trim(),
          phoneId: phoneId.trim(),
          wabaId: wabaId.trim(),
          token: token.trim(),
        },
      },
      {
        onSuccess: () => toast.success('🎉 WhatsApp Business credentials deployed.'),
      }
    );
  }, [saveMutation, appId, phoneId, wabaId, token]);

  return {
    appId, setAppId,
    phoneId, setPhoneId,
    wabaId, setWabaId,
    token, setToken,
    showToken, setShowToken,
    saveConfig,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
