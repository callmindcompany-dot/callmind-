import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Clock, 
  Coffee, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  History,
  Timer,
  User,
  PhoneCall,
  Play,
  Volume2,
  Gauge
} from 'lucide-react';
import { useCompany } from '@/CompanyContext';
import { 
  useAgentStatusesQuery, 
  useAgentCallsQuery, 
  AgentStats, 
  CallRecord 
} from '@/hooks/useAgentMonitor';



const StatusIndicator = ({ status }: { status: AgentStats['status'] }) => {
  const colors = {
    active: 'bg-emerald-500',
    on_call: 'bg-orange-500',
    offline: 'bg-red-500'
  };
  
  return (
    <div className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`}></span>
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status]}`}></span>
    </div>
  );
};

const StatusBadge = ({ outcome, status }: { outcome?: string, status: CallRecord['status'] }) => {
  const config: Record<string, { icon: any, color: string, label: string }> = {
    completed: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: outcome || 'Completed' },
    missed: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: outcome || 'Missed' },
    busy: { icon: Clock, color: 'text-orange-600 bg-orange-50', label: outcome || 'Busy' },
    failed: { icon: AlertCircle, color: 'text-gray-600 bg-gray-50', label: outcome || 'Failed' },
    'No Answer': { icon: Phone, color: 'text-red-600 bg-red-50', label: 'No Answer' },
    'Answered': { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', label: 'Answered' }
  };
  
  const key = outcome && config[outcome] ? outcome : status;
  const { icon: Icon, color, label } = config[key] || config.failed;
  
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>
      <Icon size={12} />
      {label}
    </div>
  );
};

const ActivityBar = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
        <span>Activity Density</span>
        <span>00:00 - 23:59</span>
      </div>
      <div className="h-10 w-full flex items-end gap-[2px]">
        {data.map((val, i) => (
          <div 
            key={i} 
            className="flex-1 group relative cursor-pointer"
            style={{ height: `${(val / max) * 100}%`, minHeight: '4px' }}
          >
            <div className={`absolute inset-0 rounded-t-sm transition-all duration-300 ${val > 0 ? 'bg-brand-500 group-hover:bg-brand-400' : 'bg-gray-100'}`} />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap">
                {String(i).padStart(2, '0')}:00 - {val} Calls
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


// DEFAULT_AGENTS and DEFAULT_CALLS lived here: two invented agents, "Amit
// Kumar" with 45 calls and "Priya Patel" with 38, plus four invented calls to
// "Amit Gupta", "Priya Verma", "Karan Singh" and "Suresh Raina".
//
// They were not a storybook fixture. The component fell back to them whenever
// the real query returned nothing, so a customer whose team had not started
// yet -- or whose query had just failed -- saw two strangers on their own live
// monitor with a full day of performance figures, and no way to tell they were
// not real.

export const AgentLiveMonitor = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { companyId } = useCompany();

  const agentsQuery = useAgentStatusesQuery(companyId);
  const callsQuery = useAgentCallsQuery(companyId, expandedId);

  const agents = agentsQuery.data ?? [];

  if (agentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Activity className="animate-spin text-brand-600" />
      </div>
    );
  }

  // A failure and an empty team are different things, and the screen has to say
  // which. "No agents" shown after a failed query is the bug.
  if (agentsQuery.isError) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white/70 backdrop-blur-xl border border-red-100 rounded-[32px] p-10 text-center">
          <h3 className="text-sm font-bold text-red-600">Could not load agent status</h3>
          <p className="text-xs text-gray-500 mt-2">
            {agentsQuery.error instanceof Error ? agentsQuery.error.message : 'Unknown error'}
          </p>
          <button
            onClick={() => agentsQuery.refetch()}
            className="mt-5 px-5 py-2 rounded-2xl bg-brand-600 text-white text-xs font-black uppercase tracking-widest"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[32px] p-10 text-center">
          <h3 className="text-sm font-bold text-gray-600">No agents are reporting status yet</h3>
          <p className="text-xs text-gray-400 mt-2">
            Agents appear here once they sign in from the mobile app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto p-4 leading-normal">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Agent Live Monitor</h2>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-2xl font-black text-xs uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
          Live updates
        </div>
      </div>

      <div className="space-y-3">
        {agents.map((agent) => {
          const displayCalls = expandedId === agent.id ? (callsQuery.data ?? []) : [];

          return (
            <div 
              key={agent.id}
              id={`agent-row-${agent.id}`}
              className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] rounded-[32px] overflow-hidden transition-all duration-500 hover:shadow-[0_12px_48px_0_rgba(31,38,135,0.1)] active:scale-[0.99]"
            >
              {/* Collapsed View */}
              <button
                onClick={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
                className="w-full p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-left group"
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center border border-white shadow-inner">
                      <User className="text-gray-400" size={24} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                      <StatusIndicator status={agent.status} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                      {agent.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200 pr-3">
                        <span>{agent.status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>{agent.calls} Calls</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8 self-end sm:self-center">
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-black text-gray-900">{agent.avgTalkTime ?? '—'}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Avg Talk Time</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-brand-600">{agent.connectRate}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Connect Rate</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-50 group-hover:text-brand-600 transition-all">
                    <motion.div
                      animate={{ rotate: expandedId === agent.id ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown size={18} />
                    </motion.div>
                  </div>
                </div>
              </button>

              {/* Expanded View */}
              <AnimatePresence>
                {expandedId === agent.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-100 bg-gray-50/20"
                  >
                    <div className="p-6 sm:p-8 space-y-8">
                      {/* Live Status Tracker */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Current Status Card */}
                        <div className="p-6 bg-white border border-gray-100 rounded-3xl flex items-center justify-between shadow-sm">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</p>
                            <h4 className="text-2xl font-black text-gray-900 capitalize tracking-tight">{agent.status.replace('_', ' ')}</h4>
                            <p className="text-[10px] text-gray-400 font-bold">{agent.lastCall ? `Since ${agent.lastCall}` : 'No calls yet'}</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                            <Activity size={24} />
                          </div>
                        </div>

                        {/* Density Chart */}
                        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                            <Activity className="text-brand-600" size={20} />
                            <h4 className="font-black text-gray-900 text-sm tracking-tight uppercase">Agent Activity Timeline</h4>
                          </div>
                          <ActivityBar data={agent.activityMap} />
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-5 bg-white border border-gray-100 rounded-3xl group/card hover:border-brand-200 transition-colors shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency</p>
                            <Gauge className="text-brand-600" size={16} />
                          </div>
                          <p className="text-2xl font-black text-brand-600 tracking-tight">{agent.connectRate}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">Connect Rate</p>
                        </div>
                        <div className="p-5 bg-white border border-gray-100 rounded-3xl group/card hover:border-brand-200 transition-colors shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-In</p>
                            <History className="text-gray-400" size={16} />
                          </div>
                          <p className="text-2xl font-black text-gray-900 tracking-tight">{agent.checkIn ?? '—'}</p>
                        </div>
                        <div className="p-5 bg-white border border-gray-100 rounded-3xl group/card hover:border-brand-200 transition-colors shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Availability</p>
                            <Coffee className="text-orange-600" size={16} />
                          </div>
                          <p className="text-2xl font-black text-gray-900 tracking-tight">{agent.breakTime ?? '—'}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">Total Break</p>
                        </div>
                        <div className="p-5 bg-white border border-gray-100 rounded-3xl group/card hover:border-brand-200 transition-colors shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Talk Time</p>
                            <Clock className="text-emerald-600" size={16} />
                          </div>
                          <p className="text-2xl font-black text-gray-900 tracking-tight">{agent.talkTime ?? '—'}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">Total Active</p>
                        </div>
                      </div>

                      {/* Detailed Call Log */}
                      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-500">
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                          <div className="flex items-center gap-2">
                            <Timer className="text-brand-600" size={18} />
                            <h4 className="font-black text-gray-900 text-sm tracking-tight uppercase">Detailed Call Log</h4>
                          </div>
                          <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">Last 10 Records</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50/50 sticky top-0 z-10">
                              <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Identity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Duration</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Result</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {displayCalls.length > 0 ? displayCalls.map((call) => (
                              <tr key={call.id} className="hover:bg-gray-50/80 group transition-all">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase">
                                      {call.leadName.charAt(0)}
                                    </div>
                                    <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors capitalize">{call.leadName}</p>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-sm text-gray-600 font-medium">{call.startTime}</p>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <p className="text-sm text-gray-500 font-mono tracking-tighter">{call.duration}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <StatusBadge outcome={call.outcome} status={call.status} />
                                </td>
                                {/*
                                  A play button and a "No recording" label used
                                  to sit here. Both are gone: CallMind does not
                                  record calls and will not, so "No recording"
                                  was not a state waiting to change — it was the
                                  only state there has ever been, printed on
                                  every row of every call an admin looked at.
                                */}
                                <td className="px-6 py-4 text-right">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {call.duration || '—'}
                                  </span>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                  <div className="flex flex-col items-center gap-2">
                                    <Volume2 size={32} className="text-gray-200" />
                                    <p className="text-sm text-gray-400 italic">Finding call records for this agent...</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      </div>
    </div>
  );
};
