import React from 'react';
import { AgentLiveMonitor } from './AgentLiveMonitor';
import { HierarchyFilterBar } from './hierarchy/HierarchyFilterBar';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity,
  ArrowUpRight,
  Target,
  Clock,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  AreaChart,
  Area
} from 'recharts';

const teamPerformanceData = [
  { name: 'Rahul S.', calls: 145, conversions: 28, rate: 19.3 },
  { name: 'Priya K.', calls: 132, conversions: 24, rate: 18.1 },
  { name: 'Amit V.', calls: 158, conversions: 22, rate: 13.9 },
  { name: 'Sneha M.', calls: 120, conversions: 20, rate: 16.6 },
  { name: 'Vikram R.', calls: 110, conversions: 18, rate: 16.3 },
];

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-6 rounded-[32px] shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between">
      <div className={`p-4 rounded-2xl ${color} bg-opacity-10 transition-transform`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">
          <ArrowUpRight size={14} />
          {trend}
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">{value}</h3>
    </div>
  </div>
);

export const AnalyticsPage = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <HierarchyFilterBar />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Analytics</h1>
          <p className="text-gray-500 font-medium mt-1 uppercase text-xs tracking-widest">Live Performance & Historical Data</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-brand-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all">
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Response Time" value="2m 15s" icon={Clock} trend="-15%" color="bg-brand-600" />
        <StatCard title="Team Satisfaction" value="4.8/5" icon={Users} trend="+0.2" color="bg-blue-600" />
        <StatCard title="Target Achievement" value="92%" icon={Target} trend="+5%" color="bg-purple-600" />
        <StatCard title="System Uptime" value="99.9%" icon={Activity} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Visualizer */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-10 rounded-[40px] shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-50 rounded-2xl">
                  <BarChart3 className="text-brand-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">Agent Performance Comparison</h2>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Daily activity vs conversions</p>
                </div>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 800 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                  <Bar dataKey="calls" name="Total Calls" fill="#93c5fd" radius={[10, 10, 0, 0]} barSize={40} />
                  <Bar dataKey="conversions" name="Conversions" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Monitor */}
          <AgentLiveMonitor />
        </div>

        <div className="space-y-8">
          {/* Growth Trends */}
          <div className="bg-[#111] p-10 rounded-[40px] text-white overflow-hidden relative group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black tracking-tight">Growth Trend</h2>
                <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                  <TrendingUp size={20} className="text-white" />
                </div>
              </div>
              <div className="space-y-1 mb-8">
                <p className="text-4xl font-black tracking-tighter">+24.8%</p>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Efficiency Increase</p>
              </div>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={teamPerformanceData}>
                    <defs>
                      <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/30 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-600/50 transition-colors duration-1000" />
          </div>

          {/* Activity Breakdown */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-10 rounded-[40px] shadow-sm">
            <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Activity Type</h2>
            <div className="space-y-6">
              {[
                { label: 'Outbound Calls', value: '62%', color: 'bg-blue-600' },
                { label: 'Lead Nurturing', value: '25%', color: 'bg-purple-600' },
                { label: 'Administrative', value: '13%', color: 'bg-gray-400' }
              ].map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-gray-900">{item.value}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: item.value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
