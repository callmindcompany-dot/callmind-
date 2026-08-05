import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface WhatsAppConfig {
  app_id: string;
  phone_id: string;
  access_token: string;
  connected: boolean;
  verified: boolean;
}

export interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  password?: string;
  from_email: string;
  from_name: string;
  connected?: boolean;
}

export interface CompanySettingsData {
  company_id: string;
  whatsapp_config: WhatsAppConfig | null;
  smtp_config: SmtpConfig | null;
}

export function useCompanySettings(companyId: string | null) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery<CompanySettingsData | null>({
    queryKey: ['companySettings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_id, whatsapp_config, smtp_config')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.warn('Failed to query company_settings from Supabase:', error);
        throw error;
      }

      if (!data) {
        // Return default structure if row doesn't exist
        return {
          company_id: companyId,
          whatsapp_config: null,
          smtp_config: null,
        };
      }

      return {
        company_id: data.company_id,
        whatsapp_config: data.whatsapp_config as unknown as WhatsAppConfig,
        smtp_config: data.smtp_config as unknown as SmtpConfig,
      };
    },
    enabled: !!companyId,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<CompanySettingsData, 'company_id'>>) => {
      if (!companyId) throw new Error('Company ID is missing');

      const { data, error } = await supabase
        .from('company_settings')
        .upsert({
          company_id: companyId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings', companyId] });
    },
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    updateSettings: updateSettingsMutation.mutateAsync,
  };
}
