import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Layers, 
  Plus, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCompany } from '@/CompanyContext';

interface HierarchyData {
  enabled: boolean;
  regions: any[];
  branches: any[];
  departments: any[];
}

export const OrganizationHierarchySettings: React.FC = () => {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HierarchyData>({
    enabled: false,
    regions: [],
    branches: [],
    departments: [],
  });

  const [activeTab, setActiveTab] = useState<'branches' | 'regions' | 'departments'>('branches');

  // Form Modal States
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  // Form Inputs
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchRegionId, setNewBranchRegionId] = useState('');
  
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionCode, setNewRegionCode] = useState('');

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptBranchId, setNewDeptBranchId] = useState('');

  // Fetch Hierarchy Data
  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hierarchy');
      if (!res.ok) throw new Error('Failed to fetch hierarchy tree.');
      const result = await res.json();

      setData({
        enabled: result.enabled || false,
        regions: result.regions || [],
        branches: result.branches || [],
        departments: result.departments || [],
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load organization hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) fetchHierarchy();
  }, [companyId]);

  // Toggle Feature State
  const handleToggle = async () => {
    const nextState = !data.enabled;
    setSaving(true);
    try {
      const res = await fetch('/api/hierarchy/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });

      if (!res.ok) throw new Error('Failed to update toggle state');

      setData((prev) => ({ ...prev, enabled: nextState }));
      toast.success(
        nextState 
          ? 'Branch & Region Management Enabled! Hierarchy controls active.' 
          : 'Branch Management Disabled. CRM operating in standard mode.'
      );
    } catch (err: any) {
      toast.error(err.message || 'Error updating settings');
    } finally {
      setSaving(false);
    }
  };

  // Create Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    try {
      const res = await fetch('/api/hierarchy/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBranchName,
          city: newBranchCity,
          region_id: newBranchRegionId || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to create branch');
      }

      toast.success(`Branch "${newBranchName}" created!`);
      setNewBranchName('');
      setNewBranchCity('');
      setNewBranchRegionId('');
      setShowBranchModal(false);
      fetchHierarchy();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create branch');
    }
  };

  // Create Region
  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim()) return;

    try {
      const res = await fetch('/api/hierarchy/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRegionName, code: newRegionCode }),
      });

      if (!res.ok) throw new Error('Failed to create region');

      toast.success(`Region "${newRegionName}" created!`);
      setNewRegionName('');
      setNewRegionCode('');
      setShowRegionModal(false);
      fetchHierarchy();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading Organization Hierarchy Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER CARD WITH TOGGLE SWITCH */}
      <div className="glass-card p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-50 rounded-xl text-brand-600">
            <Building2 size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Branch & Region Hierarchy Management</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable multi-branch data isolation, regional targets, and department routing. (Default = OFF)
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            data.enabled 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {data.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          <span>{data.enabled ? 'Enabled (Multi-Branch Mode)' : 'Disabled (Standard Mode)'}</span>
        </button>
      </div>

      {/* IF DISABLED BANNER */}
      {!data.enabled ? (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
          <ShieldCheck className="mx-auto text-slate-400" size={32} />
          <h4 className="text-sm font-bold text-slate-800">Standard Single-Branch Mode Active</h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Your CRM is operating in standard mode. Every lead, team, and report is centralized under your main company workspace. Toggle ON above whenever your business expands into multiple branches.
          </p>
        </div>
      ) : (
        /* HIERARCHY MANAGEMENT TABS & GRIDS */
        <div className="space-y-6">
          {/* SUB-TABS */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('branches')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'branches' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 size={16} />
              <span>Branches ({data.branches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('regions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'regions' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe size={16} />
              <span>Regions ({data.regions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'departments' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers size={16} />
              <span>Departments ({data.departments.length})</span>
            </button>

            <div className="ml-auto">
              {activeTab === 'branches' && (
                <button
                  onClick={() => setShowBranchModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-all shadow-sm"
                >
                  <Plus size={14} /> Add Branch
                </button>
              )}
              {activeTab === 'regions' && (
                <button
                  onClick={() => setShowRegionModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-all shadow-sm"
                >
                  <Plus size={14} /> Add Region
                </button>
              )}
            </div>
          </div>

          {/* BRANCHES GRID */}
          {activeTab === 'branches' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.branches.map((b) => (
                <div key={b.id} className="glass-card p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                    {b.is_main_branch && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-[10px] font-bold">
                        Main Branch
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400" />
                    <span>{b.city || 'City Not Specified'}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* REGIONS GRID */}
          {activeTab === 'regions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.regions.map((r) => (
                <div key={r.id} className="glass-card p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">{r.name}</h4>
                  {r.code && <span className="text-xs text-slate-400 font-mono">Code: {r.code}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE BRANCH MODAL */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Branch</h3>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pune Branch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">City</label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REGION MODAL */}
      {showRegionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Region</h3>
            <form onSubmit={handleCreateRegion} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Region Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Region"
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegionModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700"
                >
                  Create Region
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
