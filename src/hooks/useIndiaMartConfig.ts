import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabaseClient';
import type { IndiaMartConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseIndiaMartConfigParams {
  initialConfig: IndiaMartConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
  companyId: string | null;
}

/**
 * useIndiaMartConfig
 *
 * Local form state for IndiaMart GLUSR API configuration
 * + manual poll trigger via Supabase Edge Function.
 */
export function useIndiaMartConfig({ initialConfig, saveMutation, companyId }: UseIndiaMartConfigParams) {
  const [apiKey, setApiKey] = useState(initialConfig.apiKey);
  const [mobile, setMobile] = useState(initialConfig.mobile);
  const [isActive, setIsActive] = useState(initialConfig.isActive);
  const [showKey, setShowKey] = useState(false);

  // Sync status (read-only from server)
  const [lastSyncedAt, setLastSyncedAt] = useState(initialConfig.lastSyncedAt);
  const [lastSyncCount, setLastSyncCount] = useState(initialConfig.lastSyncCount);
  const [lastSyncErrors, setLastSyncErrors] = useState(initialConfig.lastSyncErrors);

  const syncFromSettings = useCallback((config: IndiaMartConfig) => {
    setApiKey(config.apiKey);
    setMobile(config.mobile);
    setIsActive(config.isActive);
    setLastSyncedAt(config.lastSyncedAt);
    setLastSyncCount(config.lastSyncCount);
    setLastSyncErrors(config.lastSyncErrors);
  }, []);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        indiamart_config: {
          apiKey: apiKey.trim(),
          mobile: mobile.trim(),
          isActive,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () => toast.success('🎉 IndiaMart credentials saved.'),
      }
    );
  }, [saveMutation, apiKey, mobile, isActive, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  const toggleActive = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    saveMutation.mutate(
      {
        indiamart_config: {
          apiKey: apiKey.trim(),
          mobile: mobile.trim(),
          isActive: next,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () =>
          toast.success(next ? '🟢 IndiaMART polling activated!' : '⏸️ IndiaMART polling paused.'),
      }
    );
  }, [isActive, saveMutation, apiKey, mobile, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  // Manual poll trigger → calls the Edge Function
  const pollNowMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase.functions.invoke('indiamart-poll', {
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
          toast.success(`✅ Poll complete — no new leads found. ${result.skipped_duplicates} duplicates skipped.`);
        } else {
          toast.success(`🎉 ${result.new_leads} new leads imported from IndiaMART!`);
        }
      } else {
        toast.success('Poll complete.');
      }
    },
    onError: (err: any) => {
      console.error('[IndiaMART Poll Error]', err);
      if (err?.status === 429 || String(err?.message || '').includes('429')) {
        toast.error('API rate limit reached. Next sync in 15 minutes.');
      } else {
        toast.error(`Poll failed: ${err.message}`);
      }
    },
  });

  return {
    apiKey, setApiKey,
    mobile, setMobile,
    isActive, setIsActive,
    showKey, setShowKey,
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
