import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { startOfDay } from 'date-fns';

export interface HourlyCallTrend {
  hour: string;
  hourNum: number;
  count: number;
}

/**
 * useHourlyCalls
 * 
 * Fetches and groups calls logged today hourly.
 */
export function useHourlyCalls(companyId: string | null) {
  return useQuery({
    queryKey: ['hourlyCallsToday', companyId],
    queryFn: async (): Promise<HourlyCallTrend[]> => {
      if (!companyId) return [];

      const todayStart = startOfDay(new Date()).toISOString();

      const { data, error } = await supabase
        .from('calls')
        .select('timestamp')
        .eq('company_id', companyId)
        .gte('timestamp', todayStart);

      if (error) {
        console.error('Failed to fetch today hourly calls:', error);
        throw error;
      }

      const callsList = data || [];

      // Group counts hourly (0 to 23)
      const hoursMap: Record<number, number> = {};
      for (let i = 0; i < 24; i++) {
        hoursMap[i] = 0;
      }

      callsList.forEach((row: any) => {
        if (row.timestamp) {
          const hour = new Date(row.timestamp).getHours();
          hoursMap[hour]++;
        }
      });

      const trendData: HourlyCallTrend[] = Object.entries(hoursMap).map(([hour, count]) => {
        const hourNum = parseInt(hour);
        const formatHour = hourNum === 0 ? '12 AM' : hourNum === 12 ? '12 PM' : hourNum > 12 ? `${hourNum - 12} PM` : `${hourNum} AM`;
        return {
          hour: formatHour,
          hourNum,
          count
        };
      });

      // Sort by hourNum ascending
      trendData.sort((a, b) => a.hourNum - b.hourNum);

      return trendData;
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
