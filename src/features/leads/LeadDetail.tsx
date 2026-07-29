import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Edit2, Trash2, Phone, Mail, Globe, MapPin, 
  ChevronRight, Calendar, User, MessageSquare, 
  History, Clock, AlertCircle, Send, PhoneCall,
  ChevronLeft, ArrowLeft, ArrowRight, Save, Bell
} from 'lucide-react';
import { Lead, LeadStatus } from '../../types/lead';
import { useUpdateLead, useDeleteLead } from '../../hooks/useLeads';
import { useLeadNotes, useCreateLeadNote } from '../../hooks/useLeadNotes';
import { useLeadCalls } from '../../hooks/useLeadCalls';
import { useLeadActivity } from '../../hooks/useLeadActivity';
import { useCreateCallback } from '../../hooks/useCreateCallback';
import { useCustomFields } from '../../hooks/useCustomFields';
import { useCompany } from '@/CompanyContext';
import { useAuth } from '@/AuthContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import CallMindLoader from '../../components/CallMindLoader';

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
  leadsList?: Lead[];
  onNavigate?: (lead: Lead) => void;
}

type Tab = 'overview' | 'timeline' | 'calls' | 'notes';

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'New':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Contacted':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Interested':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'Call Back':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'Converted':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Not Interested':
    default:
      return 'bg-rose-100 text-rose-700 border-rose-200';
  }
}

function getRelativeTimeString(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * LeadDetail Component
 * 
 * Floating Detail Panel with dynamic navigation, inline editing, callbacks reminders scheduler,
 * dynamic custom field managers, and calls/notes history queries.
 */
export const LeadDetail = React.memo(({ 
  lead, 
  onClose, 
  onEdit, 
  leadsList = [], 
  onNavigate 
}: LeadDetailProps) => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'call' | 'note' | 'status_change'>('all');

  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(lead.name);
  const [editPhone, setEditPhone] = useState(lead.phone);
  const [editEmail, setEditEmail] = useState(lead.email || '');
  const [editSource, setEditSource] = useState(lead.source || 'Direct');
  const [editCustomFields, setEditCustomFields] = useState<Record<string, any>>(lead.custom_fields || {});

  // Follow-up reminder scheduler states
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');

  // Auto reset inline edits state when navigating to another lead record
  useEffect(() => {
    setEditName(lead.name);
    setEditPhone(lead.phone);
    setEditEmail(lead.email || '');
    setEditSource(lead.source || 'Direct');
    setEditCustomFields(lead.custom_fields || {});
    setIsEditing(false);
    setNewNoteText('');
    setShowReminderForm(false);
  }, [lead]);

  // Mutations and query hook integrations
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const createCallbackMutation = useCreateCallback();

  const { data: notesList = [], isLoading: isLoadingNotes } = useLeadNotes(lead.id, companyId);
  const createNoteMutation = useCreateLeadNote(lead.id, companyId);

  const { data: callsList = [], isLoading: isLoadingCalls } = useLeadCalls(lead.id, companyId);
  const { data: activitiesList = [], isLoading: isLoadingActivities } = useLeadActivity(lead.id, companyId);
  const { fields: customFieldDefinitions = [], isLoading: isLoadingCustomDefs } = useCustomFields();

  const handleStatusChange = (newStatus: LeadStatus) => {
    updateLead.mutate({ id: lead.id, data: { status: newStatus } });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    createNoteMutation.mutate({
      content: newNoteText,
      authorId: user?.uid || null,
      authorName: user?.email?.split('@')[0] || 'Admin',
    }, {
      onSuccess: () => {
        setNewNoteText('');
        toast.success('Note added successfully');
      }
    });
  };

  const handleSaveInlineEdit = () => {
    updateLead.mutate({
      id: lead.id,
      data: {
        name: editName,
        phone: editPhone,
        email: editEmail,
        source: editSource as any,
        custom_fields: editCustomFields,
      }
    }, {
      onSuccess: () => {
        setIsEditing(false);
        // Invalidate query to refresh lead details
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['pipelineLeads', companyId] });
      }
    });
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderDate) {
      toast.error('Please select a date and time');
      return;
    }
    if (!companyId) return;

    createCallbackMutation.mutate({
      companyId,
      leadId: lead.id,
      assignedTo: lead.assignedTo || null,
      reminderDate: new Date(reminderDate).toISOString(),
      notes: reminderNotes || null,
    }, {
      onSuccess: () => {
        setShowReminderForm(false);
        setReminderDate('');
        setReminderNotes('');

        // Post activity record to lead_activity_log for timeline display
        supabase
          .from('lead_activity_log')
          .insert({
            company_id: companyId,
            lead_id: lead.id,
            activity_type: 'reminder',
            description: `Follow-up reminder set for ${format(new Date(reminderDate), 'PPp')}`,
            created_at: new Date().toISOString()
          })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['leadActivity', lead.id] });
          });
      }
    });
  };

  const handleDelete = () => {
    deleteLead.mutate(lead.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      }
    });
  };

  // Navigations calculations
  const currentIndex = useMemo(() => leadsList.findIndex(l => l.id === lead.id), [leadsList, lead.id]);
  const hasPrev = leadsList.length > 0 && currentIndex > 0;
  const hasNext = leadsList.length > 0 && currentIndex !== -1 && currentIndex < leadsList.length - 1;

  const handlePrev = () => {
    if (hasPrev && onNavigate) {
      onNavigate(leadsList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate(leadsList[currentIndex + 1]);
    }
  };

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activitiesList;
    return activitiesList.filter(act => act.activity_type === activityFilter);
  }, [activitiesList, activityFilter]);

  const statusStyle = useMemo(() => getStatusBadgeStyle(lead.status), [lead.status]);

  return (
    <>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-y-4 right-4 w-full max-w-xl bg-white/95 backdrop-blur-3xl shadow-[0_0_80px_-15px_rgba(0,0,0,0.1)] z-[100] border border-slate-155 rounded-2xl flex flex-col overflow-hidden"
      >
        {/* Header Navigation & Close Actions */}
        <div className="relative p-6 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {leadsList.length > 0 && onNavigate && (
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button 
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black text-slate-400 uppercase px-1">
                  {currentIndex + 1} / {leadsList.length}
                </span>
                <button 
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none hover:bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={clsx(
                "p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center",
                isEditing ? "bg-brand-50 border-brand-200 text-brand-600" : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-900"
              )}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lead Profile Banner */}
        <div className="p-6 pb-2">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl shadow-brand-600/20 shrink-0">
              {((isEditing ? editName : lead.name) || '?').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-black font-display text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 w-full focus:outline-none focus:border-brand-500 bg-slate-50"
                  />
                ) : (
                  <h2 className="text-3xl font-black font-display text-slate-900 truncate">{lead.name || 'Anonymous Lead'}</h2>
                )}
              </div>
              
              <div className="flex items-center gap-3 mt-2">
                <div className={clsx("flex items-center rounded-full border shadow-sm px-3 py-1", statusStyle)}>
                  <select 
                    value={lead.status || LeadStatus.NEW}
                    onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                    className="text-[10px] font-black uppercase tracking-widest bg-transparent border-none p-0 pr-6 ring-0 focus:ring-0 cursor-pointer shadow-none"
                  >
                    {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                  />
                ) : (
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <Globe className="w-3 h-3" />
                    {lead.source || 'Direct'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tabs */}
        <div className="px-6 mt-2">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
            {(['overview', 'timeline', 'calls', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                  activeTab === tab 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Save edits banner if isEditing is active */}
                {isEditing && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700">You are in inline edit mode. Save your changes before continuing.</span>
                    <button 
                      onClick={handleSaveInlineEdit}
                      disabled={updateLead.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {updateLead.isPending ? <CallMindLoader size="xs" /> : <Save size={12} />}
                      Save
                    </button>
                  </div>
                )}

                {/* Set Follow-up Reminder Inline form */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Callbacks & Reminders</h3>
                    <button
                      onClick={() => setShowReminderForm(!showReminderForm)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <Bell size={12} />
                      {showReminderForm ? 'Cancel Reminder' : 'Set Reminder'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showReminderForm && (
                      <motion.form 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        onSubmit={handleCreateReminder} 
                        className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-3"
                      >
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reminder Time</label>
                          <input
                            type="datetime-local"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-brand-500 focus:outline-none rounded-xl p-2.5 text-xs font-bold text-slate-700"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Context Notes</label>
                          <textarea
                            placeholder="Add brief task instruction notes..."
                            value={reminderNotes}
                            onChange={(e) => setReminderNotes(e.target.value)}
                            rows={2}
                            className="bg-white border border-slate-200 focus:border-brand-500 focus:outline-none rounded-xl p-2.5 text-xs font-bold text-slate-700 resize-none custom-scrollbar"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={createCallbackMutation.isPending}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50"
                          >
                            Set Callback
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Contact Details</h3>
                  </div>
                  <div className="grid gap-3">
                    <div className="group flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:border-brand-200 transition-all">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <Phone className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Primary Phone</p>
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editPhone} 
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-brand-500 bg-slate-50 w-full"
                          />
                        ) : (
                          <p className="font-bold text-slate-900">{lead.phone || 'No Phone'}</p>
                        )}
                      </div>
                      {!isEditing && lead.phone && (
                        <a href={`tel:${lead.phone}`} className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-600/20 active:scale-95 transition-all">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="group flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:border-brand-200 transition-all">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Email Address</p>
                        {isEditing ? (
                          <input 
                            type="email" 
                            value={editEmail} 
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="font-bold text-slate-900 border border-slate-200 rounded-lg px-2 py-0.5 focus:outline-none focus:border-brand-500 bg-slate-50 w-full"
                          />
                        ) : (
                          <p className="font-bold text-slate-900 truncate max-w-[200px]">{lead.email || 'No email provided'}</p>
                        )}
                      </div>
                      {!isEditing && lead.email && (
                        <a href={`mailto:${lead.email}`} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lead Status</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 underline decoration-brand-200 underline-offset-4">
                        <MapPin className="w-3 h-3" /> Location
                      </p>
                      <p className="font-bold text-slate-700 capitalize">
                        {lead.city || 'Not Set'}, {lead.state || 'Not Set'}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 underline decoration-amber-200 underline-offset-4">
                        <User className="w-3 h-3" /> Assignment
                      </p>
                      <p className="font-bold text-slate-700">
                        {lead.assignedTo ? 'Agent assigned' : 'Unassigned Pool'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Custom Fields displays */}
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Custom Signal Fields</h3>
                  {isLoadingCustomDefs ? (
                    <CallMindLoader size="xs" text="Fetching custom definitions..." />
                  ) : customFieldDefinitions.length === 0 ? (
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">No custom schema fields defined yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {customFieldDefinitions.map((def) => {
                        const val = isEditing ? (editCustomFields[def.field_key] || '') : (lead.custom_fields?.[def.field_key] || 'Not Set');
                        return (
                          <div key={def.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 truncate">{def.field_label}</p>
                            {isEditing ? (
                              def.field_type === 'select' ? (
                                <select
                                  value={val}
                                  onChange={(e) => setEditCustomFields(prev => ({ ...prev, [def.field_key]: e.target.value }))}
                                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                                >
                                  <option value="">Select...</option>
                                  {(def.select_options || []).map((opt: string) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : def.field_type === 'boolean' ? (
                                <input
                                  type="checkbox"
                                  checked={!!val}
                                  onChange={(e) => setEditCustomFields(prev => ({ ...prev, [def.field_key]: e.target.checked }))}
                                  className="rounded border-slate-250 text-brand-600 focus:ring-0 cursor-pointer h-4 w-4"
                                />
                              ) : (
                                <input
                                  type={def.field_type === 'number' ? 'number' : 'text'}
                                  value={val}
                                  onChange={(e) => setEditCustomFields(prev => ({ ...prev, [def.field_key]: e.target.value }))}
                                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-brand-500"
                                />
                              )
                            ) : (
                              <p className="font-bold text-slate-700 truncate">{String(val)}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {lead.notes && (
                  <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Lead Context</h3>
                    <div className="p-4 bg-brand-50/30 border border-brand-100 rounded-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10">
                        <History className="w-12 h-12" />
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed italic">
                        "{lead.notes}"
                      </p>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Activity Stream</h3>
                  {/* Timeline Filter Controls */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner shrink-0 gap-0.5">
                    {(['all', 'call', 'note', 'status_change'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setActivityFilter(filter)}
                        className={clsx(
                          "px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all",
                          activityFilter === filter ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-650"
                        )}
                      >
                        {filter === 'status_change' ? 'Status' : filter}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingActivities ? (
                  <div className="flex justify-center py-10"><CallMindLoader size="sm" /></div>
                ) : filteredActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                    <History className="w-8 h-8 mb-2 text-slate-350" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No activities matched the filter.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l border-slate-100 space-y-6">
                    {filteredActivities.map((act) => (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full bg-white border-2 border-brand-500 flex items-center justify-center text-brand-600">
                          {act.activity_type === 'call' ? <Phone size={8} /> : act.activity_type === 'note' ? <MessageSquare size={8} /> : <History size={8} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{act.description}</p>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{getRelativeTimeString(act.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'calls' && (
              <motion.div
                key="calls"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Logged Call Logs</h3>
                {isLoadingCalls ? (
                  <div className="flex justify-center py-10"><CallMindLoader size="sm" /></div>
                ) : callsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                    <PhoneCall className="w-8 h-8 mb-2 text-slate-350" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No calls logged for this lead.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {callsList.map((call) => (
                      <div key={call.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Phone size={14} /></div>
                          <div>
                            <p className="text-xs font-black text-slate-800 uppercase">{call.outcome || 'Answered'}</p>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{call.timestamp ? getRelativeTimeString(call.timestamp) : 'N/A'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-600 uppercase tracking-wider">{call.is_ai_call ? 'AI Call' : 'Agent Call'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Log Notes</h3>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <textarea
                    placeholder="Type notes or call context logs..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-semibold bg-white border border-slate-200 focus:border-brand-300 rounded-xl p-3 focus:outline-none focus:ring-0 resize-none custom-scrollbar"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={createNoteMutation.isPending || !newNoteText.trim()}
                      className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/10 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {createNoteMutation.isPending ? <CallMindLoader size="xs" /> : <Send size={12} />}
                      Post Note
                    </button>
                  </div>
                </form>

                {/* Notes list */}
                {isLoadingNotes ? (
                  <div className="flex justify-center py-10"><CallMindLoader size="sm" /></div>
                ) : notesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                    <MessageSquare className="w-8 h-8 mb-2 text-slate-350" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No notes logged for this lead yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notesList.map((note) => (
                      <div key={note.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col gap-2 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">{note.author_name || 'Agent'}</span>
                          <span className="text-[8px] font-bold text-slate-400">{getRelativeTimeString(note.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed leading-normal">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-4 justify-between items-center">
          {isEditing ? (
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsEditing(false)}
                className="w-1/2 py-3 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInlineEdit}
                disabled={updateLead.isPending}
                className="w-1/2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {updateLead.isPending ? <CallMindLoader size="xs" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold uppercase tracking-wider text-xs shadow-sm hover:border-rose-300 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Move to Archive
            </button>
          )}
        </div>
      </motion.div>

      {/* ConfirmModal deletion overlay */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Move Lead to Archive"
        message="Are you sure you want to move this lead to archives? It will be flagged as deleted and removed from active list dashboards."
        confirmLabel="Archive"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
});

LeadDetail.displayName = 'LeadDetail';
export default LeadDetail;
