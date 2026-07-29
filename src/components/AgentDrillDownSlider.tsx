import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Users, PhoneCall, Calendar, Target, Zap, Clock, ShieldCheck, User, AlertCircle
} from 'lucide-react';
import { useAgentDrillDown } from '@/hooks/useAgentDrillDown';
import CallMindLoader from './CallMindLoader';

interface AgentDrillDownSliderProps {
  agentId: string | null;
  agentName: string | null;
  companyId: string | null;
  dateRange: string;
  customRange?: { start: string; end: string };
  onClose: () => void;
  hidePhoneSetting?: boolean;
}

export const AgentDrillDownSlider = React.memo(({
  agentId,
  agentName,
  companyId,
  dateRange,
  customRange,
  onClose,
  hidePhoneSetting
}: AgentDrillDownSliderProps) => {
  const [activeTab, setActiveTab] = useState<'leads' | 'calls' | 'attendance' | 'goals' | 'statusChanges'>('leads');
  const { data, isLoading } = useAgentDrillDown(agentId, companyId, dateRange, customRange);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Background overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sliding Sheet Panel */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="relative w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col z-10 border-l border-gray-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-sm shadow-md">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{agentName || 'Agent Performance'}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Detail Trace | {dateRange}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all text-gray-400 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-100 bg-white">
          {[
            { id: 'leads', label: 'Assigned Leads', icon: Users },
            { id: 'calls', label: 'Recent Calls', icon: PhoneCall },
            { id: 'attendance', label: 'Attendance', icon: Calendar },
            { id: 'goals', label: 'Goals', icon: Target },
            { id: 'statusChanges', label: 'Status Changes', icon: Zap },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-4 text-center text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all
                  ${activeTab === tab.id 
                    ? 'border-brand-600 text-brand-600 bg-brand-50/30' 
                    : 'border-transparent text-gray-400 hover:text-slate-700'}`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <CallMindLoader size="sm" text="Assembling agent stats..." />
            </div>
          ) : !data ? (
            <div className="text-center py-20 text-gray-400">
              <AlertCircle className="mx-auto mb-4" size={32} />
              <p className="font-bold">No performance records logged</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'leads' && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Assigned to Agent</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[9px] font-black text-slate-400 uppercase">
                          <th className="pb-2">Name</th>
                          <th className="pb-2 text-center">Status</th>
                          <th className="pb-2 text-right">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {data.leads.map((lead, i) => (
                          <tr key={lead.id || i}>
                            <td className="py-2.5">{lead.name || 'Anonymous'}</td>
                            <td className="py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black
                                ${lead.status?.toLowerCase() === 'converted' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
                                {lead.status || 'New'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[10px] text-gray-400">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {data.leads.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No assigned leads</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'calls' && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calling History</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[9px] font-black text-slate-400 uppercase">
                          <th className="pb-2">Lead</th>
                          <th className="pb-2 text-center">Duration</th>
                          <th className="pb-2 text-center">Outcome</th>
                          <th className="pb-2 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {data.calls.map((call, i) => (
                          <tr key={call.id || i}>
                            <td className="py-2.5">{call.lead_name || 'Unknown Lead'}</td>
                            <td className="py-2.5 text-center font-mono">{call.duration}</td>
                            <td className="py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black
                                ${call.outcome === 'Answered' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {call.outcome}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[10px] text-gray-400">
                              {new Date(call.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                        {data.calls.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No recent calls logged</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Logs</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[9px] font-black text-slate-400 uppercase">
                          <th className="pb-2">Event Type</th>
                          <th className="pb-2 text-right">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {data.attendance.map((att, i) => (
                          <tr key={att.id || i}>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black
                                ${att.type === 'check_in' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                {att.type === 'check_in' ? 'Check In' : 'Check Out'}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[10px] text-gray-400">
                              {new Date(att.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {data.attendance.length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No attendance records logged</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'goals' && (
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Goals Progress</h4>
                  
                  <div className="space-y-4">
                    {/* Dials Goal */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex justify-between items-end text-xs font-bold text-slate-855">
                        <span>Total Dials Target</span>
                        <span className="font-mono">{data.goals.actual_calls} / {data.goals.target_calls} Dials</span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-gray-150">
                        <div 
                          className="h-full bg-brand-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (data.goals.actual_calls / data.goals.target_calls) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Conversions Goal */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex justify-between items-end text-xs font-bold text-slate-855">
                        <span>Conversions Target</span>
                        <span className="font-mono">{data.goals.actual_conversions} / {data.goals.target_conversions} Sales</span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-gray-150">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (data.goals.actual_conversions / data.goals.target_conversions) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'statusChanges' && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Status Transitions</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[9px] font-black text-slate-400 uppercase">
                          <th className="pb-2">Transition Path</th>
                          <th className="pb-2 text-right">Occurrence Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-xs font-bold text-slate-800">
                        {data.statusChanges && data.statusChanges.map((change, i) => (
                          <tr key={i}>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {change.from_status}
                              </span>
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700">
                                {change.to_status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono text-[11px] text-gray-600">
                              {change.count}
                            </td>
                          </tr>
                        ))}
                        {(!data.statusChanges || data.statusChanges.length === 0) && (
                          <tr>
                            <td colSpan={2} className="py-10 text-center text-gray-400 font-bold uppercase tracking-widest">No status transitions logged in range</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});
AgentDrillDownSlider.displayName = 'AgentDrillDownSlider';
