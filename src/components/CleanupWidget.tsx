import React, { useState } from 'react';
import { 
  Database, 
  Trash2, 
  Clock, 
  Bell, 
  Download, 
  MessageSquare, 
  ShieldAlert, 
  Play, 
  AlertTriangle,
  History,
  CheckCircle2,
  Calendar,
  Lock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompany } from '@/CompanyContext';
import { useAuth } from '@/AuthContext';
import { 
  useCleanupSettings, 
  useUpdateCleanupSettings, 
  useCleanupLogs, 
  useExecuteCleanupRule, 
  useDangerZoneTotalWipe 
} from '@/hooks/useCleanup';
import { toast } from 'react-hot-toast';

export const CleanupWidget = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();

  // Queries
  const { data: settings, isLoading: isSettingsLoading } = useCleanupSettings(companyId);
  const { data: logs = [], isLoading: isLogsLoading } = useCleanupLogs(companyId);

  // Mutations
  const updateSettingsMutation = useUpdateCleanupSettings();
  const executeRuleMutation = useExecuteCleanupRule();
  const dangerWipeMutation = useDangerZoneTotalWipe();

  // Modal Dialogs States
  const [runningRuleKey, setRunningRuleKey] = useState<string | null>(null);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [confirmDeleteAllInput, setConfirmDeleteAllInput] = useState('');
  const [confirmCompanyNameInput, setConfirmCompanyNameInput] = useState('');

  // TODO: Replace with real storage usage from Supabase Storage API or a
  // Postgres RPC: supabase.rpc('get_db_size') → returns { size_bytes, limit_bytes }.
  // Until that RPC is created, these remain placeholder values.
  const storageLimitGb = 10;
  const storageUsedGb = 4.25;
  const storageUsedPercent = Math.round((storageUsedGb / storageLimitGb) * 100);

  // 2. Rules array definition
  const rules = [
    { key: 'chats', title: 'Clear Old Chats', desc: 'Wipes messaging history and customer service chats older than 90 days.', age: '>90 Days', icon: MessageSquare },
    { key: 'logs', title: 'Delete Old Logs', desc: 'Clears system audit trails and agent tracking events older than 30 days.', age: '>30 Days', icon: History },
    { key: 'leads', title: 'Wipe Cold Leads', desc: 'Purges leads in "Cold" status that have not been modified for over a year.', age: '>365 Days', icon: Trash2 },
    { key: 'notifications', title: 'Clear Notifications', desc: 'Wipes inbox notification messages and system alerts older than 30 days.', age: '>30 Days', icon: Bell },
    { key: 'exports', title: 'Delete Old Exports', desc: 'Clears generated data sheets and CSV archives older than 7 days.', age: '>7 Days', icon: Download },
    { key: 'trials', title: 'Wipe Expired Trial Data', desc: 'Clears inactive tenant spaces and records with expired trial metrics.', age: '>14 Days', icon: Lock }
  ];

  // Toggle state triggers
  const handleToggle = async (key: string, enabled: boolean) => {
    if (!companyId) return;
    try {
      const fieldMap: Record<string, string> = {
        chats: 'chats_enabled',
        logs: 'logs_enabled',
        leads: 'leads_enabled',
        notifications: 'notifications_enabled',
        exports: 'exports_enabled',
        trials: 'trials_enabled'
      };
      
      const dbField = fieldMap[key];
      if (dbField) {
        await updateSettingsMutation.mutateAsync({
          company_id: companyId,
          [dbField]: enabled
        });
        toast.success(`Automated policy for ${key} updated.`);
      }
    } catch (e: any) {
      toast.error("Failed to update toggles: " + e.message);
    }
  };

  // Run Now clean confirmation
  const handleRunNow = async (key: string) => {
    if (!companyId) return;
    if (!window.confirm(`Are you sure you want to execute cleanup rule: "${key}" now?`)) return;

    setRunningRuleKey(key);
    try {
      const res = await executeRuleMutation.mutateAsync({ companyId, ruleKey: key });
      toast.success(`Cleanup complete! Wiped ${res.records_deleted} records.`);
    } catch (e: any) {
      toast.error("Cleanup action failed: " + e.message);
    } finally {
      setRunningRuleKey(null);
    }
  };

  // Trigger global wipe confirmation modal
  const handleWipeAllTrigger = () => {
    if (confirmDeleteAllInput !== 'DELETE ALL') {
      toast.error("Please type DELETE ALL in the text box first.");
      return;
    }
    setIsWipeModalOpen(true);
    setConfirmCompanyNameInput('');
  };

  // Execute global wipe action
  const handleConfirmWipeAll = async () => {
    if (confirmCompanyNameInput.trim() !== 'CallMind') {
      toast.error("Validation mismatch. Type 'CallMind' to confirm.");
      return;
    }

    try {
      if (!companyId) return;
      await dangerWipeMutation.mutateAsync({ companyId });
      toast.success("Workspace wiped successfully. All pipelines deleted.");
      setIsWipeModalOpen(false);
      setConfirmDeleteAllInput('');
    } catch (e: any) {
      toast.error("Total wipe failed: " + e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Storage usage Analytics Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
            <Database size={20} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">Database Storage Metrics</h4>
            <p className="text-[13px] text-slate-500 mt-0.5">Track your data isolation volumes and remaining indexing capacity.</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Workspace Utilization ({storageUsedPercent}%)</span>
            <span>{storageUsedGb} GB / {storageLimitGb} GB Limit</span>
          </div>
          <div className="h-3 bg-gray-150 rounded-full overflow-hidden">
            <div 
              style={{ width: `${storageUsedPercent}%` }}
              className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Rule Settings Dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map(rule => {
          const isEnabledFieldMap: Record<string, boolean> = {
            chats: settings?.chats_enabled ?? true,
            logs: settings?.logs_enabled ?? true,
            leads: settings?.leads_enabled ?? true,
            notifications: settings?.notifications_enabled ?? true,
            exports: settings?.exports_enabled ?? true,
            trials: settings?.trials_enabled ?? true
          };

          const isEnabled = isEnabledFieldMap[rule.key];
          const isRunning = runningRuleKey === rule.key;

          return (
            <div 
              key={rule.key}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 mt-0.5">
                    <rule.icon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{rule.title}</h4>
                      <span className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-black text-gray-400 uppercase tracking-wider">{rule.age}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1">{rule.desc}</p>
                  </div>
                </div>

                {/* Auto cleanup toggle */}
                <button
                  onClick={() => handleToggle(rule.key, !isEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 outline-none ${
                    isEnabled ? 'bg-brand-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase">
                  <Clock size={12} />
                  Auto-Run: {isEnabled ? 'ON' : 'OFF'}
                </div>

                <button
                  onClick={() => handleRunNow(rule.key)}
                  disabled={isRunning}
                  className="flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-650 px-3.5 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider transition-colors btn-tactile disabled:opacity-40"
                >
                  {isRunning ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                  Run Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Automatic Schedule status */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
            <Calendar size={18} />
          </div>
          <div>
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Daily System Cron Job</h5>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">Automated cleanup functions trigger daily at 2:00 AM IST (Mumbai servers).</p>
          </div>
        </div>

        <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-center shrink-0">
          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Next Execution</span>
          <span className="block text-xs font-black text-emerald-800 mt-0.5">
            {settings?.next_run_at ? new Date(settings.next_run_at).toLocaleDateString() : 'Scheduled Tomorrow'}
          </span>
        </div>
      </div>

      {/* 4. Cleanup Logs history */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-4">
        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Activity Execution Logs (Last 10 Runs)</h4>
        
        {isLogsLoading ? (
          <div className="py-8 flex justify-center text-xs text-gray-400">Loading history logs...</div>
        ) : logs.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-400 italic font-semibold">No recent telemetry logs logged.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-semibold text-gray-650">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Rule Name</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Records Deleted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5">{new Date(log.executed_at).toLocaleString()}</td>
                    <td className="py-2.5 font-mono text-[10px] uppercase tracking-wider">{log.rule_name}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        log.status === 'success' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-gray-800">{log.records_deleted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Danger Zone total wipe */}
      <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl mt-0.5 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-red-950 uppercase tracking-wider">Danger Zone (Total Purge)</h4>
            <p className="text-[11px] text-red-700 font-semibold leading-relaxed mt-1">
              Executing a total wipe deletes all calling history, webhook records, custom campaigns, sequence definitions, and CRM parameters permanently.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <input 
            type="text" 
            value={confirmDeleteAllInput}
            onChange={(e) => setConfirmDeleteAllInput(e.target.value)}
            placeholder="Type 'DELETE ALL' to unlock"
            className="w-full sm:w-64 p-3 bg-white border border-red-200 focus:border-red-500 outline-none rounded-xl text-xs text-red-950 font-bold"
          />

          <button
            onClick={handleWipeAllTrigger}
            disabled={confirmDeleteAllInput !== 'DELETE ALL' || dangerWipeMutation.isPending}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors btn-tactile disabled:opacity-40"
          >
            {dangerWipeMutation.isPending ? 'Wiping...' : 'Wipe ALL Data'}
          </button>
        </div>
      </div>

      {/* Danger Zone Modal Drawer */}
      <AnimatePresence>
        {isWipeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWipeModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-red-100 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-red-700 uppercase tracking-wider">Irreversible Action Warning</h3>
                <p className="text-[11px] text-gray-550 font-semibold leading-relaxed px-1">
                  This purge will delete all client files and campaign templates. Type the organization identifier <b>CallMind</b> to initiate wipe:
                </p>
              </div>

              <input 
                type="text" 
                value={confirmCompanyNameInput}
                onChange={(e) => setConfirmCompanyNameInput(e.target.value)}
                placeholder="Type 'CallMind'"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 text-center text-xs font-bold text-slate-800"
              />

              <div className="flex gap-2.5 text-[10px] font-black uppercase pt-2">
                <button onClick={() => setIsWipeModalOpen(false)} className="flex-1 py-2.5 bg-gray-50 border border-gray-150 text-gray-650 rounded-xl btn-tactile">Abort</button>
                <button 
                  onClick={handleConfirmWipeAll} 
                  disabled={confirmCompanyNameInput !== 'CallMind'}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl btn-tactile disabled:opacity-40"
                >
                  Initiate Wipe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
