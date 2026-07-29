import React, { useMemo } from 'react';
import { HourlyCallDensity } from '@/types/reports';

interface HeatmapChartProps {
  data: HourlyCallDensity[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const HeatmapChart = React.memo(({ data }: HeatmapChartProps) => {
  // Aggregate data by Day and Hour
  const aggregated = useMemo(() => {
    const grid: Record<string, Record<number, number>> = {};
    DAYS.forEach(day => {
      grid[day] = {};
      HOURS.forEach(hour => {
        grid[day][hour] = 0;
      });
    });

    // Populate data
    (data || []).forEach(row => {
      // Resolve day name from date string
      const dateObj = new Date(row.date);
      const dayIndex = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
      const dayName = DAYS[dayIndex === 0 ? 6 : dayIndex - 1]; // map Mon=0, Sun=6
      
      const hr = Number(row.hour);
      if (grid[dayName] && grid[dayName][hr] !== undefined) {
        grid[dayName][hr] += Number(row.call_count || 0);
      }
    });

    return grid;
  }, [data]);

  // Find max value for color scaling
  const maxValue = useMemo(() => {
    let max = 1;
    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const val = aggregated[day][hour];
        if (val > max) max = val;
      });
    });
    return max;
  }, [aggregated]);

  // Color intensity scale resolver
  const getColorClass = (val: number) => {
    if (val === 0) return 'bg-slate-50 border-gray-100';
    const ratio = val / maxValue;
    if (ratio <= 0.25) return 'bg-brand-50/50 border-brand-100 text-brand-600';
    if (ratio <= 0.5) return 'bg-brand-100 border-brand-200 text-brand-700';
    if (ratio <= 0.75) return 'bg-brand-500 border-brand-600 text-white';
    return 'bg-brand-700 border-brand-800 text-white';
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Dial Density (Hour vs Day of Week)</h4>
        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Highlights peak lead connect window slots</p>
      </div>

      <div className="overflow-x-auto custom-scrollbar pt-2">
        <div className="min-w-[760px] space-y-1.5">
          {/* Hours Header Grid */}
          <div className="grid grid-cols-[100px_repeat(24,_1fr)] gap-1 text-[9px] font-black text-slate-400 uppercase text-center">
            <div className="text-left font-bold text-[8px] pl-1">Days \ Hours</div>
            {HOURS.map(hour => (
              <div key={hour} className="py-1">{hour.toString().padStart(2, '0')}:00</div>
            ))}
          </div>

          {/* Days Rows */}
          {DAYS.map(day => (
            <div key={day} className="grid grid-cols-[100px_repeat(24,_1fr)] gap-1 items-center">
              <div className="text-[9px] font-black text-slate-600 uppercase pr-2">{day}</div>
              {HOURS.map(hour => {
                const count = aggregated[day][hour];
                return (
                  <div 
                    key={hour} 
                    title={`${day} @ ${hour}:00 - ${count} Calls`}
                    className={`h-9 border rounded-xl flex items-center justify-center text-[10px] font-bold transition-all hover:scale-105 duration-200 cursor-default ${getColorClass(count)}`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-[8px] font-black uppercase text-slate-400 pt-2">
        <span>Density Scale:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-slate-50 border border-gray-150 rounded" /> Zero
          <div className="w-3.5 h-3.5 bg-brand-50/50 border border-brand-100 rounded" /> Low
          <div className="w-3.5 h-3.5 bg-brand-100 border border-brand-200 rounded" /> Medium
          <div className="w-3.5 h-3.5 bg-brand-500 border border-brand-600 rounded" /> High
          <div className="w-3.5 h-3.5 bg-brand-700 border border-brand-800 rounded" /> Peak
        </div>
      </div>
    </div>
  );
});
HeatmapChart.displayName = 'HeatmapChart';
