import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { inboundWebhookUrl } from '@/lib/webhookUrl';
import type { WebhookConfig, IntegrationConfigPayload } from '@/types/integrations';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseWebhookConfigParams {
  companyId: string | null;
  initialConfig: WebhookConfig;
  saveMutation: UseMutationResult<void, Error, IntegrationConfigPayload>;
}

/**
 * The inbound webhook: its URL, its secret, and a test that actually tests it.
 *
 * The URL was the literal https://api.callmind.app/v1/webhooks/incoming/<id>,
 * which is a guess about production DNS baked into the client. SettingsPage
 * built the same URL from window.location.origin, so the two disagreed and one
 * of them was wrong wherever the product was deployed. It is derived here too.
 *
 * The test did not test anything. It inserted a row straight into `leads`
 * through supabase-js -- never touching the webhook endpoint -- with a made-up
 * name and a made-up "₹2.5 Cr+" budget, then reported "Mock payload ingested!".
 * So the one button whose entire job is to prove the integration works passed
 * while the endpoint rejected every real request with 403, which it did: the
 * server checked the secret against lead_sources, a table nothing writes to.
 *
 * It now posts a real payload to the real URL with the real secret header, and
 * reports what came back. That is the only version of this button worth having.
 */
export function useWebhookConfig({ companyId, initialConfig, saveMutation }: UseWebhookConfigParams) {
  const [webhookSecret, setWebhookSecret] = useState(initialConfig.secret);
  const queryClient = useQueryClient();

  const webhookUrl = initialConfig.url || inboundWebhookUrl(companyId);

  const syncFromSettings = useCallback((config: WebhookConfig) => {
    setWebhookSecret(config.secret || generateSecret());
  }, []);

  const regenerateSecret = useCallback(async () => {
    const newKey = generateSecret();
    setWebhookSecret(newKey);
    saveMutation.mutate({ webhook_config: { secret: newKey, url: webhookUrl } });
    toast.success('🔑 Webhook signing key regenerated. Save before testing.');
  }, [saveMutation, webhookUrl]);

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      if (!webhookSecret) throw new Error('Set and save a signing secret first.');

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret,
        },
        body: JSON.stringify({
          name: 'CallMind webhook test',
          phone: '+919000100001',
          email: 'webhook.test@example.invalid',
          comment: 'Sent by the Test Webhook button in Integrations.',
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server's own words. "Webhook not configured for this company"
        // and "Invalid webhook secret" are different problems with different
        // fixes, and flattening them into "test failed" helps nobody.
        throw new Error(body.error || `The endpoint answered ${res.status}.`);
      }

      return body;
    },
    onSuccess: () => {
      toast.success('Webhook accepted the payload — check your leads for the test lead.');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err: Error) => {
      console.error(err);
      toast.error(err.message || 'The webhook did not accept the payload.');
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
