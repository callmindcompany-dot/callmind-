import React from 'react';
import { Search, Settings2, Calendar, Check, Save, FolderOpen, Sliders, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface LeadFilterBarProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  userFilter: string;
  setUserFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  stateFilter: string;
  setStateFilter: (val: string) => void;
  cityFilter: string;
  setCityFilter: (val: string) => void;
  customFilters: Record<string, string>;
  setCustomFilters: (filters: Record<string, string>) => void;
  showMoreFilters: boolean;
  setShowMoreFilters: (show: boolean) => void;
  teamSettings: TeamSettings;
  agents: Agent[];
  setShowFieldSettings: (show: boolean) => void;

  // New critical filters props
  scoreFilter: string;
  setScoreFilter: (val: string) => void;
  showOnlyRotting: boolean;
  setShowOnlyRotting: (val: boolean) => void;
  companyId: string | null;
  onOpenAdvancedFilters: () => void;
}

export const LeadFilterBar = React.memo(({
  inputValue,
  setInputValue,
  userFilter,
  setUserFilter,
  sourceFilter,
  setSourceFilter,
  statusFilter,
  setStatusFilter,
  stateFilter,
  setStateFilter,
  cityFilter,
  setCityFilter,
  customFilters,
  setCustomFilters,
  showMoreFilters,
  setShowMoreFilters,
  teamSettings,
  agents,
  setShowFieldSettings,
  scoreFilter,
  setScoreFilter,
  showOnlyRotting,
  setShowOnlyRotting,
  companyId,
  onOpenAdvancedFilters
}: LeadFilterBarProps) => {
  const { data: locations } = useDistinctLocations(companyId);

  // Debounced state for custom fields
  const [localCustomFilters, setLocalCustomFilters] = React.useState<Record<string, string>>(customFilters);

  React.useEffect(() => {
    setLocalCustomFilters(customFilters);
  }, [customFilters]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(localCustomFilters) !== JSON.stringify(customFilters)) {
        setCustomFilters(localCustomFilters);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localCustomFilters, customFilters, setCustomFilters]);

  // Load and save filter presets from localStorage
  const [presets, setPresets] = React.useState<Record<string, any>>({});
  const [showPresetsDropdown, setShowPresetsDropdown] = React.useState(false);

  React.useEffect(() => {
    if (companyId) {
      const saved = localStorage.getItem(`callmind_filter_presets_${companyId}`);
      if (saved) {
        try {
          setPresets(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse filter presets", e);
        }
      }
    }
  }, [companyId]);

  const handleSavePreset = () => {
    const name = prompt("Enter a name for this filter preset:");
    if (!name || !name.trim()) return;

    const presetName = name.trim();
    const newPreset = {
      inputValue,
      userFilter,
      sourceFilter,
      statusFilter,
      stateFilter,
      cityFilter,
      scoreFilter,
      showOnlyRotting,
      customFilters
    };

    const updated = { ...presets, [presetName]: newPreset };
    setPresets(updated);
    if (companyId) {
      localStorage.setItem(`callmind_filter_presets_${companyId}`, JSON.stringify(updated));
    }
  };

  const handleLoadPreset = (name: string) => {
    const preset = presets[name];
    if (!preset) return;

    setInputValue(preset.inputValue ?? '');
    setUserFilter(preset.userFilter ?? '');
    setSourceFilter(preset.sourceFilter ?? '');
    setStatusFilter(preset.statusFilter ?? 'All');
    setStateFilter(preset.stateFilter ?? '');
    setCityFilter(preset.cityFilter ?? '');
    setScoreFilter(preset.scoreFilter ?? '');
    setShowOnlyRotting(preset.showOnlyRotting ?? false);
    setCustomFilters(preset.customFilters ?? {});
    setShowPresetsDropdown(false);
  };

  const handleClearPreset = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete preset "${name}"?`)) return;

    const updated = { ...presets };
    delete updated[name];
    setPresets(updated);
    if (companyId) {
      localStorage.setItem(`callmind_filter_presets_${companyId}`, JSON.stringify(updated));
    }
  };

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (inputValue) count++;
    if (userFilter) count++;
    if (sourceFilter) count++;
    if (statusFilter && statusFilter !== 'All') count++;
    if (stateFilter) count++;
    if (cityFilter) count++;
    if (scoreFilter) count++;
    if (showOnlyRotting) count++;
    if (customFilters) {
      count += Object.values(customFilters).filter(v => !!v).length;
    }
    return count;
  }, [
    inputValue, userFilter, sourceFilter, statusFilter, stateFilter, 
    cityFilter, scoreFilter,
    showOnlyRotting, customFilters
  ]);

  const getLabel = (key: string, defaultLabel: string) => {
    return teamSettings?.fieldLabels?.[key] || defaultLabel;
  };

  return (
    <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 border border-brand-100 shrink-0 relative">
            <span className="font-bold">Y</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-brand-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Lead Parameters Filter</h2>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Filter active team data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Presets Button */}
          <div className="relative">
            <button 
              onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
              className="p-2 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 text-gray-500 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <FolderOpen size={14} /> Presets
            </button>
            {showPresetsDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 p-2 space-y-1">
                <button 
                  onClick={handleSavePreset}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 rounded-xl flex items-center gap-2"
                >
                  <Save size={12} /> Save Current View
                </button>
                <div className="border-t border-gray-50 my-1" />
                {Object.keys(presets).length === 0 ? (
                  <p className="text-[10px] text-gray-400 font-medium px-3 py-2">No saved views</p>
                ) : (
                  Object.keys(presets).map(name => (
                    <div 
                      key={name} 
                      onClick={() => handleLoadPreset(name)}
                      className="w-full px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between cursor-pointer group"
                    >
                      <span className="truncate">{name}</span>
                      <button 
                        onClick={(e) => handleClearPreset(name, e)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button 
            onClick={onOpenAdvancedFilters}
            className="p-2 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 text-brand-600 transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Sliders size={14} /> Advanced Drawer
          </button>

          <button 
            onClick={() => setShowFieldSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 text-gray-500 transition-all flex items-center gap-2 text-xs font-bold shrink-0"
          >
            <Settings2 size={14} /> Filters Setup
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Name/Phone/Email" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-medium"
          />
        </div>
        <div>
          <select 
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-bold text-gray-600 appearance-none"
          >
            <option value="">Select Consultant</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <select 
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-bold text-gray-600 appearance-none"
          >
            <option value="">Select {getLabel('source', 'Source')}</option>
            <option value="Website">Website</option>
            <option value="Import">Import</option>
            <option value="Manual">Manual</option>
            <option value="API Integration">API Integration</option>
            <option value="CRM Webhook">CRM Webhook</option>
            <option value="Facebook Ads">Facebook Ads</option>
          </select>
        </div>
        
        <div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-bold text-gray-600 appearance-none"
          >
            <option value="All">Select {getLabel('status', 'Status')}</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Interested">Interested</option>
            <option value="Call Back">Call Back</option>
            <option value="Converted">Converted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* Dynamic State Selection */}
        <div>
          <select 
            value={stateFilter}
            onChange={(e) => { setStateFilter(e.target.value); setCityFilter(''); }}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-bold text-gray-600 appearance-none"
          >
            <option value="">Select {getLabel('state', 'State')}</option>
            {locations?.states.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Dynamic City Selection */}
        <div>
          <select 
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            disabled={!stateFilter}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-bold text-gray-600 appearance-none disabled:opacity-50"
          >
            <option value="">Select {getLabel('city', 'City')}</option>
            {stateFilter && locations?.citiesByState[stateFilter]?.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Dynamically Render Custom Fields */}
        {teamSettings.customFields?.map((field: any) => (
          <div key={field.id}>
            <input 
              type="text" 
              placeholder={field.label}
              value={localCustomFilters[field.id] || ''}
              onChange={(e) => setLocalCustomFilters({...localCustomFilters, [field.id]: e.target.value})}
              className="w-full px-4 py-2.5 bg-blue-50/30 border border-blue-200 rounded-xl text-xs outline-none focus:border-blue-500 transition-all font-bold placeholder:text-blue-400/70 text-blue-900"
            />
          </div>
        ))}
      </div>
      
      <AnimatePresence>
        {showMoreFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mt-4 pt-4 border-t border-gray-100">
              
              {/* Lead Score / Temperature */}
              <div>
                <select 
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 transition-all font-bold text-gray-600 appearance-none"
                >
                  <option value="">Any score</option>
                  <option value="80">Hot — 80 and above</option>
                  <option value="50">Warm — 50 and above</option>
                  <option value="1">Scored at all</option>
                </select>
              </div>

              {/* Rotting Toggle checkbox wrapper */}
              <div className="flex items-center gap-3 px-2 py-2">
                <input 
                  type="checkbox"
                  id="rottingFilterCheckbox"
                  checked={showOnlyRotting}
                  onChange={(e) => setShowOnlyRotting(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 border-gray-300 focus:ring-brand-500 transition-all cursor-pointer"
                />
                <label htmlFor="rottingFilterCheckbox" className="text-xs font-bold text-amber-600 select-none cursor-pointer flex items-center gap-1">
                  <ShieldAlert size={14} /> Rotting Only
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mt-6">
        <div />
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Settings2 size={14} /> {showMoreFilters ? 'Less Filters' : 'More Filters'}
          </button>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.inputValue === next.inputValue &&
    prev.userFilter === next.userFilter &&
    prev.sourceFilter === next.sourceFilter &&
    prev.statusFilter === next.statusFilter &&
    prev.stateFilter === next.stateFilter &&
    prev.cityFilter === next.cityFilter &&
    prev.showMoreFilters === next.showMoreFilters &&
    prev.scoreFilter === next.scoreFilter &&
    prev.showOnlyRotting === next.showOnlyRotting &&
    JSON.stringify(prev.customFilters) === JSON.stringify(next.customFilters) &&
    JSON.stringify(prev.teamSettings) === JSON.stringify(next.teamSettings) &&
    prev.agents === next.agents
  );
});

LeadFilterBar.displayName = 'LeadFilterBar';

const XIcon = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
