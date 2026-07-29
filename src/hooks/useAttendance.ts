import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';

export type AttendanceLog = Database['public']['Tables']['attendance_logs']['Row'];

/**
 * useAttendance
 * 
 * Fetches company attendance logs from Supabase.
 */
export function useAttendance(companyId: string | null) {
  const { data: logs = [], isLoading } = useQuery<AttendanceLog[]>({
    queryKey: ['attendanceLogs', companyId],
    queryFn: async (): Promise<AttendanceLog[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching attendance logs:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });

  return { logs, loading: isLoading };
}
