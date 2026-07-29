import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useCompany } from '@/CompanyContext';
import { toast } from 'react-hot-toast';
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
 * Fetches integration-specific settings from Supabase `team_settings`
 * and provides a mutation to save config updates.
 */
export function useIntegrationSettings() {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const queryResult = useQuery<IntegrationSettings>({
    queryKey: ['integrationSettings', companyId],
    queryFn: async (): Promise<IntegrationSettings> => {
      if (!companyId) return DEFAULT_INTEGRATION_SETTINGS;

      const { data, error } = await supabase
        .from('team_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch integration settings:', error);
        throw error;
      }

      if (!data) return DEFAULT_INTEGRATION_SETTINGS;

      // Map database snake_case JSONB columns to typed interfaces
      const raw = data as Record<string, unknown>;

      const fb = (raw.facebook_config as FacebookConfig) || DEFAULT_INTEGRATION_SETTINGS.facebookConfig;
      const im = (raw.indiamart_config as IndiaMartConfig) || DEFAULT_INTEGRATION_SETTINGS.indiamartConfig;
      const jd = (raw.justdial_config as JustdialConfig) || DEFAULT_INTEGRATION_SETTINGS.justdialConfig;
      const ti = (raw.tradeindia_config as TradeIndiaConfig) || DEFAULT_INTEGRATION_SETTINGS.tradeindiaConfig;
      const ga = (raw.googleads_config as GoogleAdsConfig) || DEFAULT_INTEGRATION_SETTINGS.googleadsConfig;
      const wa = (raw.whatsapp_config as WhatsAppConfig) || DEFAULT_INTEGRATION_SETTINGS.whatsappConfig;
      const em = (raw.email_config as EmailConfig) || DEFAULT_INTEGRATION_SETTINGS.emailConfig;
      const wh = (raw.webhook_config as WebhookConfig) || DEFAULT_INTEGRATION_SETTINGS.webhookConfig;
      const fa = (raw.field_aliases as FieldAliasesMap) || DEFAULT_INTEGRATION_SETTINGS.fieldAliases;

      const assignRule = (raw.assignment_rule as string) || 'Manual';
      const exclInact = typeof raw.routing_exclude_inactive === 'boolean' ? raw.routing_exclude_inactive : true;
      const overflow = typeof raw.routing_overflow_hours === 'number' ? raw.routing_overflow_hours : 24;

      return {
        facebookConfig: fb,
        indiamartConfig: im,
        justdialConfig: jd,
        tradeindiaConfig: ti,
        googleadsConfig: ga,
        whatsappConfig: wa,
        emailConfig: em,
        webhookConfig: {
          ...wh,
          url: wh.url || `https://api.callmind.app/v1/webhooks/incoming/${companyId}`,
        },
        routingConfig: {
          assignmentRule: assignRule as 'Manual' | 'RoundRobin',
          excludeInactive: exclInact as boolean,
          overflowHours: overflow as number,
        },
        fieldAliases: fa,
      };
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: IntegrationConfigPayload) => {
      if (!companyId) throw new Error('Company ID is required');

      const { error } = await supabase
        .from('team_settings')
        .upsert(
          { company_id: companyId, ...payload, updated_at: new Date().toISOString() },
          { onConflict: 'company_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrationSettings', companyId] });
    },
    onError: (err: Error) => {
      console.error('Failed to save integration config:', err);
      toast.error('Failed to save configuration.');
    },
  });

  return {
    settings: queryResult.data || DEFAULT_INTEGRATION_SETTINGS,
    isLoading: queryResult.isLoading,
    saveMutation,
    companyId,
  };
}
