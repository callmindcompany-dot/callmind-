import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabaseClient';
import type { FacebookConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseFacebookConfigParams {
  initialConfig: FacebookConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
  companyId: string | null;
}

/**
 * useFacebookConfig
 *
 * Local form state for Facebook Lead Ads Graph API and Webhook configuration.
 */
export function useFacebookConfig({ initialConfig, saveMutation, companyId }: UseFacebookConfigParams) {
  const [pageId, setPageId] = useState(initialConfig?.pageId || '');
  const [formId, setFormId] = useState(initialConfig?.formId || '');
  const [appId, setAppId] = useState(initialConfig?.appId || '');
  const [appSecret, setAppSecret] = useState(initialConfig?.appSecret || '');
  const [accessToken, setAccessToken] = useState(initialConfig?.accessToken || '');
  const [syncMethod, setSyncMethod] = useState<'Webhook' | 'Polling'>(initialConfig?.syncMethod || 'Webhook');
  const [syncFrequency, setSyncFrequency] = useState<number>(initialConfig?.syncFrequency || 15);
  const [isActive, setIsActive] = useState(initialConfig?.isActive || false);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Read-only server telemetry
  const [lastSyncedAt, setLastSyncedAt] = useState(initialConfig?.lastSyncedAt || null);
  const [lastSyncCount, setLastSyncCount] = useState(initialConfig?.lastSyncCount || null);
  const [lastSyncErrors, setLastSyncErrors] = useState(initialConfig?.lastSyncErrors || []);

  const syncFromSettings = useCallback((config: FacebookConfig) => {
    setPageId(config?.pageId || '');
    setFormId(config?.formId || '');
    setAppId(config?.appId || '');
    setAppSecret(config?.appSecret || '');
    setAccessToken(config?.accessToken || '');
    setSyncMethod(config?.syncMethod || 'Webhook');
    setSyncFrequency(config?.syncFrequency || 15);
    setIsActive(config?.isActive || false);
    setLastSyncedAt(config?.lastSyncedAt || null);
    setLastSyncCount(config?.lastSyncCount || null);
    setLastSyncErrors(config?.lastSyncErrors || []);
  }, []);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        facebook_config: {
          pageId: pageId.trim(),
          formId: formId.trim(),
          appId: appId.trim(),
          appSecret: appSecret.trim(),
          accessToken: accessToken.trim(),
          syncMethod,
          syncFrequency,
          isActive,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () => toast.success('🎉 Facebook config saved successfully.'),
      }
    );
  }, [saveMutation, pageId, formId, appId, appSecret, accessToken, syncMethod, syncFrequency, isActive, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  const toggleActive = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    saveMutation.mutate(
      {
        facebook_config: {
          pageId: pageId.trim(),
          formId: formId.trim(),
          appId: appId.trim(),
          appSecret: appSecret.trim(),
          accessToken: accessToken.trim(),
          syncMethod,
          syncFrequency,
          isActive: next,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () =>
          toast.success(next ? '🟢 Facebook sync activated!' : '⏸️ Facebook sync paused.'),
      }
    );
  }, [isActive, saveMutation, pageId, formId, appId, appSecret, accessToken, syncMethod, syncFrequency, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  // Manual poll trigger for Facebook API Polling fallback
  const pollNowMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase.functions.invoke('facebook-poll', {
        body: { company_id: companyId },
      });

      if (error) throw error;
      return data as { success: boolean; results: Array<{ new_leads: number; skipped_duplicates: number; errors: string[] }> };
    },
    onSuccess: (data) => {
      const result = data?.results?.[0];
      if (result) {
        setLastSyncedAt(new Date().toISOString());
        setLastSyncCount(result.new_leads);
        setLastSyncErrors(result.errors);

        if (result.errors.length > 0) {
          toast.error(`⚠️ Synced with ${result.errors.length} error(s). Check logs.`);
        } else if (result.new_leads === 0) {
          toast.success(`✅ Poll complete — no new Facebook leads found.`);
        } else {
          toast.success(`🎉 ${result.new_leads} new leads imported from Facebook!`);
        }
      } else {
        toast.success('Poll completed.');
      }
    },
    onError: (err: any) => {
      console.error('[Facebook Poll Error]', err);
      if (err?.status === 429 || String(err?.message || '').includes('429')) {
        toast.error('API rate limit reached. Next sync in 15 minutes.');
      } else {
        toast.error(`Poll failed: ${err.message}`);
      }
    },
  });

  return {
    pageId, setPageId,
    formId, setFormId,
    appId, setAppId,
    appSecret, setAppSecret,
    accessToken, setAccessToken,
    syncMethod, setSyncMethod,
    syncFrequency, setSyncFrequency,
    isActive, setIsActive,
    showToken, setShowToken,
    showSecret, setShowSecret,
    lastSyncedAt,
    lastSyncCount,
    lastSyncErrors,
    saveConfig,
    toggleActive,
    pollNowMutation,
    isSaving: saveMutation.isPending,
    syncFromSettings,
  };
}
