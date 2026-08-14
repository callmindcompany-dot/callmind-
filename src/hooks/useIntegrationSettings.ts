import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useCompany } from '@/CompanyContext';
import { toast } from 'react-hot-toast';
import { inboundWebhookUrl } from '@/lib/webhookUrl';
import {
  IntegrationSettings,
  IntegrationConfigPayload,
  DEFAULT_INTEGRATION_SETTINGS,
  type FacebookConfig,
  type IndiaMartConfig,
  type JustdialConfig,
  type TradeIndiaConfig,
  type GoogleAdsConfig,
  type WhatsAppConfig,
  type EmailConfig,
  type WebhookConfig,
  type FieldAliasesMap,
} from '@/types/integrations';

/**
 * useIntegrationSettings
 *
 * Reads and writes integration configuration. Nothing here worked before
 * 20260819000100_integration_credentials.sql, for two reasons that stacked.
 *
 * It upserted facebook_config, indiamart_config, justdial_config,
 * tradeindia_config, googleads_config, whatsapp_config, email_config,
 * webhook_config and field_aliases into team_settings. That table has none of
 * those columns -- it has ten, all lead and team preferences -- so every save
 * failed with 42703, and because the read used `select('*')` the missing
 * columns came back undefined and fell through to DEFAULT_INTEGRATION_SETTINGS.
 * The form therefore looked empty-but-fine, and Save reported an error nobody
 * could act on. Behind that, team_settings had RLS enabled with no policy at
 * all, so the write would have been refused anyway.
 *
 * Credentials now live in their own table, admin-only, one row per provider.
 * They are deliberately not on team_settings: SettingsPage is not admin-gated
 * (App.tsx gates Team and Integrations, not Settings), so a telecaller can read
 * that row, and an API key sitting on it would be readable by every employee.
 *
 * field_aliases is a mapping rather than a secret and stays on team_settings
 * with the other lead preferences.
 */

/** The provider keys, and the payload key each one arrives under. */
const PROVIDER_BY_PAYLOAD_KEY = {
  facebook_config: 'facebook',
  indiamart_config: 'indiamart',
  justdial_config: 'justdial',
  tradeindia_config: 'tradeindia',
  googleads_config: 'googleads',
  whatsapp_config: 'whatsapp',
  email_config: 'email',
  webhook_config: 'webhook',
} as const;

type PayloadKey = keyof typeof PROVIDER_BY_PAYLOAD_KEY;

interface CredentialRow {
  provider: string;
  config: Record<string, unknown> | null;
  is_active: boolean;
}

export function useIntegrationSettings() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const queryResult = useQuery<IntegrationSettings>({
    queryKey: ['integrationSettings', companyId],
    queryFn: async (): Promise<IntegrationSettings> => {
      if (!companyId) return DEFAULT_INTEGRATION_SETTINGS;

      const [creds, prefs] = await Promise.all([
        supabase
          .from('integration_credentials')
          .select('provider, config, is_active')
          .eq('company_id', companyId),
        supabase
          .from('team_settings')
          .select('assignment_mode, field_aliases')
          .eq('company_id', companyId)
          .maybeSingle(),
      ]);

      // A telecaller is refused the credentials table by design, and that is
      // not an error worth blocking the page on -- but any other failure is.
      // Reporting "nothing is configured" when the query failed is how a
      // customer concludes their integrations vanished.
      if (creds.error && creds.error.code !== '42501') throw creds.error;
      if (prefs.error) throw prefs.error;

      const byProvider = new Map<string, CredentialRow>(
        ((creds.data ?? []) as CredentialRow[]).map((r) => [r.provider, r]),
      );

      /** Merges the stored config with its is_active flag and the defaults. */
      const read = <T,>(key: PayloadKey, fallback: T): T => {
        const row = byProvider.get(PROVIDER_BY_PAYLOAD_KEY[key]);
        if (!row) return fallback;
        return { ...(fallback as object), ...(row.config ?? {}), isActive: row.is_active } as T;
      };

      const d = DEFAULT_INTEGRATION_SETTINGS;
      const wh = read<WebhookConfig>('webhook_config', d.webhookConfig);

      return {
        facebookConfig: read<FacebookConfig>('facebook_config', d.facebookConfig),
        indiamartConfig: read<IndiaMartConfig>('indiamart_config', d.indiamartConfig),
        justdialConfig: read<JustdialConfig>('justdial_config', d.justdialConfig),
        tradeindiaConfig: read<TradeIndiaConfig>('tradeindia_config', d.tradeindiaConfig),
        googleadsConfig: read<GoogleAdsConfig>('googleads_config', d.googleadsConfig),
        whatsappConfig: read<WhatsAppConfig>('whatsapp_config', d.whatsappConfig),
        emailConfig: read<EmailConfig>('email_config', d.emailConfig),
        webhookConfig: {
          ...wh,
          // Was the literal https://api.callmind.app/... -- a guess about
          // production DNS compiled into the client. It also beat the derived
          // URL in useWebhookConfig, which reads `initialConfig.url || origin`,
          // so the hardcoded host always won and the fix there never applied.
          url: wh.url || inboundWebhookUrl(companyId),
        },
        routingConfig: {
          // assignment_mode, not assignment_rule. The old key had no column and
          // this one is what processInboundLead reads when it chooses between
          // Manual and RoundRobin, so the panel now drives the real setting.
          assignmentRule:
            (prefs.data?.assignment_mode as 'Manual' | 'RoundRobin') || 'Manual',
        },
        fieldAliases: (prefs.data?.field_aliases as FieldAliasesMap) || d.fieldAliases,
      };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: IntegrationConfigPayload) => {
      if (!companyId) throw new Error('Company ID is required');

      const providerKeys = (Object.keys(payload) as PayloadKey[]).filter(
        (k) => k in PROVIDER_BY_PAYLOAD_KEY,
      );

      for (const key of providerKeys) {
        const value = payload[key] as unknown as Record<string, unknown> & { isActive?: boolean };
        const { isActive, ...config } = value ?? {};

        const { data, error } = await supabase
          .from('integration_credentials')
          .upsert(
            {
              company_id: companyId,
              provider: PROVIDER_BY_PAYLOAD_KEY[key],
              config,
              is_active: Boolean(isActive),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'company_id,provider' },
          )
          .select('provider');

        if (error) throw error;
        // A write refused by RLS matches no rows and returns no error, so
        // "no error" is not the same as "saved". Without this the panel would
        // show a success toast for a save the database declined -- which is the
        // failure this whole change exists to remove.
        if (!data || data.length === 0) {
          throw new Error(
            'Not saved. Only an admin or founder can change integration credentials.',
          );
        }
      }

      // Non-secret preferences that live with the rest of the lead settings.
      const prefs: Record<string, unknown> = {};
      if ('field_aliases' in payload) prefs.field_aliases = payload.field_aliases;
      if ('assignment_mode' in payload) prefs.assignment_mode = payload.assignment_mode;

      if (Object.keys(prefs).length > 0) {
        const { data, error } = await supabase
          .from('team_settings')
          .upsert(
            { company_id: companyId, ...prefs, updated_at: new Date().toISOString() },
            { onConflict: 'company_id' },
          )
          .select('company_id');

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Not saved. Only an admin or founder can change these settings.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrationSettings', companyId] });
    },
    onError: (err: Error) => {
      console.error('Failed to save integration config:', err);
      toast.error(err.message || 'Failed to save configuration.');
    },
  });

  return {
    settings: queryResult.data || DEFAULT_INTEGRATION_SETTINGS,
    isLoading: queryResult.isLoading,
    isError: queryResult.isError,
    saveMutation,
    companyId,
  };
}
