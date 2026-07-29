import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { supabase } from '@/supabaseClient';
import type { TradeIndiaConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseTradeIndiaConfigParams {
  initialConfig: TradeIndiaConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
  companyId: string | null;
}

/**
 * useTradeIndiaConfig
 *
 * Local form state for TradeIndia B2B Buyer Enquiry API configuration
 * + manual poll trigger via Supabase Edge Function.
 */
export function useTradeIndiaConfig({ initialConfig, saveMutation, companyId }: UseTradeIndiaConfigParams) {
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [userid, setUserid] = useState(initialConfig?.userid || '');
  const [isActive, setIsActive] = useState(initialConfig?.isActive || false);
  const [showKey, setShowKey] = useState(false);

  // Sync status
  const [lastSyncedAt, setLastSyncedAt] = useState(initialConfig?.lastSyncedAt || null);
  const [lastSyncCount, setLastSyncCount] = useState(initialConfig?.lastSyncCount || null);
  const [lastSyncErrors, setLastSyncErrors] = useState(initialConfig?.lastSyncErrors || []);

  const syncFromSettings = useCallback((config: TradeIndiaConfig) => {
    setApiKey(config?.apiKey || '');
    setUserid(config?.userid || '');
    setIsActive(config?.isActive || false);
    setLastSyncedAt(config?.lastSyncedAt || null);
    setLastSyncCount(config?.lastSyncCount || null);
    setLastSyncErrors(config?.lastSyncErrors || []);
  }, []);

  const saveConfig = useCallback(() => {
    saveMutation.mutate(
      {
        tradeindia_config: {
          apiKey: apiKey.trim(),
          userid: userid.trim(),
          isActive,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () => toast.success('🎉 TradeIndia credentials saved.'),
      }
    );
  }, [saveMutation, apiKey, userid, isActive, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  const toggleActive = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    saveMutation.mutate(
      {
        tradeindia_config: {
          apiKey: apiKey.trim(),
          userid: userid.trim(),
          isActive: next,
          lastSyncedAt,
          lastSyncCount,
          lastSyncErrors,
        },
      },
      {
        onSuccess: () =>
          toast.success(next ? '🟢 TradeIndia polling activated!' : '⏸️ TradeIndia polling paused.'),
      }
    );
  }, [isActive, saveMutation, apiKey, userid, lastSyncedAt, lastSyncCount, lastSyncErrors]);

  // Manual poll trigger → calls the Edge Function
  const pollNowMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase.functions.invoke('tradeindia-poll', {
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
          toast.success(`🎉 ${result.new_leads} new leads imported from TradeIndia!`);
        }
      } else {
        toast.success('Poll complete.');
      }
    },
    onError: (err: any) => {
      console.error('[TradeIndia Poll Error]', err);
      if (err?.status === 429 || String(err?.message || '').includes('429')) {
        toast.error('API rate limit reached. Next sync in 15 minutes.');
      } else {
        toast.error(`Poll failed: ${err.message}`);
      }
    },
  });

  return {
    apiKey, setApiKey,
    userid, setUserid,
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
