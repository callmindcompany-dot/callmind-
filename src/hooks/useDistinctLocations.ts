import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export function useDistinctLocations(companyId: string | null) {
  return useQuery({
    queryKey: ['distinctLocations', companyId],
    queryFn: async () => {
      if (!companyId) {
        return {
          states: [],
          citiesByState: {} as Record<string, string[]>
        };
      }

      // Query distinct state and city values from the leads table
      const { data, error } = await supabase
        .from('leads')
        .select('state, city')
        .eq('company_id', companyId)
        .eq('is_deleted', false);

      if (error) {
        console.error("Error fetching distinct locations:", error);
        throw error;
      }

      const statesSet = new Set<string>();
      const citiesByStateSet: Record<string, Set<string>> = {};

      (data || []).forEach(row => {
        if (row.state) {
          const stateClean = row.state.trim();
          if (stateClean) {
            statesSet.add(stateClean);
            if (!citiesByStateSet[stateClean]) {
              citiesByStateSet[stateClean] = new Set<string>();
            }
            if (row.city) {
              const cityClean = row.city.trim();
              if (cityClean) {
                citiesByStateSet[stateClean].add(cityClean);
              }
            }
          }
        }
      });

      // Convert sets to sorted arrays
      const states = Array.from(statesSet).sort();
      const citiesByState: Record<string, string[]> = {};
      Object.keys(citiesByStateSet).forEach(stateKey => {
        citiesByState[stateKey] = Array.from(citiesByStateSet[stateKey]).sort();
      });

      return {
        states,
        citiesByState
      };
    },
    enabled: !!companyId,
    staleTime: 120000, // Cache for 2 minutes
  });
}
