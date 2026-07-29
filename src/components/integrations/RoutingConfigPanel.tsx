import { Sliders } from 'lucide-react';

interface RoutingConfigPanelProps {
  assignmentRule: 'Manual' | 'RoundRobin';
  setAssignmentRule: (v: 'Manual' | 'RoundRobin') => void;
  excludeInactive: boolean;
  setExcludeInactive: (v: boolean) => void;
  overflowHours: number;
  setOverflowHours: (v: number) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function RoutingConfigPanel({
  assignmentRule, setAssignmentRule,
  excludeInactive, setExcludeInactive,
  overflowHours, setOverflowHours,
  onSave, isSaving,
}: RoutingConfigPanelProps) {
  return (
    <div className="col-span-full bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm space-y-8">
      <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-widest text-purple-600">Dynamic Lead Distribution Rules</h3>
        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-[10px] font-bold uppercase tracking-wide">Active Core Module</span>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
            <h4 className="text-xs font-bold text-gray-800">1. Distribution Algorithm</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`p-4 rounded-xl border cursor-pointer flex flex-col gap-2 transition-all ${assignmentRule === 'Manual' ? 'bg-white border-purple-300 shadow-sm' : 'bg-white/50 border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="assignmentRule" value="Manual" checked={assignmentRule === 'Manual'} onChange={() => setAssignmentRule('Manual')} className="text-purple-600 focus:ring-purple-500" />
                  <span className="text-xs font-bold text-gray-900">Manual (Pooled)</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Incoming leads are set as Unassigned</p>
              </label>
              <label className={`p-4 rounded-xl border cursor-pointer flex flex-col gap-2 transition-all ${assignmentRule === 'RoundRobin' ? 'bg-white border-purple-300 shadow-sm' : 'bg-white/50 border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <input type="radio" name="assignmentRule" value="RoundRobin" checked={assignmentRule === 'RoundRobin'} onChange={() => setAssignmentRule('RoundRobin')} className="text-purple-600 focus:ring-purple-500" />
                  <span className="text-xs font-bold text-gray-900">Round Robin (Auto)</span>
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Circulate equally among active telecallers</p>
              </label>
            </div>
          </div>

          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1"><Sliders size={16} /> 2. Overflow Adjusters</h4>
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={excludeInactive} onChange={(e) => setExcludeInactive(e.target.checked)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span>Exclude agents marked &quot;Offline&quot; from the Round Robin queue</span>
              </label>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lead Response Overflow SLA Threshold</label>
                <select value={overflowHours} onChange={(e) => setOverflowHours(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none">
                  <option value={12}>12 Hours (Aggressive)</option>
                  <option value={24}>24 Hours (Standard)</option>
                  <option value={48}>48 Hours (Relaxed)</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md uppercase tracking-wider disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Distribution Schema'}
          </button>
        </div>

        <div className="bg-purple-50/30 p-6 rounded-2xl border border-purple-100/50 h-fit space-y-4">
          <h4 className="text-xs font-black uppercase text-purple-600 tracking-wider">How routing operates</h4>
          <p className="text-[11px] text-gray-600 leading-relaxed font-semibold">
            When Webhooks, Facebook leads, or embedded Website Form submissions hit the CRM database, name and phone parameters are validated first to prevent duplicate entries.
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
            If validation passes and <strong>Round Robin</strong> is active, the system checks modern telecaller agent availability lists and updates the <code>assignedTo</code> parameter directly.
          </p>
        </div>
      </form>
    </div>
  );
}
