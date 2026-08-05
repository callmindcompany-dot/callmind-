import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

type TeamSettingsRow = Database['public']['Tables']['team_settings']['Row'];

export interface TeamSettingsData {
  team_name?: string;
  fieldLabels: Record<string, string>;
  hidePhoneNumbers: boolean;
  rottingThreshold: number;
  customFields: any[];
}

/**
 * useTeamSettingsQuery
 * 
 * Fetches company team settings from Supabase.
 */
export function useTeamSettingsQuery(companyId: string | null) {
  return useQuery({
    queryKey: ['teamSettings', companyId],
    queryFn: async (): Promise<TeamSettingsData> => {
      if (!companyId) {
        return {
          fieldLabels: {},
          hidePhoneNumbers: false,
          rottingThreshold: 3,
          customFields: [],
        };
      }

      const { data, error } = await supabase
        .from('team_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch team settings:', error);
        throw error;
      }

      if (!data) {
        return {
          fieldLabels: {},
          hidePhoneNumbers: false,
          rottingThreshold: 3,
          customFields: [],
        };
      }

      const rawData = data as TeamSettingsRow & { team_name?: string };

      // Map DB snake_case structure to camelCase UI expectations
      return {
        team_name: rawData.team_name || undefined,
        fieldLabels: (data.field_labels as Record<string, string>) || {},
        hidePhoneNumbers: data.hide_phone_numbers || false,
        rottingThreshold: data.rotting_threshold !== undefined ? data.rotting_threshold : 3,
        customFields: data.custom_fields || [],
      };
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute caching
  });
}
