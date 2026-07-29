import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ConversionFunnelStep } from '@/types/reports';

export function useConversionFunnelReport(companyId: string | null) {
  return useQuery<ConversionFunnelStep[]>({
    queryKey: ['reports', 'conversionFunnel', companyId],
    queryFn: async (): Promise<ConversionFunnelStep[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('conversion_funnel')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error("useConversionFunnelReport failed:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
