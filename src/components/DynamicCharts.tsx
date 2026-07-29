import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { ChevronLeft, ArrowRight, Activity, Search } from 'lucide-react';

export const DynamicAgentLeaderboard = ({ leaders }: { leaders: any[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAllChart, setShowAllChart] = useState(false);

  const count = leaders.length;
  let chartData = leaders;
  let listMode: 'none' | 'scrollable' | 'paginated' | 'searchable' = 'none';

  if (count <= 10) {
    chartData = leaders;
  } else if (count <= 20) {
    chartData = showAllChart ? leaders : leaders.slice(0, 10);
  } else if (count <= 50) {
    chartData = showAllChart ? leaders : leaders.slice(0, 10);
    listMode = 'scrollable';
  } else if (count <= 100) {
    chartData = leaders.slice(0, 10);
    listMode = 'paginated';
  } else {
    chartData = leaders.slice(0, 10);
    listMode = 'searchable';
  }

  const itemsPerPage = 20;
  
  let displayedList = leaders.slice(10); // exclude top 10 from list mostly? 
  // Wait, the prompt says "Show Top 10 as bars + paginated table", so maybe the table shows all agents or agents after top 10?
  // Let's show all agents in the table to be safe, or maybe after top 10. Let's just show all agents in the table for completeness.
  displayedList = leaders;

  if (listMode === 'searchable' && searchTerm) {
    displayedList = displayedList.filter(l => l.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  const totalPages = Math.ceil(displayedList.length / itemsPerPage);
  
  if (listMode === 'paginated' || listMode === 'searchable') {
    displayedList = displayedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <div className="h-80" style={{ minWidth: chartData.length > 10 ? `${chartData.length * 50}px` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barCategoryGap={count > 10 ? '2%' : '10%'}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="calls" fill="#6366f1" radius={[8, 8, 0, 0]} name="Total Calls" />
              <Bar dataKey="connects" fill="#10b981" radius={[8, 8, 0, 0]} name="Connected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between">
         <span className="text-xs font-bold text-gray-500">
           Showing {chartData.length} agents in chart {count > 10 ? `(Top 10 of ${count})` : ''}
         </span>
         {count > 10 && count <= 50 && (
           <button 
             onClick={() => setShowAllChart(!showAllChart)}
             className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
           >
             {showAllChart ? 'Show Top 10 Only' : 'Show All in Chart'}
           </button>
         )}
      </div>

      {listMode !== 'none' && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h4 className="text-sm font-bold text-slate-800 mb-4">Complete Agent List</h4>
          
          {listMode === 'searchable' && (
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search agents..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-full md:w-1/2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          <div className={`grid gap-3 ${listMode === 'scrollable' ? 'max-h-[400px] overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
            {displayedList.map((agent: any, i: number) => (
              <div key={i} className="flex flex-wrap items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-brand-200 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 w-full md:w-auto mb-2 md:mb-0">
                  <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs uppercase">
                    {agent.avatar || agent.name?.substring(0,2) || 'AG'}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">{agent.name}</h5>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Score: {agent.score}%</p>
                  </div>
                </div>
                <div className="flex gap-6 w-full md:w-auto text-sm text-slate-600">
                   <div className="text-center"><span className="block font-bold text-slate-900">{agent.calls}</span><span className="text-[10px] uppercase">Calls</span></div>
                   <div className="text-center"><span className="block font-bold text-emerald-600">{agent.connects ?? Math.round(agent.calls*(agent.score/100))}</span><span className="text-[10px] uppercase">Connects</span></div>
                   <div className="text-center"><span className="block font-bold text-brand-600">{agent.conversions ?? 0}</span><span className="text-[10px] uppercase">Conv.</span></div>
                </div>
              </div>
            ))}
            {displayedList.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No agents found</div>
            )}
          </div>

          {(listMode === 'paginated' || listMode === 'searchable') && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-600">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DynamicSourceChart = ({ sourceData }: { sourceData: any[] }) => {
  const count = sourceData.length;
  let data = sourceData;

  if (count <= 5) {
    // Pie chart
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || ['#1877F2', '#0ea5e9', '#a855f7', '#10b981', '#f59e0b'][index%5]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  } else if (count <= 10) {
    // Horizontal Bar
    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
           <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
             <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
             <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
             <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} width={80} />
             <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
             <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]}>
               {data.map((entry: any, index: number) => (
                 <Cell key={`cell-${index}`} fill={entry.color || ['#1877F2', '#0ea5e9', '#a855f7', '#10b981', '#f59e0b'][index%5]} />
               ))}
             </Bar>
           </BarChart>
        </ResponsiveContainer>
      </div>
    );
  } else {
    // Top 5 + Other
    const top5 = [...data].sort((a,b) => b.value - a.value).slice(0, 5);
    const others = [...data].sort((a,b) => b.value - a.value).slice(5);
    const othersValue = others.reduce((sum, item) => sum + item.value, 0);
    const processedData = [...top5, { name: 'Other', value: othersValue, color: '#94a3b8' }];
    
    return (
      <div>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} angle={-25} textAnchor="end" height={50} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {processedData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color || ['#1877F2', '#0ea5e9', '#a855f7', '#10b981', '#f59e0b', '#94a3b8'][index%6]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-center text-gray-500 font-medium">
          Showing Top 5 sources + 1 grouped category for {others.length} other sources.
        </div>
      </div>
    );
  }
};

export const DynamicActivityLog = ({ logs }: { logs: any[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const count = logs.length;
  let displayedLogs = logs;
  let isPaginated = count > 20;
  
  if (isPaginated) {
    displayedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }

  const totalPages = Math.ceil(logs.length / itemsPerPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
         <span className="text-xs font-bold text-gray-500">
           Total Events: {count} {isPaginated ? `(Showing Page ${currentPage} of ${totalPages})` : ''}
         </span>
      </div>

      <div className="divide-y divide-gray-50 border border-gray-100 rounded-3xl overflow-hidden bg-white">
        {displayedLogs.map((log: any, i: number) => (
          <div key={i} className="p-4 md:p-6 hover:bg-slate-50/50 transition-all flex items-start gap-4 md:gap-6 group relative overflow-hidden">
            <div className={'w-10 h-10 md:w-12 md:h-12 rounded-[16px] flex-shrink-0 flex items-center justify-center border-2 transition-all group-hover:scale-110 shadow-sm relative z-10 ' + 
              (log.type === 'import' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
               log.type === 'transfer' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
               log.type === 'join' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
               'bg-brand-50 text-brand-600 border-brand-100')}
            >
              <Activity size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-1">
                <h4 className="font-bold text-slate-900 text-sm truncate">{log.event}</h4>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit">
                  {log.user} • {log.time}
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-2xl">{log.desc}</p>
            </div>
          </div>
        ))}
        {displayedLogs.length === 0 && (
          <div className="p-8 text-center text-gray-500 font-medium">No activity recorded yet in this date range.</div>
        )}
      </div>

      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 text-slate-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-gray-50 text-slate-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
