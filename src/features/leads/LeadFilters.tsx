import React from 'react';
import { X, Filter, RotateCcw, MapPin, Globe, Check, Calendar } from 'lucide-react';
import { LeadStatus, LeadSource, LeadFilters } from '../../types/lead';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useDistinctLocations } from '@/hooks/useDistinctLocations';

export interface Agent {
  id: string;
  name: string;
  role?: string;
  status?: string;
}

export interface TeamSettings {
  hidePhoneNumbers: boolean;
  rottingThreshold: number;
  fieldLabels: Record<string, string>;
  customFields?: Array<{ id: string; label: string; type: string }>;
}

interface LeadFiltersProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  onClose: () => void;
  onClear: () => void;
  companyId: string | null;
  agents: Agent[];
  teamSettings: TeamSettings;
}

export const LeadFiltersPanel: React.FC<LeadFiltersProps> = ({ 
  filters, 
  onChange, 
  onClose,
  onClear,
  companyId,
  agents,
  teamSettings
}) => {
  const { data: locations } = useDistinctLocations(companyId);

  const toggleStatus = (status: LeadStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status) 
      ? current.filter(s => s !== status)
      : [...current, status];
    onChange({ ...filters, status: updated });
  };

  const toggleSource = (source: LeadSource) => {
    const current = filters.source || [];
    const updated = current.includes(source) 
      ? current.filter(s => s !== source)
      : [...current, source];
    onChange({ ...filters, source: updated });
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    const updatedCustom = { ...(filters.customFilters || {}), [fieldId]: value };
    onChange({ ...filters, customFilters: updatedCustom });
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-y-4 right-4 w-full max-w-sm bg-white/95 backdrop-blur-3xl shadow-[0_0_80px_-15px_rgba(0,0,0,0.1)] z-[120] border border-white/20 rounded-[40px] flex flex-col overflow-hidden"
    >
      {/* Panel Header */}
      <div className="p-8 pb-6 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Intelligence Filters</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Advanced Leads Parameters</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
        
        {/* Status Selection */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Deployment Status</h3>
            <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
              {filters.status?.length || 0} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(LeadStatus).map((status) => {
              const isActive = filters.status?.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border",
                    isActive
                      ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                      : "bg-white text-slate-500 border-slate-100 hover:border-brand-300 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {isActive && <Check className="w-3 h-3" />}
                    {status}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Acquisition Source */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Acquisition Channels</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(LeadSource).map((source) => {
              const isActive = filters.source?.includes(source);
              return (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  className={clsx(
                    "flex items-center gap-2 p-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all text-left",
                    isActive
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-500 border-transparent hover:bg-white hover:border-slate-200"
                  )}
                >
                  <Globe className={clsx("w-3 h-3", isActive ? "text-brand-400" : "text-slate-300")} />
                  {source}
                </button>
              );
            })}
          </div>
        </section>

        {/* Assignee Filter */}
        <section className="space-y-2">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Assigned Consultant</h3>
          <select
            value={filters.assignedTo?.[0] || ''}
            onChange={(e) => onChange({ ...filters, assignedTo: e.target.value ? [e.target.value] : [] })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-brand-500"
          >
            <option value="">Select Consultant</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </section>

        {/* Dates Select */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Created Period</h3>
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="date"
              value={typeof filters.dateRange?.start === 'string' ? filters.dateRange.start : ''}
              onChange={(e) => onChange({
                ...filters,
                dateRange: { 
                  start: e.target.value || null, 
                  end: filters.dateRange?.end || null 
                }
              })}
              className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none"
            />
            <input 
              type="date"
              value={typeof filters.dateRange?.end === 'string' ? filters.dateRange.end : ''}
              onChange={(e) => onChange({
                ...filters,
                dateRange: { 
                  start: filters.dateRange?.start || null, 
                  end: e.target.value || null 
                }
              })}
              className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none"
            />
          </div>
        </section>

        {/* DND, Language, Score Options */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Engagement & Insights</h3>
          
          {/* DND Dropdown */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">DND Filter Status</label>
            <select
              value={filters.dndFilter || 'All'}
              onChange={(e) => onChange({ ...filters, dndFilter: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="All">All DND Records</option>
              <option value="DND Active">DND Active</option>
              <option value="DND Inactive">DND Inactive</option>
              <option value="Unverified">Unverified</option>
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Language</label>
            <select
              value={filters.languageFilter || ''}
              onChange={(e) => onChange({ ...filters, languageFilter: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="">Any Language</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Marathi">Marathi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Score Dropdown */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Score / Temperature</label>
            <select
              value={filters.scoreFilter || ''}
              onChange={(e) => onChange({ ...filters, scoreFilter: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none"
            >
              <option value="">Any Score</option>
              <option value="Hot">🔥 Hot</option>
              <option value="Warm">☀️ Warm</option>
              <option value="Cold">❄️ Cold</option>
            </select>
          </div>
        </section>

        {/* Dynamic Geography options */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Geographical Region</h3>
          <div className="space-y-2">
            <select
              value={filters.stateFilter || ''}
              onChange={(e) => onChange({ ...filters, stateFilter: e.target.value, cityFilter: '' })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-brand-500"
            >
              <option value="">Select State</option>
              {locations?.states.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            <select
              value={filters.cityFilter || ''}
              onChange={(e) => onChange({ ...filters, cityFilter: e.target.value })}
              disabled={!filters.stateFilter}
              className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-brand-500 disabled:opacity-50"
            >
              <option value="">Select City</option>
              {filters.stateFilter && locations?.citiesByState[filters.stateFilter]?.map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Custom Fields list */}
        {teamSettings?.customFields && teamSettings.customFields.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Custom Parameters</h3>
            <div className="space-y-2">
              {teamSettings.customFields.map(f => (
                <div key={f.id} className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1">{f.label}</label>
                  <input
                    type="text"
                    placeholder={`Enter ${f.label}`}
                    value={filters.customFilters?.[f.id] || ''}
                    onChange={(e) => handleCustomFieldChange(f.id, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex gap-4">
        <button 
          onClick={onClear}
          className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all flex items-center justify-center gap-1 active:scale-95"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
        <button 
          onClick={onClose}
          className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-95"
        >
          Apply Filters
        </button>
      </div>
    </motion.div>
  );
};
