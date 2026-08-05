import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface LegalComplianceResult {
  needsReacceptance: boolean;
  latestVersion: string | null;
}

export function useLegalCompliance(userId: string | null) {
  return useQuery<LegalComplianceResult>({
    queryKey: ['legal_compliance', userId],
    queryFn: async () => {
      if (!userId) {
        return { needsReacceptance: false, latestVersion: null };
      }

      // Fetch the latest published Terms of Service document
      const { data: latestTerms, error: termsError } = await supabase
        .from('legal_pages')
        .select('version')
        .eq('slug', 'terms')
        .eq('status', 'published')
        .eq('language', 'English')
        .maybeSingle();

      if (termsError) {
        console.error('Failed to query latest terms version:', termsError);
        throw termsError;
      }

      if (!latestTerms) {
        return { needsReacceptance: false, latestVersion: null };
      }

      const version = latestTerms.version;

      // Query user_acceptances to see if the user accepted this version
      const { data: acceptance, error: acceptanceError } = await supabase
        .from('user_acceptances')
        .select('id')
        .eq('user_id', userId)
        .eq('page_slug', 'terms')
        .eq('version', version)
        .maybeSingle();

      if (acceptanceError) {
        console.error('Failed to query user acceptances:', acceptanceError);
        throw acceptanceError;
      }

      const needsReacceptance = !acceptance;
      return {
        needsReacceptance,
        latestVersion: version
      };
    },
    enabled: !!userId
  });
}
