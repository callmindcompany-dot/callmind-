/**
 * Two controls were removed from this panel: an "exclude offline agents"
 * checkbox and a "Lead Response Overflow SLA Threshold" dropdown.
 *
 * Neither did anything. processInboundLead keeps its active-agent list at an
 * empty array and never reads agent_status, so excluding offline agents changed
 * no assignment; and an overflow SLA requires a job that reassigns untouched
 * leads after N hours, which cannot run while pg_cron is not installed. Both
 * also lacked columns, so submitting this form raised 42703 and the assignment
 * rule -- the one setting that is genuinely honoured -- could not be saved at
 * all because of the two beside it.
 */
interface RoutingConfigPanelProps {
  assignmentRule: 'Manual' | 'RoundRobin';
  setAssignmentRule: (v: 'Manual' | 'RoundRobin') => void;
  onSave: () => void;
  isSaving: boolean;
}

export function RoutingConfigPanel({
  assignmentRule, setAssignmentRule,
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
