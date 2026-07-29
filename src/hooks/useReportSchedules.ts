import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ReportSchedule } from '@/types/reports';

export function useReportSchedules(companyId: string | null) {
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery<ReportSchedule[]>({
    queryKey: ['reports', 'reportSchedules', companyId],
    queryFn: async (): Promise<ReportSchedule[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        // Return empty array if table does not exist or has RLS restrictions during testing
        console.warn("Error fetching report schedules:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!companyId,
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: Omit<ReportSchedule, 'id'>) => {
      const { data, error } = await supabase
        .from('report_schedules')
        .insert([schedule])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'reportSchedules', companyId] });
    }
  });

  return {
    schedules,
    isLoading,
    createSchedule: createScheduleMutation.mutateAsync,
    isCreating: createScheduleMutation.isPending
  };
}
