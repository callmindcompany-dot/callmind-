import React, { useState, useEffect } from 'react';
import { CompanyStats } from '@/types/founder';
import { supabase } from '@/supabaseClient';
import { 
  X, Building2, Users, Database, ShieldAlert, 
  ExternalLink, CreditCard, Clock, Activity, ListFilter 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CompanyDetailProps {
  company: CompanyStats | null;
  onClose: () => void;
}

export const CompanyDetail = ({ company, onClose }: CompanyDetailProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'agents' | 'billing' | 'activity'>('overview');
  
  // Data States
  const [leads, setLeads] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (!company) return;
    setActiveTab('overview');
    setLeads([]);
    setAgents([]);
    setActivities([]);
  }, [company]);

  // Load Tab Specific Data
  useEffect(() => {
    if (!company) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'leads') {
          const { data, error } = await supabase
            .from('leads')
            .select('id, name, phone, status, created_at')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (error) throw error;
          setLeads(data || []);
        } else if (activeTab === 'agents') {
          const { data, error } = await supabase
            .from('users')
            .select('id, name, display_name, email, role, status')
            .eq('company_id', company.id)
            .limit(15);
          if (error) throw error;
          setAgents(data || []);
        } else if (activeTab === 'activity') {
          const { data, error } = await supabase
            .from('audit_logs')
            .select('id, action, category, created_at')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(10);
          if (error) throw error;
          setActivities(data || []);
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load company detail data: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company, activeTab]);

  if (!company) return null;

  const handleImpersonate = async () => {
    setIsImpersonating(true);
    toast.loading("Requesting secure admin impersonation link...", { id: 'impersonate' });
    try {
      // Invoke Supabase Edge Function impersonate-company
      const { data, error } = await supabase.functions.invoke('impersonate-company', {
        body: { company_id: company.id }
      });

      if (error) throw error;

      if (data?.link) {
        toast.success("Impersonation session authorized! Opening dashboard...", { id: 'impersonate' });
        window.open(data.link, '_blank');
      } else {
        throw new Error("Edge Function returned invalid session parameters.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to impersonate company: " + (err.message || "Unknown error"), { id: 'impersonate' });
    } finally {
      setIsImpersonating(false);
    }
  };

  const percentageStorage = Math.round((company.storage_used / company.storage_limit) * 100);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-md bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">{company.name}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Tenant Details</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-50 bg-gray-50/50 px-4">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'leads', label: 'Leads' },
          { id: 'agents', label: 'Agents' },
          { id: 'billing', label: 'Billing' },
          { id: 'activity', label: 'Activity' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-bold transition-all relative ${
              activeTab === tab.id 
                ? 'text-gray-950 border-b-2 border-brand-500' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Action Card: Impersonate */}
            <div className="p-5 bg-brand-50/50 border border-brand-100 rounded-2xl flex flex-col justify-between gap-4">
              <div>
                <h4 className="font-black text-sm text-gray-900 uppercase tracking-tight">Super Admin Override</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Log into this company dashboard as a virtual administrator. You will bypass regular authentication procedures. This action is logged.
                </p>
              </div>
              <button
                onClick={handleImpersonate}
                disabled={isImpersonating}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <ExternalLink size={14} />
                <span>Login as Company</span>
              </button>
            </div>

            {/* General Metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-gray-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">MRR (Monthly)</span>
                <span className="text-xl font-black text-gray-900 mt-2">${company.mrr}</span>
              </div>
              <div className="p-4 border border-gray-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Health Rating</span>
                <span className={`text-xl font-black mt-2 ${
                  company.health_score >= 80 ? 'text-green-600' : 'text-red-500'
                }`}>{company.health_score}%</span>
              </div>
            </div>

            {/* Storage Progress bar */}
            <div className="p-5 border border-gray-100 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                <span className="flex items-center gap-2 text-gray-500 uppercase text-[9px] font-black tracking-widest"><Database size={14} /> Storage Usage</span>
                <span>{company.storage_used} GB / {company.storage_limit} GB</span>
              </div>
              <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                <div 
                  className={`h-full rounded-full ${percentageStorage >= 85 ? 'bg-red-500' : 'bg-brand-500'}`} 
                  style={{ width: `${Math.min(100, percentageStorage)}%` }} 
                />
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">
                Utilizing {percentageStorage}% of platform allocation
              </p>
            </div>

            {/* Stats list */}
            <div className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
              <div className="py-3 flex justify-between">
                <span className="text-gray-400">Total Leads Ingested</span>
                <span>{company.leads_count.toLocaleString()}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-400">Total Agents Registered</span>
                <span>{company.agents_count}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-400">Plan Tier</span>
                <span className="uppercase text-brand-600">{company.plan || 'Basic'}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-400">Subscription Status</span>
                <span>{company.status || 'Active'}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-400">Renewal Cycle</span>
                <span>{company.renewal_date ? new Date(company.renewal_date).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-xs font-semibold flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span>Retrieving remote database records...</span>
          </div>
        ) : (
          <>
            {activeTab === 'leads' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Leads Inflow</h4>
                {leads.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No leads created for this tenant.</p>
                ) : (
                  leads.map((l) => (
                    <div key={l.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{l.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{l.phone}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-white text-gray-600 rounded border border-gray-100 font-bold">
                        {l.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'agents' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Membership Roster</h4>
                {agents.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No active users/agents in this company.</p>
                ) : (
                  agents.map((a) => (
                    <div key={a.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-900">{a.display_name || a.name || 'Unnamed Agent'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{a.email}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-black uppercase rounded">
                        {a.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Billing Config & Invoice Cycle</h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Enterprise Pricing Schedule</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Recurring MRR: ${company.mrr}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200/60 pt-3 flex justify-between text-gray-500 font-semibold">
                    <span>Payment Frequency</span>
                    <span className="text-gray-800">Monthly</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Billing Status</span>
                    <span className="text-green-600 font-black uppercase">Active</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-semibold">
                    <span>Renewal Date</span>
                    <span className="text-gray-800">{company.renewal_date ? new Date(company.renewal_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tenant Audit Stream</h4>
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No recorded system events for this company.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>{act.action}</span>
                        <span className="text-[9px] text-gray-400 font-normal">
                          {new Date(act.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Category: {act.category || 'System'}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
