import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { AttendanceSummary } from '@/types/reports';
import { applyDateWindow, type ReportFilters } from '@/lib/reportFilters';

/**
 * Until a company can configure its own shift start, this is the line the late
 * count is drawn at. Exported so the screen can name it rather than showing a
 * count against a threshold the reader cannot see.
 */
export const DEFAULT_SHIFT_START_MINUTES = 9 * 60 + 30;   // 09:30

interface AttendanceLog {
  user_id: string | null;
  type: string | null;
  timestamp: string | null;
}

/** Local calendar day, so a shift is grouped by the day the agent worked it. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Attendance per agent.
 *
 * hours_worked used to be `presentCount * 8.5`, commented as a simulation. It
 * was drawn in a column headed Hours Worked, so a manager reading the report
 * saw a precise-looking figure that no clock had produced -- an agent who left
 * after twenty minutes and one who stayed till nine both scored 8.5.
 *
 * It is now the sum of check_in to check_out on each day. A day with no
 * check_out is not counted and is reported separately as an open day, because
 * "we do not know" and "zero hours" are different answers and only one of them
 * is a performance problem.
 */
export function useAttendanceSummary(companyId: string | null, filters: ReportFilters) {
  return useQuery<AttendanceSummary[]>({
    queryKey: ['reports', 'attendanceSummary', companyId, filters],
    queryFn: async (): Promise<AttendanceSummary[]> => {
      if (!companyId) return [];

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, name, email')
        .eq('company_id', companyId);
      if (usersError) throw usersError;

      let logsQuery = supabase
        .from('attendance_logs')
        .select('user_id, type, timestamp')
        .eq('company_id', companyId);
      logsQuery = applyDateWindow(
        logsQuery, 'timestamp', 'timestamp', filters.dateRange, filters.customRange,
      );

      const { data: logs, error: logsError } = await logsQuery.order('timestamp', { ascending: true });
      if (logsError) throw logsError;

      const byUser = new Map<string, AttendanceLog[]>();
      for (const log of (logs ?? []) as AttendanceLog[]) {
        if (!log.user_id || !log.timestamp) continue;
        const list = byUser.get(log.user_id) ?? [];
        list.push(log);
        byUser.set(log.user_id, list);
      }

      return (users ?? []).map(u => {
        const mine = byUser.get(u.id) ?? [];

        // Group a day's punches together, so a check_out is matched to the
        // check_in it belongs to rather than to the next one in the list.
        const days = new Map<string, { in?: string; out?: string }>();
        for (const log of mine) {
          const key = dayKey(log.timestamp!);
          const day = days.get(key) ?? {};
          if (log.type === 'check_in' && !day.in) day.in = log.timestamp!;
          if (log.type === 'check_out') day.out = log.timestamp!;
          days.set(key, day);
        }

        let lateCount = 0;
        let checkInMinutesTotal = 0;
        let checkInDays = 0;
        let workedMs = 0;
        let daysWithHours = 0;
        let openDays = 0;

        for (const day of days.values()) {
          if (!day.in) continue;
          const start = new Date(day.in);
          const minutes = start.getHours() * 60 + start.getMinutes();
          checkInMinutesTotal += minutes;
          checkInDays++;
          if (minutes > DEFAULT_SHIFT_START_MINUTES) lateCount++;

          if (day.out) {
            const ms = new Date(day.out).getTime() - start.getTime();
            // A check_out before its check_in is a clock or sync fault, not
            // negative work. Counting it would quietly reduce the total.
            if (ms > 0) { workedMs += ms; daysWithHours++; }
          } else {
            openDays++;
          }
        }

        const avgMinutes = checkInDays > 0 ? Math.round(checkInMinutesTotal / checkInDays) : null;
        const avgCheckIn = avgMinutes === null
          ? null
          : `${String(Math.floor(avgMinutes / 60)).padStart(2, '0')}:${String(avgMinutes % 60).padStart(2, '0')}`;

        return {
          agent_id: u.id,
          agent_name: u.display_name || u.name || u.email || 'Agent',
          days_present: checkInDays,
          // null, not 0, when no day has both punches -- the screen must be
          // able to tell unknown from none.
          hours_worked: daysWithHours > 0 ? Math.round((workedMs / 3_600_000) * 10) / 10 : null,
          days_with_hours: daysWithHours,
          open_days: openDays,
          late_count: lateCount,
          avg_check_in: avgCheckIn,
        };
      });
    },
    enabled: !!companyId,
    staleTime: 60000,
  });
}
