import React, { useState, useEffect } from 'react';
import { Building2, Globe, Filter } from 'lucide-react';

interface HierarchyFilterBarProps {
  onFilterChange?: (filters: { branchId?: string; regionId?: string }) => void;
}

export const HierarchyFilterBar: React.FC<HierarchyFilterBarProps> = ({ onFilterChange }) => {
  const [enabled, setEnabled] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  useEffect(() => {
    fetch('/api/hierarchy')
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled) {
          setEnabled(true);
          setRegions(data.regions || []);
          setBranches(data.branches || []);
        }
      })
      .catch((err) => {
        console.warn('[HierarchyFilterBar] Failed to fetch hierarchy config:', err);
      });
  }, []);

  if (!enabled) return null; // If disabled, render NOTHING (Zero UI disruption)

  const handleRegionChange = (val: string) => {
    setSelectedRegion(val);
    setSelectedBranch('');
    onFilterChange?.({ regionId: val || undefined, branchId: undefined });
  };

  const handleBranchChange = (val: string) => {
    setSelectedBranch(val);
    onFilterChange?.({ regionId: selectedRegion || undefined, branchId: val || undefined });
  };

  return (
    <div className="glass-card px-4 py-2.5 rounded-xl bg-white/80 border border-slate-200/80 flex items-center gap-3 text-xs font-semibold text-slate-700 shadow-sm mb-4">
      <div className="flex items-center gap-1.5 text-brand-600 font-bold">
        <Filter size={14} />
        <span>Hierarchy Scope:</span>
      </div>

      {/* REGION FILTER */}
      <div className="flex items-center gap-1">
        <Globe size={14} className="text-slate-400" />
        <select
          value={selectedRegion}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="bg-transparent border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Regions</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* BRANCH FILTER */}
      <div className="flex items-center gap-1">
        <Building2 size={14} className="text-slate-400" />
        <select
          value={selectedBranch}
          onChange={(e) => handleBranchChange(e.target.value)}
          className="bg-transparent border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All Branches</option>
          {branches
            .filter((b) => !selectedRegion || b.region_id === selectedRegion)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};
