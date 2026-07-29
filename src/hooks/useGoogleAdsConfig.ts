import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import type { GoogleAdsConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseGoogleAdsConfigParams {
  initialConfig: GoogleAdsConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
  companyId: string | null;
}

/**
 * useGoogleAdsConfig
 *
 * Local state for Google Ads Webhook configuration.
 */
export function useGoogleAdsConfig({ initialConfig, saveMutation, companyId }: UseGoogleAdsConfigParams) {
  const [googleVerifyToken, setGoogleVerifyToken] = useState(
    initialConfig?.googleVerifyToken || companyId ? `google_ads_verify_${companyId}` : 'google_ads_verify_token'
  );
  const [isActive, setIsActive] = useState(initialConfig?.isActive || false);

  // Sync details
  const [lastSyncedAt, setLastSyncedAt] = useState(initialConfig?.lastSyncedAt || null);
  const [lastSyncCount, setLastSyncCount] = useState(initialConfig?.lastSyncCount || null);
  const [lastSyncErrors, setLastSyncErrors] = useState(initialConfig?.lastSyncErrors || []);

  const generatedWebhookUrl = companyId
    ? `https://api.callmind.app/v1/webhooks/googleads/${companyId}`
    : 'https://api.callmind.app/v1/webhooks/googleads/company_id';

  const syncFromSettings = useCallback((config: GoogleAdsConfig) => {
    setIsActive(config?.isActive || false);
    setGoogleVerifyToken(config?.googleVerifyToken || (companyId ? `google_ads_verify_${companyId}` : 'google_ads_verify_token'));
    setLastSyncedAt(config?.lastSyncedAt || null);
    setLastSyncCount(config?.lastSyncCount || null);
    setLastSyncErrors(config?.lastSyncErrors || []);
  }, [companyId]);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        googleads_config: {
          googleWebhookUrl: generatedWebhookUrl,
          googleVerifyToken: googleVerifyToken.trim(),
          isActive,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () => toast.success('🎉 Google Ads config saved successfully.'),
      }
    );
  }, [saveMutation, generatedWebhookUrl, googleVerifyToken, isActive, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  const toggleActive = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    saveMutation.mutate(
      {
        googleads_config: {
          googleWebhookUrl: generatedWebhookUrl,
          googleVerifyToken: googleVerifyToken.trim(),
          isActive: next,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () =>
          toast.success(next ? '🟢 Google Ads sync activated!' : '⏸️ Google Ads sync paused.'),
      }
    );
  }, [isActive, saveMutation, generatedWebhookUrl, googleVerifyToken, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  return {
    googleWebhookUrl: generatedWebhookUrl,
    googleVerifyToken, setGoogleVerifyToken,
    isActive, setIsActive,
    lastSyncedAt,
    lastSyncCount,
    lastSyncErrors,
    saveConfig,
    toggleActive,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
