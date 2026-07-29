import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { CallDispositionRecord } from '@/types/reports';

/**
 * Fetches call outcome disposition breakdown (Answered, Busy, No Answer, etc.)
 * filtered by date range and optionally by agent.
 */
export function useCallDisposition(
  companyId: string | null,
  dateRange: string,
  selectedAgent?: string,
  customRange?: { start: string; end: string }
) {
  return useQuery<CallDispositionRecord[]>({
    queryKey: ['reports', 'callDisposition', companyId, dateRange, selectedAgent, customRange],
    queryFn: async (): Promise<CallDispositionRecord[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('calls')
        .select('outcome')
        .eq('company_id', companyId);

      // Date range filtering
      const now = new Date();
      if (dateRange === 'Today') {
        query = query.gte('timestamp', now.toISOString().split('T')[0]);
      } else if (dateRange === '7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', start);
      } else if (dateRange === '30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('timestamp', start);
      } else if (dateRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('timestamp', start);
      } else if (dateRange === 'Custom' && customRange?.start) {
        query = query.gte('timestamp', customRange.start);
        if (customRange.end) {
          query = query.lte('timestamp', customRange.end);
        }
      }

      if (selectedAgent && selectedAgent !== 'All Agents') {
        query = query.eq('created_by', selectedAgent);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate outcome counts client-side
      const counts: Record<string, number> = {};
      const CANONICAL_OUTCOMES = ['Answered', 'Busy', 'Wrong Number', 'Not Interested', 'Callback', 'No Answer'];

      (data || []).forEach((row: { outcome: string | null }) => {
        const outcome = row.outcome || 'No Answer';
        const key = CANONICAL_OUTCOMES.includes(outcome) ? outcome : 'Other';
        counts[key] = (counts[key] || 0) + 1;
      });

      return Object.entries(counts).map(([outcome, count]) => ({ outcome, count }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
