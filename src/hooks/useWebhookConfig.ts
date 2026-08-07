import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import type { WebhookConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseWebhookConfigParams {
  companyId: string | null;
  initialConfig: WebhookConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * useWebhookConfig
 *
 * Manages webhook URL, secret generation, and test webhook trigger.
 */
export function useWebhookConfig({ companyId, initialConfig, saveMutation }: UseWebhookConfigParams) {
  const [webhookSecret, setWebhookSecret] = useState(initialConfig.secret);
  const webhookUrl = initialConfig.url || `https://api.callmind.app/v1/webhooks/incoming/${companyId}`;

  // Sync when parent settings reload
  const syncFromSettings = useCallback((config: WebhookConfig) => {
    setWebhookSecret(config.secret || generateSecret());
  }, []);

  const regenerateSecret = useCallback(async () => {
    const newKey = generateSecret();
    setWebhookSecret(newKey);
    saveMutation.mutate({ webhook_config: { secret: newKey, url: webhookUrl } });
    toast.success('🔑 Webhook signing key regenerated.');
  }, [saveMutation, webhookUrl]);

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required');

      const { error } = await supabase.from('leads').insert({
        name: 'API Test — Webhook Prospect',
        phone: '919000100001',
        email: 'webhook.test@example.com',
        notes: 'Lead pushed via internal webhooks console test.',
        estimated_budget: '₹2.5 Cr+',
        status: 'New Lead',
        source: 'Inbound API / Webhook',
        company_id: companyId,
        assigned_to: 'unassigned',
        is_deleted: false,
        is_unseen: true,
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'WEBHOOK_PAYLOAD_RECEIVED',
        category: 'config',
        target: 'Webhook Source Ingestion',
        details: 'Test webhook payload ingested. Mock lead created.',
      });
    },
    onSuccess: () => {
      toast.success('🎉 Mock payload ingested! Test lead created.');
    },
    onError: (err: Error) => {
      console.error(err);
      toast.error('Webhook ingestion simulation failed.');
    },
  });

  return {
    webhookUrl,
    webhookSecret,
    regenerateSecret,
    testWebhookMutation,
    syncFromSettings,
  };
}

function generateSecret(): string {
  return 'wh_sec_' + Math.random().toString(36).substring(2, 10).toUpperCase() +
    Math.random().toString(36).substring(2, 10).toUpperCase();
}
