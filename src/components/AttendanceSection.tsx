import React, { useMemo, useState } from 'react';
import { Download, Clock, UserX, CheckCircle, AlertCircle, ArrowRight, ArrowDown } from 'lucide-react';
import { useAttendance } from '@/hooks/useAttendance';

export const AttendanceSection = ({ companyId, members }: { companyId: string | null, members: any[] }) => {
  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
        <AlertCircle size={40} className="mb-4 opacity-20" />
        <p className="font-bold">No Company ID found</p>
        <p className="text-sm">Please ensure you are linked to a company.</p>
      </div>
    );
  }
  const { logs, loading } = useAttendance(companyId);

  // Group logs into daily attendance records per agent
  const { records, summary } = useMemo(() => {
    const recordsMap: Record<string, {
      userId: string,
      userName: string,
      dateStr: string,
      punchIn?: Date,
      punchOut?: Date,
      status: 'On Time' | 'Late' | 'Absent'
    }> = {};

    logs.forEach(log => {
      const ts = log.timestamp ? new Date(log.timestamp) : new Date();
      const dateStr = ts.toLocaleDateString();
      const key = `${log.user_id}_${dateStr}`;
      
      if (!recordsMap[key]) {
        recordsMap[key] = {
          userId: log.user_id,
          userName: log.user_name || 'Unknown',
          dateStr,
          status: 'Absent' 
        };
      }

      if (log.type === 'punch_in') {
        if (!recordsMap[key].punchIn || ts < recordsMap[key].punchIn!) {
          recordsMap[key].punchIn = ts;
          
          // Determine status
          const punchHour = ts.getHours();
          const punchMin = ts.getMinutes();
          if (punchHour < 9 || (punchHour === 9 && punchMin <= 30)) {
            recordsMap[key].status = 'On Time';
          } else {
            recordsMap[key].status = 'Late';
          }
        }
      } else if (log.type === 'punch_out') {
        if (!recordsMap[key].punchOut || ts > recordsMap[key].punchOut!) {
          recordsMap[key].punchOut = ts;
        }
      }
    });

    const groupedRecords = Object.values(recordsMap).sort((a, b) => {
      // sort by date descending
      const dateA = a.punchIn || new Date(a.dateStr);
      const dateB = b.punchIn || new Date(b.dateStr);
      return dateB.getTime() - dateA.getTime();
    });

    // Today's summary
    const todayStr = new Date().toLocaleDateString();
    let presentCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    groupedRecords.forEach(r => {
      if (r.dateStr === todayStr && r.punchIn) {
        presentCount++;
        if (r.status === 'On Time') onTimeCount++;
        if (r.status === 'Late') lateCount++;
      }
    });

    // Absent is calculated based on total members minus present today
    let absentCount = 0;
    if (members && members.length > 0) {
      absentCount = Math.max(0, members.length - presentCount);
      // We can also inject absent records for today into the table if we want, but let's just keep the summary accurate.
    }

    return { records: groupedRecords, summary: { present: presentCount, onTime: onTimeCount, late: lateCount, absent: absentCount } };
  }, [logs, members]);

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const displayRecords = [...records].sort((a, b) => {
    const valA = a.punchIn || a.punchOut || new Date(a.dateStr);
    const valB = b.punchIn || b.punchOut || new Date(b.dateStr);
    return sortOrder === 'desc' ? valB.getTime() - valA.getTime() : valA.getTime() - valB.getTime();
  });

  const handleExportCSV = () => {
     if (!displayRecords.length) return;
     
     const headers = ['Agent Name', 'Date', 'Punch In', 'Punch Out', 'Duration', 'Status'];
     const rows = displayRecords.map(r => {
       const dStr = r.dateStr;
       const pIn = r.punchIn ? r.punchIn.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'}) : '-';
       const pOut = r.punchOut ? r.punchOut.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'}) : '-';
       
       let duration = '-';
       if (r.punchIn && r.punchOut) {
         const diff = r.punchOut.getTime() - r.punchIn.getTime();
         const hrs = Math.floor(diff / (1000 * 60 * 60));
         const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
         duration = `${hrs}h ${mins}m`;
       }

       return [
         `"${r.userName}"`,
         `"${dStr}"`,
         `"${pIn}"`,
         `"${pOut}"`,
         `"${duration}"`,
         `"${r.status}"`
       ].join(',');
     });

     const csvContent = headers.join(',') + '\n' + rows.join('\n');
     const blob = new Blob([csvContent], { type: 'text/csv' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `attendance_summary_${new Date().toISOString().split('T')[0]}.csv`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    if (status === 'On Time') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (status === 'Late') return 'bg-orange-50 text-orange-600 border-orange-100';
    return 'bg-red-50 text-red-600 border-red-100';
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Log</h2>
          <p className="text-gray-500 text-sm">Daily punch-in/out records for the team.</p>
        </div>
        <button onClick={handleExportCSV} className="px-6 py-2.5 bg-white border border-gray-100 text-gray-600 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
          <Download size={18} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Present Today</p>
            <p className="text-3xl font-black text-gray-900">{summary.present}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
             <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">On Time</p>
            <p className="text-3xl font-black text-gray-900">{summary.onTime}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
             <CheckCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Late</p>
            <p className="text-3xl font-black text-gray-900">{summary.late}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
             <AlertCircle size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Absent</p>
            <p className="text-3xl font-black text-gray-900">{summary.absent}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
             <UserX size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
         {!loading && displayRecords.length === 0 ? (
           <div className="p-20 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-6">
                <Clock size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No attendance records yet.</h3>
              <p className="text-gray-500 text-sm max-w-sm">
                Agents punch in via the mobile app. Their daily logs will appear here.
              </p>
           </div>
         ) : (
           <div className="overflow-x-auto custom-scrollbar">
             <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                 <tr className="border-b border-gray-100 bg-gray-50/50">
                   <th className="px-8 py-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Agent</th>
                   <th className="px-8 py-5 text-[10px] font-black tracking-widest uppercase text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}>
                     <div className="flex items-center gap-1">
                       Date <ArrowDown size={12} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                     </div>
                   </th>
                   <th className="px-8 py-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Punch In</th>
                   <th className="px-8 py-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Punch Out</th>
                   <th className="px-8 py-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Duration</th>
                   <th className="px-8 py-5 text-[10px] font-black tracking-widest uppercase text-gray-400">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {displayRecords.map((r, idx) => {
                   let duration = '-';
                   if (r.punchIn && r.punchOut) {
                     const diff = r.punchOut.getTime() - r.punchIn.getTime();
                     const hrs = Math.floor(diff / (1000 * 60 * 60));
                     const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                     duration = `${hrs}h ${mins}m`;
                   }

                   return (
                     <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                       <td className="px-8 py-5">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                              {r.userName?.substring(0, 2).toUpperCase() || 'AG'}
                            </div>
                            <span className="font-bold text-gray-900">{r.userName || 'Unknown Agent'}</span>
                         </div>
                       </td>
                       <td className="px-8 py-5">
                         <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{r.dateStr}</span>
                       </td>
                       <td className="px-8 py-5">
                         <span className="font-semibold text-gray-600 whitespace-nowrap">
                            {r.punchIn ? r.punchIn.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'}) : '-'}
                         </span>
                       </td>
                       <td className="px-8 py-5">
                         <span className="font-semibold text-gray-600 whitespace-nowrap">
                            {r.punchOut ? r.punchOut.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'}) : '-'}
                         </span>
                       </td>
                       <td className="px-8 py-5">
                          <span className="font-bold text-gray-700 whitespace-nowrap">{duration}</span>
                       </td>
                       <td className="px-8 py-5">
                          <span className={`px-3 py-1 text-[10px] uppercase tracking-wider font-black rounded-lg border ${getStatusColor(r.status)}`}>
                            {r.status}
                          </span>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
         )}
      </div>
    </div>
  );
};
