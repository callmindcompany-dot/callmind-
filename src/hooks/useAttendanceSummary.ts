import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AttendanceSummary } from '@/types/reports';

export function useAttendanceSummary(companyId: string | null, dateRange: string) {
  return useQuery<AttendanceSummary[]>({
    queryKey: ['reports', 'attendanceSummary', companyId, dateRange],
    queryFn: async (): Promise<AttendanceSummary[]> => {
      if (!companyId) return [];

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, name, email')
        .eq('company_id', companyId);
      if (usersError) throw usersError;

      // Fetch logs
      let logsQuery = supabase
        .from('attendance_logs')
        .select('*')
        .eq('company_id', companyId);

      const now = new Date();
      if (dateRange === 'Today') {
        logsQuery = logsQuery.gte('timestamp', now.toISOString().split('T')[0]);
      } else if (dateRange === '7 Days') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        logsQuery = logsQuery.gte('timestamp', start);
      } else if (dateRange === '30 Days') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        logsQuery = logsQuery.gte('timestamp', start);
      } else if (dateRange === 'This Month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        logsQuery = logsQuery.gte('timestamp', start);
      }

      const { data: logs, error: logsError } = await logsQuery;
      if (logsError) throw logsError;

      // Compile summaries
      return (users || []).map(u => {
        const userLogs = (logs || []).filter(l => l.user_id === u.id);
        const checkIns = userLogs.filter(l => l.type === 'check_in');
        
        let lateCount = 0;
        let checkInTotalMinutes = 0;
        
        checkIns.forEach(c => {
          const date = new Date(c.timestamp);
          const hours = date.getHours();
          const minutes = date.getMinutes();
          checkInTotalMinutes += hours * 60 + minutes;
          // Standard check-in limit: 9:30 AM
          if (hours > 9 || (hours === 9 && minutes > 30)) {
            lateCount++;
          }
        });

        const presentCount = checkIns.length;
        const avgCheckInMinutes = presentCount > 0 ? Math.round(checkInTotalMinutes / presentCount) : null;
        
        let avgCheckInStr: string | null = null;
        if (avgCheckInMinutes !== null) {
          const hh = Math.floor(avgCheckInMinutes / 60);
          const mm = avgCheckInMinutes % 60;
          avgCheckInStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
        }

        // Hours worked simulation based on presentCount (standard 8.5 hr day)
        const hoursWorked = presentCount * 8.5;

        return {
          agent_id: u.id,
          agent_name: u.display_name || u.name || u.email || 'Agent',
          days_present: presentCount,
          hours_worked: hoursWorked,
          late_count: lateCount,
          avg_check_in: avgCheckInStr
        };
      });
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
