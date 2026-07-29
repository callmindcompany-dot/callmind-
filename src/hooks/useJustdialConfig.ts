import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabaseClient';
import type { JustdialConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseJustdialConfigParams {
  initialConfig: JustdialConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
  companyId: string | null;
}

/**
 * useJustdialConfig
 *
 * Local form state for Justdial Listing API configuration
 * + manual poll trigger via Supabase Edge Function.
 */
export function useJustdialConfig({ initialConfig, saveMutation, companyId }: UseJustdialConfigParams) {
  const [apiKey, setApiKey] = useState(initialConfig.apiKey || '');
  const [listingId, setListingId] = useState(initialConfig.listingId || '');
  const [isActive, setIsActive] = useState(initialConfig.isActive || false);
  const [showKey, setShowKey] = useState(false);

  // Sync status
  const [lastSyncedAt, setLastSyncedAt] = useState(initialConfig.lastSyncedAt || null);
  const [lastSyncCount, setLastSyncCount] = useState(initialConfig.lastSyncCount || null);
  const [lastSyncErrors, setLastSyncErrors] = useState(initialConfig.lastSyncErrors || []);

  const syncFromSettings = useCallback((config: JustdialConfig) => {
    setApiKey(config.apiKey || '');
    setListingId(config.listingId || '');
    setIsActive(config.isActive || false);
    setLastSyncedAt(config.lastSyncedAt || null);
    setLastSyncCount(config.lastSyncCount || null);
    setLastSyncErrors(config.lastSyncErrors || []);
  }, []);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        justdial_config: {
          apiKey: apiKey.trim(),
          listingId: listingId.trim(),
          isActive,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () => toast.success('🎉 Justdial credentials saved.'),
      }
    );
  }, [saveMutation, apiKey, listingId, isActive, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  const toggleActive = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    saveMutation.mutate(
      {
        justdial_config: {
          apiKey: apiKey.trim(),
          listingId: listingId.trim(),
          isActive: next,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () =>
          toast.success(next ? '🟢 Justdial polling activated!' : '⏸️ Justdial polling paused.'),
      }
    );
  }, [isActive, saveMutation, apiKey, listingId, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  // Manual poll trigger → calls the Edge Function
  const pollNowMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase.functions.invoke('justdial-poll', {
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
          toast.success(`🎉 ${result.new_leads} new leads imported from Justdial!`);
        }
      } else {
        toast.success('Poll complete.');
      }
    },
    onError: (err: any) => {
      console.error('[Justdial Poll Error]', err);
      if (err?.status === 429 || String(err?.message || '').includes('429')) {
        toast.error('API rate limit reached. Next sync in 15 minutes.');
      } else {
        toast.error(`Poll failed: ${err.message}`);
      }
    },
  });

  return {
    apiKey, setApiKey,
    listingId, setListingId,
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
