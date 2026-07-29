import React from 'react';
import { Shuffle } from 'lucide-react';
import { Lead } from '../LeadsPage';

interface LeadDistributionPanelProps {
  leads: Lead[];
  agents: any[];
  distSelectedAgents: Set<string>;
  handleToggleAgent: (agentId: string) => void;
  handleAutoDistribute: (unassignedLeads: Lead[]) => void;
  isSubmitting: boolean;
}

export const LeadDistributionPanel = React.memo(({
  leads,
  agents,
  distSelectedAgents,
  handleToggleAgent,
  handleAutoDistribute
}: LeadDistributionPanelProps) => {
  const unassigned = leads.filter((l: Lead) => !l.assignedTo && !l.isDeleted);
  
  return (
    <div className="space-y-8">
      <div className="bg-emerald-600 rounded-[40px] p-10 text-white relative overflow-hidden shadow-xl">
        <Shuffle className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10" />
        <div className="relative z-10 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-4xl font-black tracking-tight">Bulk Assignment Logic</h2>
            <p className="text-emerald-100 mt-2 font-medium">Equally distribute unassigned leads across your agents to ensure fair workload.</p>
          </div>
          <div className="flex items-end gap-10">
            <div>
              <p className="text-emerald-200 text-xs font-black uppercase tracking-widest mb-1">Unassigned Leads</p>
              <h4 className="text-5xl font-black">{unassigned.length}</h4>
            </div>
            <button 
              onClick={() => handleAutoDistribute(unassigned)}
              className="px-8 py-4 bg-white text-emerald-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-all text-lg"
            >
              Start Round Robin
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Active Agent Pool</h3>
          <div className="space-y-3">
            {agents.map((agent: any) => {
              const isChecked = distSelectedAgents.has(agent.id);
              return (
                <div key={agent.id} className="flex items-center justify-between p-4 border border-gray-50 rounded-2xl bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleAgent(agent.id)}
                      className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500 mr-2 cursor-pointer"
                    />
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-bold border border-gray-100">
                      {agent.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.role || 'Telecaller'}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-white border border-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    Active
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[32px] p-8 text-white">
          <h3 className="text-lg font-bold mb-6">Distribution Modes</h3>
          <div className="space-y-4">
            {[
              { title: 'Standard Round Robin', desc: 'Equal distribution across selected agents', active: true },
              { title: 'Performance Weighted', desc: 'Higher conversion agents get priority leads', premium: true },
              { title: 'Time-Zone Based', desc: 'Auto-route based on lead and agent location', premium: true }
            ].map((mode, i) => (
              <div key={i} className={`p-5 rounded-2xl border-2 ${mode.active ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 opacity-60'} transition-all`}>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold">{mode.title}</h4>
                  {mode.premium && <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">Pro Only</span>}
                </div>
                <p className="text-xs text-slate-400">{mode.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.leads === next.leads &&
    prev.agents === next.agents &&
    prev.distSelectedAgents === next.distSelectedAgents &&
    prev.isSubmitting === next.isSubmitting
  );
});

LeadDistributionPanel.displayName = 'LeadDistributionPanel';
