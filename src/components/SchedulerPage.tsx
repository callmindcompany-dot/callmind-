import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  PhoneCall, 
  Bell, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Zap, 
  Lock,
  Pause,
  Play,
  Trash2,
  ListFilter
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { 
  useCallbacks, 
  useCompleteCallback, 
  useSnoozeCallback, 
  useDeleteCallback, 
  usePauseAllCallbacks, 
  useCreateCallbackReminder 
} from '@/hooks/useCallbacks';
import { schedulerService, CallOutcome } from '@/services/schedulerService';
import { toast } from 'react-hot-toast';
import CallMindLoader from './CallMindLoader';
import { Callback } from '@/types/founder';

export const SchedulerPage = () => {
  const { user } = useAuth();
  const { companyId } = useCompany();

  // Dialog & Modal State
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  
  const [showNewReminderModal, setShowNewReminderModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [isCreatingReminder, setIsCreatingReminder] = useState(false);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Paused' | 'Completed'>('Pending');

  // The scheduler is not gated.
  //
  // This was `isFounder || featureFlags.scheduler`. Neither half worked as
  // intended. `featureFlags` comes from `profile.featureFlags`, and no migration
  // creates that column, so it is permanently `{}` -- meaning the flag was
  // always undefined and the expression collapsed to `isFounder`. And
  // `isFounder` is the tenant role every company creator gets, so in practice
  // the follow-up queue was visible to the owner and locked to every telecaller,
  // with a message telling them to ask an administrator to enable it through a
  // toggle that does not exist.
  //
  // Telecallers are the people who make the callbacks. This is core
  // functionality in a telecalling CRM, not a feature to unlock. The locked
  // screen that used to render here told the user to enable it from the Founder
  // Hub, where there was no such control.

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Real-time alerts enabled!');
      }
    }
  };

  // React Query Hooks
  const { data: callbacks = [], isLoading, isError, refetch } = useCallbacks(companyId, statusFilter);
  const completeMutation = useCompleteCallback();
  const snoozeMutation = useSnoozeCallback();
  const deleteMutation = useDeleteCallback();
  const pauseAllMutation = usePauseAllCallbacks();
  const createReminderMutation = useCreateCallbackReminder();

  // Fetch leads for New Reminder Selector
  const { data: leads = [] } = useQuery({
    queryKey: ['scheduler_leads', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && showNewReminderModal
  });

  // Local schedule alert timeouts
  useEffect(() => {
    if (notificationPermission !== 'granted' || callbacks.length === 0 || statusFilter !== 'Pending') return;
    
    const activeTimeouts: NodeJS.Timeout[] = [];
    const now = Date.now();
    
    callbacks.forEach(c => {
      const time = new Date(c.reminder_date).getTime();
      const delay = time - now;
      if (delay > 0 && delay < 5 * 60 * 1000) { // Limit to next 5 minutes
        const timeoutId = setTimeout(() => {
          new Notification('Call Reminder', {
            body: `Time to call ${c.lead?.name || 'Client'}. Notes: ${c.notes || 'No description'}`,
            icon: '/favicon.ico'
          });
          toast(`Reminder: Call ${c.lead?.name || 'Client'}`);
        }, delay);
        activeTimeouts.push(timeoutId);
      }
    });
    
    return () => {
      activeTimeouts.forEach(clearTimeout);
    };
  }, [callbacks, notificationPermission, statusFilter]);

  /**
   * Shows what the retry rule would do for an outcome. Writes nothing.
   *
   * This used to call processCallOutcome with a lead id of 'sim_lead_123' and a
   * name of 'Demo Lead (Simulation)'. The guards inside skipped the lead update
   * and the callback, but not the calls insert -- so every press of Simulate
   * Outcome left a real row in the customer's call history, for a lead that did
   * not exist, with an invented phone number and an invented duration.
   *
   * A simulation that changes the thing it simulates is not a simulation.
   */
  const handleSimulateCall = (outcome: CallOutcome) => {
    const nextTime = schedulerService.calculateNextRetryTime(outcome);

    setSimulationResult(
      nextTime
        ? `${outcome} — the next attempt would be scheduled for ${nextTime.toLocaleString()}.`
        : `${outcome} — no retry is scheduled for this outcome.`
    );
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !reminderDateTime || !companyId) {
      toast.error("Please complete all form fields.");
      return;
    }
    
    setIsCreatingReminder(true);
    try {
      await createReminderMutation.mutateAsync({
        companyId,
        leadId: selectedLeadId,
        // Email, not uid. CallsPage and log_manual_call both write the agent's
        // email into callbacks.assigned_to; writing a uid here meant the same
        // column held two different kinds of identifier, so nothing could
        // reliably answer "whose callback is this".
        assignedTo: user?.email || null,
        reminderDate: new Date(reminderDateTime).toISOString(),
        notes: reminderNotes
      });
      setShowNewReminderModal(false);
      setSelectedLeadId('');
      setReminderDateTime('');
      setReminderNotes('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingReminder(false);
    }
  };

  const handleSnooze = (callbackId: string, hours: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);
    snoozeMutation.mutate({ callbackId, snoozeUntil });
  };

  const handleSnoozeTomorrow = (callbackId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM Tomorrow
    snoozeMutation.mutate({ callbackId, snoozeUntil: tomorrow });
  };

  const handleResumeAll = async () => {
    if (!companyId) return;
    try {
      const { error } = await supabase
        .from('callbacks')
        .update({ status: 'Pending' })
        .eq('company_id', companyId)
        .eq('status', 'Paused');

      if (error) throw error;
      toast.success("All callbacks resumed!");
      refetch();
    } catch (e: any) {
      toast.error("Failed to resume: " + e.message);
    }
  };

  const exportDailyReport = () => {
    const todayCallbacks = callbacks.filter(c => {
      const now = new Date();
      const cDate = new Date(c.reminder_date);
      return cDate.toDateString() === now.toDateString();
    });

    const headers = ['Lead Name', 'Phone', 'Scheduled Time', 'Notes', 'Status'];
    const rows = todayCallbacks.map(c => [
      `"${c.lead?.name || 'Unknown'}"`,
      `"${c.lead?.phone || 'N/A'}"`,
      `"${new Date(c.reminder_date).toLocaleString()}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      `"${c.status}"`
    ]);

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `daily_callbacks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Daily report CSV exported!");
  };

  // Filters computed lists
  const filteredCallbacks = useMemo(() => {
    return callbacks.filter(c => {
      const matchesSearch = 
        (c.lead?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [callbacks, searchQuery]);

  const overdue = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return filteredCallbacks.filter(c => new Date(c.reminder_date) < todayStart);
  }, [filteredCallbacks]);

  const today = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return filteredCallbacks.filter(c => {
      const date = new Date(c.reminder_date);
      return date >= todayStart && date <= todayEnd;
    });
  }, [filteredCallbacks]);

  const upcoming = useMemo(() => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return filteredCallbacks.filter(c => new Date(c.reminder_date) > todayEnd);
  }, [filteredCallbacks]);

  const renderQueueSection = (title: string, items: Callback[], color: string) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{title} ({items.length})</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic ml-4">No {title.toLowerCase()} callbacks scheduled.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-brand-100 transition-all bg-white group shadow-xs">
              <div className="flex items-start gap-4">
                <div className={`w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center ${color} font-black text-xs shadow-inner shrink-0 mt-0.5`}>
                  {(item.lead?.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-2">
                    {item.lead?.name || 'Lead unavailable'}
                    <span className="text-[10px] text-gray-400 font-normal">({item.lead?.phone || 'N/A'})</span>
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                    Time: {new Date(item.reminder_date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5 font-semibold bg-gray-50/50 p-2.5 rounded-xl border border-gray-50 italic">
                    "{item.notes || 'Call back scheduled'}"
                  </p>
                </div>
              </div>

              {/* Callback Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
                {statusFilter === 'Pending' && (
                  <>
                    <button 
                      onClick={() => completeMutation.mutate(item.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-emerald-100 flex items-center gap-1 btn-tactile"
                      title="Mark Completed"
                    >
                      <CheckCircle2 size={12} />
                      Complete
                    </button>

                    <div className="relative group/snooze">
                      <button 
                        className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 btn-tactile"
                      >
                        Snooze
                      </button>
                      <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-150 rounded-xl shadow-lg p-1.5 hidden group-hover/snooze:block z-40 w-36 space-y-1">
                        <button onClick={() => handleSnooze(item.id, 1)} className="w-full text-left px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 rounded">
                          +1 Hour
                        </button>
                        <button onClick={() => handleSnooze(item.id, 3)} className="w-full text-left px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 rounded">
                          +3 Hours
                        </button>
                        <button onClick={() => handleSnoozeTomorrow(item.id)} className="w-full text-left px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-50 rounded">
                          Tomorrow 10 AM
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <button 
                  onClick={() => {
                    if (window.confirm("Permanently delete callback log?")) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all btn-tactile"
                  title="Remove Callback"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3 font-display">
            Smart Callback Engine
            <span className="text-[9px] px-2 py-0.5 bg-brand-600 text-white rounded-lg font-black uppercase tracking-widest">Live Engine</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1 text-sm">Autonomous scheduling, lead sentiment routing, and call follow-up logic.</p>
        </div>
        <div className="flex gap-2">
          {statusFilter === 'Pending' ? (
            <button 
              onClick={() => companyId && pauseAllMutation.mutate(companyId)}
              className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 btn-tactile"
            >
              <Pause size={14} /> Pause Queue
            </button>
          ) : statusFilter === 'Paused' ? (
            <button 
              onClick={handleResumeAll}
              className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 btn-tactile"
            >
              <Play size={14} /> Resume Queue
            </button>
          ) : null}
          <button 
            onClick={() => setShowSimulateModal(true)}
            className="px-4 py-2.5 bg-brand-50 text-brand-600 border border-brand-100 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-brand-100 transition-all flex items-center gap-2 btn-tactile"
          >
            <Zap size={14} /> Simulate Outcome
          </button>
          <button 
            onClick={() => setShowNewReminderModal(true)}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-brand-700 transition-all flex items-center gap-1.5 btn-tactile btn-glow"
          >
            <Plus size={16} /> New Reminder
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Queue', value: callbacks.length.toString(), icon: PhoneCall, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Success Rate', value: '94.2%', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg Retry Delay', value: '4.5m', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Alert Authorization', value: notificationPermission === 'granted' ? 'Enabled' : 'Blocked', icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={stat.label} className="glass p-5 rounded-3xl border border-gray-100 shadow-xs glass-card">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <h3 className="text-xl font-black text-gray-900">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pending Reminders</h2>
                <p className="text-xs text-gray-400">Color-coded callback scheduler based on timeline.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search queue..." 
                    className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-xl text-xs focus:ring-1 focus:ring-brand-500 outline-none w-36 focus:w-48 transition-all"
                  />
                </div>
                
                {/* Status Toggle filter */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  {(['Pending', 'Paused', 'Completed'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                        statusFilter === status 
                          ? 'bg-white text-brand-600 shadow-xs border border-gray-100' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {isLoading ? (
                <div className="py-12 flex justify-center">
                  <CallMindLoader size="md" text="Hydrating queue..." />
                </div>
              ) : isError ? (
                <div className="text-center py-12 space-y-4">
                  <AlertCircle className="text-red-500 mx-auto" size={32} />
                  <p className="text-xs text-gray-500 font-bold">Failed to load callback queue.</p>
                  <button onClick={() => refetch()} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider btn-tactile">
                    Retry Sync
                  </button>
                </div>
              ) : (
                <>
                  {renderQueueSection('Overdue Callbacks', overdue, 'text-red-600')}
                  {renderQueueSection('Today Scheduled', today, 'text-orange-600')}
                  {renderQueueSection('Upcoming', upcoming, 'text-blue-600')}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Configurations Side Panel */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs relative overflow-hidden">
            <h3 className="text-base font-bold mb-4">Notification Health</h3>
            
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Retry Engine Logic</span>
                <span className="text-[10px] text-green-400 font-black uppercase tracking-widest">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Desktop Alerts (HTML5)</span>
                <button 
                  onClick={requestNotificationPermission}
                  className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest transition-all ${
                    notificationPermission === 'granted' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                  }`}
                >
                  {notificationPermission === 'granted' ? 'Granted' : 'Request'}
                </button>
              </div>
              <div className="pt-4 border-t border-white/10 text-[10px] text-gray-400">
                <p className="leading-relaxed">Realtime notifications listen to changes and dispatch desktop alerts for schedules arriving in the next 5 minutes.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Operations Console</h3>
            <div className="space-y-2.5">
              <button 
                onClick={exportDailyReport}
                className="w-full p-3 bg-gray-50 hover:bg-brand-50 rounded-xl text-left transition-all group border border-transparent hover:border-brand-100 btn-tactile"
              >
                <p className="text-xs font-bold text-gray-900 group-hover:text-brand-600">Export Today's Queue</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Download CSV Report</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Reminder Modal */}
      <AnimatePresence>
        {showNewReminderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewReminderModal(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl border border-gray-100 z-55"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tighter">Schedule Callback</h3>
                  <p className="text-xs text-gray-500">Insert callback details for tenant tracking.</p>
                </div>
                <button onClick={() => setShowNewReminderModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Target Client Lead</label>
                  <select
                    required
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl outline-none font-semibold text-gray-700"
                  >
                    <option value="">-- Choose Lead --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Follow-up Time</label>
                  <input
                    required
                    type="datetime-local"
                    value={reminderDateTime}
                    onChange={(e) => setReminderDateTime(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl outline-none font-semibold text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Notes / Call Objective</label>
                  <textarea
                    value={reminderNotes}
                    onChange={(e) => setReminderNotes(e.target.value)}
                    rows={3}
                    placeholder="Provide specific notes or query follow-ups here..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl outline-none font-semibold text-gray-700 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreatingReminder}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs btn-tactile"
                >
                  {isCreatingReminder ? 'Creating...' : 'Schedule Reminder'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulation Modal */}
      <AnimatePresence>
        {showSimulateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowSimulateModal(false); setSimulationResult(null); }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tighter">Retry Rules</h3>
                  <p className="text-xs text-gray-500">When each call outcome schedules the next attempt.</p>
                </div>
                <button onClick={() => { setShowSimulateModal(false); setSimulationResult(null); }} className="p-1.5 hover:bg-gray-100 rounded-xl transition-all">
                  <X size={16} />
                </button>
              </div>

              {simulationResult ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto">
                    <Clock size={24} />
                  </div>
                  <p className="text-xs font-bold text-gray-800">{simulationResult}</p>
                  <p className="text-[10px] text-gray-400">Nothing was saved — this only shows the retry rule.</p>
                  <button
                    onClick={() => setSimulationResult(null)}
                    className="text-[10px] font-black text-brand-600 uppercase tracking-widest"
                  >
                    Try another outcome
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Outcome</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {[
                      { id: 'No Answer', desc: '+2 Hours retry' },
                      { id: 'Busy', desc: '+30 Minutes retry' },
                      { id: 'Switched Off', desc: 'Tomorrow 10:00 AM retry' },
                    ].map((outcome) => (
                      <button
                        key={outcome.id}
                        onClick={() => handleSimulateCall(outcome.id as CallOutcome)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/40 transition-all text-left"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{outcome.id}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">Calculated delay: {outcome.desc}</p>
                        </div>
                        <Zap size={12} className="text-brand-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
