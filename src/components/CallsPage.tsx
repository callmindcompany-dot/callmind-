import React, { useState, useEffect } from 'react';
import { trackTrialEvent } from '@/utils/trialTracking';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed,
  Search,
  Filter,
  BrainCircuit,
  Clock,
  Calendar,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  Download,
  Trash2,
  Loader2
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { useCalls, Call, CallFilters } from '@/hooks/useCalls';
import { useAgents, AgentInfo } from '@/hooks/useAgents';
import { useCompany } from '@/CompanyContext';
import CallMindLoader from './CallMindLoader';
import { TrialLockOverlay } from './TrialLockOverlay';

interface CallbackPayload {
  leadId: string;
  leadName: string;
  phone: string;
  reminderDate: string;
  notes: string;
}

const CallItem = React.memo(({ 
  call, 
  selectedCall, 
  agents, 
  getStatusIcon, 
  getStatusBadge, 
  onSelect,
  isSelectedCheckbox,
  onToggleCheckbox
}: {
  call: Call;
  selectedCall: Call | null;
  agents: AgentInfo[];
  getStatusIcon: (status: string, type: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  onSelect: (call: Call) => void;
  isSelectedCheckbox: boolean;
  onToggleCheckbox: (e: React.MouseEvent) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onSelect(call)}
      className={`
        p-4 rounded-2xl border transition-all cursor-pointer group flex items-center gap-3
        ${selectedCall?.id === call.id 
          ? 'bg-brand-50 border-brand-200 shadow-sm' 
          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'}
      `}
    >
      {/* Checkbox for Bulk Actions */}
      <div 
        onClick={onToggleCheckbox}
        className="p-1 shrink-0 cursor-pointer"
      >
        <input 
          type="checkbox" 
          checked={isSelectedCheckbox}
          onChange={() => {}} // Controlled click parent handler handles selection
          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300"
        />
      </div>

      <div className="flex-1 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${call.status === 'missed' ? 'bg-red-50' : 'bg-gray-50'}`}>
            {getStatusIcon(call.status, call.type || 'outgoing')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 truncate max-w-[120px]">{call.leadName}</h3>
              {getStatusBadge(call.status)}
              {call.interest && (
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                  call.interest === 'Interested' ? 'bg-green-50 text-green-600 border-green-100' : 
                  call.interest === 'Not Interested' ? 'bg-red-50 text-red-600 border-red-100' : 
                  'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  {call.interest}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{call.phone}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 justify-end">
            <Clock size={12} />
            {call.duration}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="mt-2 flex items-center gap-1 justify-end">
            <div className="w-1 h-1 rounded-full bg-brand-400" />
            <p className="text-[9px] text-brand-600 font-black uppercase tracking-wider truncate max-w-[80px]">
              {agents.find((a) => a.email === call.createdBy)?.name?.split(' ')[0] || 'System'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
CallItem.displayName = 'CallItem';

export const CallsPage = ({ onBack, onTabChange }: { onBack?: () => void, onTabChange?: (tab: string) => void }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const [pageSize, setPageSize] = useState<number>(50);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Debounced Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('All Agents');
  const [selectedCallType, setSelectedCallType] = useState('All Types');
  const [selectedInterest, setSelectedInterest] = useState('All Interest');
  const [dateRange, setDateRange] = useState('Today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedCallIds, setSelectedCallIds] = useState<string[]>([]);

  // Fetch agents scoped by company id
  const { data: dbAgents } = useAgents(companyId);
  const agents: AgentInfo[] = React.useMemo(() => {
    const defaultAgents = [
      { email: 'bhargavi@example.com', name: 'Bhargavi Wagh' },
      { email: 'rohini@example.com', name: 'Rohini Shinde' },
      { email: 'chaitrali@example.com', name: 'Chaitrali Kulkarni' },
      { email: 'vashnavi@example.com', name: 'Vashnavi Shinde' }
    ];
    const userAgent = user?.email ? [{ email: user.email, name: `${user.displayName || user.email} (You)` }] : [];
    return [...userAgent, ...defaultAgents, ...(dbAgents || [])];
  }, [dbAgents, user]);

  // Query paginated calls
  const {
    data,
    isLoading,
    error
  } = useCalls({
    companyId,
    pageSize,
    page,
    filters: {
      agent: selectedAgent,
      type: selectedCallType,
      interest: selectedInterest,
      dateRange,
      customRange,
      search: searchQuery
    }
  });

  const calls = data?.calls || [];
  const total = data?.totalCount || 0;
  const totalPages = Math.ceil(total / pageSize);

  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  // Computed KPI statistics
  const stats = React.useMemo(() => ({
    total: calls.length,
    activeAgents: new Set(calls.map(c => c.createdBy)).size,
    avgDuration: calls.length > 0 
      ? (() => {
          const totalSecs = calls.reduce((acc, call) => {
            const mins = parseInt(call.duration?.match(/(\d+)m/)?.[1] || '0');
            const secs = parseInt(call.duration?.match(/(\d+)s/)?.[1] || '0');
            return acc + (mins * 60 + secs);
          }, 0);
          const avg = Math.floor(totalSecs / calls.length);
          return `${Math.floor(avg / 60)}m ${avg % 60}s`;
        })()
      : '0m 0s'
  }), [calls]);

  // Real AI Insights parser
  const aiInsights = React.useMemo((): string[] => {
    if (!selectedCall?.aiSummary) return [];
    // Parse key points from summary sentences
    const points = selectedCall.aiSummary
      .split(/[.\n]+/)
      .map(p => p.trim())
      .filter(p => p.length > 10);
    return points.length > 0 ? points : [];
  }, [selectedCall]);

  const getStatusBadge = React.useCallback((status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      missed: 'bg-red-50 text-red-600 border-red-100',
      busy: 'bg-orange-50 text-orange-600 border-orange-100',
      failed: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[status] || colors.failed}`}>{status}</span>;
  }, []);

  const getStatusIcon = React.useCallback((status: string, type: string) => {
    if (status === 'missed') return <PhoneMissed size={18} className="text-red-500" />;
    return type === 'incoming' ? <PhoneIncoming size={18} className="text-blue-500" /> : <PhoneOutgoing size={18} className="text-green-500" />;
  }, []);

  const handleWhatsAppRedirect = React.useCallback((phone: string | undefined | null, text: string) => {
    if (!phone) {
      toast.error('❌ Cannot launch WhatsApp: Contact does not have a registered phone number.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`❌ Invalid phone format ("${phone}"). Minimal 10 numeric digits are required.`);
      return;
    }
    if (!text || text.trim().length === 0) {
      toast.error('❌ Draft copy text is missing or blank.');
      return;
    }
    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, '_blank');
  }, []);

  // WhatsApp follow-up AI generator
  const generateAIDraft = React.useCallback(async (call: Call) => {
    if (!call) {
      toast.error("❌ No active call context selected.");
      return;
    }
    setIsGeneratingDraft(true);
    try {
      const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const targetName = call.leadName || 'Customer';
      const summaryContext = call.aiSummary || 'recent outbound inquiry discussion';
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Generate a friendly and polite Hinglish WhatsApp follow-up draft for ${targetName} built on this call summary: ${summaryContext}. Frame it to invite them to take a comfortable next action.`, 
          idToken,
          featureType: 'waDrafts',
          task: 'draft'
        })
      });
      const result = await response.json();
      if (response.ok && result.response) {
        setAiDraft(result.response);
        toast.success("AI draft prepared based on summary!");
        
        if (companyId && user?.uid) {
           trackTrialEvent(companyId, user.uid, 'ai_draft_sent', { aiDraftsCount: result.usage });
        }
      } else {
        toast.error(result.error || "Server rejected draft generation request.");
      }
    } catch (error) {
      console.error("Draft generation failed:", error);
      toast.error("Failed to generate AI draft due to connection or authorization issues.");
    } finally {
      setIsGeneratingDraft(false);
    }
  }, [user, companyId]);

  // Re-use Query client mutations for writes
  const callbackMutation = useMutation({
    mutationFn: async (payload: CallbackPayload) => {
      // 1. Update lead status in leads table scope
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'Call Back', updated_at: new Date().toISOString() })
        .eq('id', payload.leadId)
        .eq('company_id', companyId || '');
      
      if (leadError) throw leadError;

      // 2. Insert callback record
      const { error: callbackError } = await supabase
        .from('callbacks')
        .insert({
          id: crypto.randomUUID(),
          company_id: companyId || '',
          lead_id: payload.leadId,
          assigned_to: user?.email || '',
          reminder_date: payload.reminderDate,
          notes: payload.notes,
          status: 'Pending',
          created_at: new Date().toISOString()
        });

      if (callbackError) throw callbackError;

      // 3. Emit audit logs
      await supabase
        .from('audit_logs')
        .insert({
          id: crypto.randomUUID(),
          company_id: companyId || '',
          action: 'scheduler.manual.scheduled',
          category: 'Config',
          target: 'lead',
          target_id: payload.leadId,
          user_name: user?.displayName || user?.email || 'System',
          user_email: user?.email || '',
          details: `Manual follow-up callback scheduled for ${payload.leadName}`
        });
    },
    onSuccess: () => {
      toast.success('Follow-up scheduled successfully!');
      setShowFollowUpForm(false);
      setFollowUpDate('');
      setFollowUpTime('');
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: (err: unknown) => {
      console.error('[CallbackMutation] Failed:', err);
      toast.error('Failed to schedule follow-up.');
    }
  });

  const handleManualSchedule = async () => {
    if (!selectedCall) {
      toast.error('No call selected');
      return;
    }
    if (!followUpDate || !followUpTime) {
      toast.error('Please select date and time');
      return;
    }
    if (!companyId) {
      toast.error('Error: Company context is missing');
      return;
    }

    const scheduledDateTime = new Date(`${followUpDate}T${followUpTime}`);
    
    if (isNaN(scheduledDateTime.getTime())) {
      toast.error('Please enter a valid date and time');
      return;
    }

    if (scheduledDateTime < new Date()) {
      toast.error('Follow-up time cannot be in the past');
      return;
    }

    setIsScheduling(true);
    
    try {
      let matchedLeadId = selectedCall.id || '';
      const cleanPhone = selectedCall.phone ? selectedCall.phone.replace(/[\s\-()]/g, '') : '';
      
      if (cleanPhone) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('id')
          .eq('company_id', companyId)
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (leadData) {
          matchedLeadId = leadData.id;
        }
      }

      await callbackMutation.mutateAsync({
        leadId: matchedLeadId,
        leadName: selectedCall.leadName,
        phone: cleanPhone,
        reminderDate: scheduledDateTime.toISOString(),
        notes: 'Manual Override (S-08)'
      });
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsScheduling(false);
    }
  };

  // Log local manual call using Edge Function log-call
  const [showLogModal, setShowLogModal] = useState(false);
  const [newCall, setNewCall] = useState({
    leadName: '',
    phone: '',
    duration: '0m 0s',
    status: 'completed' as 'completed' | 'missed' | 'busy' | 'failed',
    type: 'outgoing' as 'incoming' | 'outgoing',
    interest: 'Pending' as string,
    aiSummary: '',
    scheduleFollowUp: false,
    followUpDate: '',
    followUpTime: ''
  });

  const handleLogManualCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = newCall.leadName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Please enter a valid Lead Name (at least 2 characters)');
      return;
    }
    
    const cleanPhone = newCall.phone.replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      toast.error('Please enter a valid phone number (at least 10 digits)');
      return;
    }

    if (!companyId) {
      toast.error('Error: Company context is missing.');
      return;
    }

    let followUpIso: string | null = null;
    if (newCall.scheduleFollowUp) {
      if (!newCall.followUpDate || !newCall.followUpTime) {
        toast.error('Please select follow-up date and time.');
        return;
      }
      const sched = new Date(`${newCall.followUpDate}T${newCall.followUpTime}`);
      if (isNaN(sched.getTime()) || sched < new Date()) {
        toast.error('Please select a valid future follow-up time.');
        return;
      }
      followUpIso = sched.toISOString();
    }

    toast.loading('Saving call log...', { id: 'manual-log' });

    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke<{ success: boolean; error?: string }>('log-call', {
        body: {
          companyId,
          userId: user?.id || user?.uid || '',
          leadName: trimmedName,
          phone: cleanPhone,
          duration: newCall.duration || '0m 0s',
          status: newCall.status,
          type: newCall.type,
          interest: newCall.interest,
          aiSummary: newCall.aiSummary || 'Manual call logged by agent.',
          scheduledTime: followUpIso
        }
      });

      if (edgeError) throw edgeError;

      if (edgeData) {
        if (edgeData.success) {
          toast.success('Call logged successfully!', { id: 'manual-log' });
          setShowLogModal(false);
          setNewCall({ 
            leadName: '', 
            phone: '', 
            duration: '0m 0s', 
            status: 'completed', 
            type: 'outgoing', 
            interest: 'Pending',
            aiSummary: '',
            scheduleFollowUp: false,
            followUpDate: '',
            followUpTime: ''
          });
          queryClient.invalidateQueries({ queryKey: ['calls'] });
        } else {
          toast.error(edgeData.error || 'Onboarding request failed.', { id: 'manual-log' });
        }
      }
    } catch (err: unknown) {
      console.error('[ManualLog] Failed:', err);
      toast.error('Failed to log call locally.', { id: 'manual-log' });
    }
  };

  // Bulk Actions
  const handleToggleCheckbox = (e: React.MouseEvent, callId: string) => {
    e.stopPropagation(); // Avoid triggering row inspect click
    setSelectedCallIds(prev => 
      prev.includes(callId) ? prev.filter(id => id !== callId) : [...prev, callId]
    );
  };

  const handleSelectAllOnPage = () => {
    if (selectedCallIds.length === calls.length) {
      setSelectedCallIds([]);
    } else {
      setSelectedCallIds(calls.map(c => c.id));
    }
  };

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('calls')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Selected call logs deleted.');
      setSelectedCallIds([]);
      setSelectedCall(null);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error('Failed to delete selected logs.');
    }
  });

  // Bulk Export CSV
  const handleBulkExportCSV = () => {
    const selectedLogs = calls.filter(c => selectedCallIds.includes(c.id));
    if (selectedLogs.length === 0) {
      toast.error('No calls selected for export.');
      return;
    }

    const headers = ['Timestamp', 'Lead Name', 'Phone', 'Duration', 'Type', 'Status', 'Interest', 'AI Summary'];
    
    const escapeCSVField = (val: string | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = selectedLogs.map(log => [
      escapeCSVField(new Date(log.created_at).toLocaleString()),
      escapeCSVField(log.leadName),
      escapeCSVField(log.phone),
      escapeCSVField(log.duration),
      escapeCSVField(log.type),
      escapeCSVField(log.status),
      escapeCSVField(log.interest),
      escapeCSVField(log.aiSummary)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `calls_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Selected logs exported to CSV!');
  };

  if (error) {
    toast.error('Error syncing call logs logs.');
  }

  return (
    <div className="flex flex-col gap-8 h-[calc(100vh-120px)] relative">
      <TrialLockOverlay />
      
      {/* Header with Glass Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-6 p-6 bg-white/50 backdrop-blur-xl border border-white/20 rounded-[2.5rem] shadow-xl shadow-gray-200/20">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-6 w-full md:w-auto">
          <button 
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (onTabChange) {
                onTabChange('Home');
                navigate('/dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
            className="p-3 bg-white text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-2xl transition-all shadow-sm border border-gray-100"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="h-10 w-px bg-gray-200 hidden sm:block" />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Filter size={14} className="text-gray-400" />
              <select 
                value={selectedAgent}
                onChange={e => { setSelectedAgent(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-sm font-black text-gray-700 outline-none cursor-pointer"
              >
                <option value="All Agents">All Agents</option>
                {agents.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <PhoneIncoming size={14} className="text-gray-400" />
              <select 
                value={selectedCallType}
                onChange={e => { setSelectedCallType(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-sm font-black text-gray-700 outline-none cursor-pointer"
              >
                <option value="All Types">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Sparkles size={14} className="text-gray-400" />
              <select 
                value={selectedInterest}
                onChange={e => { setSelectedInterest(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-sm font-black text-gray-700 outline-none cursor-pointer"
              >
                <option value="All Interest">All Interest</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <Calendar size={14} className="text-gray-400" />
              <select 
                value={dateRange}
                onChange={e => { setDateRange(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-sm font-black text-gray-700 outline-none cursor-pointer"
              >
                <option value="Today">Today</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'Custom' && (
              <div className="flex items-center gap-2 p-1 pl-3 bg-brand-50 rounded-2xl border border-brand-100 animate-in fade-in slide-in-from-left-2">
                <input 
                  type="date" 
                  value={customRange.start}
                  onChange={e => { setCustomRange({...customRange, start: e.target.value}); setPage(1); }}
                  className="bg-transparent border-none text-xs font-black text-brand-700 outline-none"
                />
                <span className="text-brand-300 font-black">→</span>
                <input 
                  type="date" 
                  value={customRange.end}
                  onChange={e => { setCustomRange({...customRange, end: e.target.value}); setPage(1); }}
                  className="bg-transparent border-none text-xs font-black text-brand-700 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setShowLogModal(true)}
          className="w-full md:w-auto px-8 py-3 bg-brand-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-brand-200 hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shrink-0"
        >
          <Phone className="animate-pulse" size={18} />
          Log Local Call
        </button>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
            <PhoneOutgoing size={24} />
          </div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Outcome</p>
          <h4 className="text-2xl font-black text-emerald-900">{total} Logs</h4>
        </div>
        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
            <PhoneIncoming size={24} />
          </div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Agent Active</p>
          <h4 className="text-2xl font-black text-blue-900">{stats.activeAgents} Active</h4>
        </div>
        <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
            <Clock size={24} />
          </div>
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Avg Talktime</p>
          <h4 className="text-2xl font-black text-orange-900">{stats.avgDuration}</h4>
        </div>
        <div className="bg-purple-50/50 p-6 rounded-[2rem] border border-purple-100 flex flex-col items-center justify-center text-center text-purple-900 font-bold">
           <BrainCircuit className="mb-2 text-purple-600" size={24} />
           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">AI Efficiency</p>
           <p className="text-2xl font-black">{stats.total > 0 ? '96%' : '0%'}</p>
        </div>
      </div>

      {/* Manual call logging modal */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl my-8"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="text-2xl font-bold text-gray-900">Log Manual Call</h2>
                <button onClick={() => setShowLogModal(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              </div>
              <form onSubmit={handleLogManualCall} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Lead Name</label>
                    <input 
                      required
                      type="text" 
                      value={newCall.leadName}
                      onChange={e => setNewCall({...newCall, leadName: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-semibold"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      value={newCall.phone}
                      onChange={e => setNewCall({...newCall, phone: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-mono font-semibold"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Call Duration</label>
                    <input 
                      type="text" 
                      value={newCall.duration}
                      onChange={e => setNewCall({...newCall, duration: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-semibold"
                      placeholder="e.g. 5m 20s"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Call Result</label>
                    <select 
                      value={newCall.status}
                      onChange={e => setNewCall({...newCall, status: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-bold text-gray-700"
                    >
                      <option value="completed">Completed</option>
                      <option value="missed">Missed</option>
                      <option value="busy">Busy</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Call Type</label>
                    <select 
                      value={newCall.type}
                      onChange={e => setNewCall({...newCall, type: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-bold text-gray-700"
                    >
                      <option value="outgoing">Outgoing</option>
                      <option value="incoming">Incoming</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Interest / Disposition</label>
                    <select 
                      value={newCall.interest}
                      onChange={e => setNewCall({...newCall, interest: e.target.value})}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-bold text-gray-700"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Interested">Interested</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">AI Summary / Notes</label>
                  <textarea 
                    rows={3}
                    value={newCall.aiSummary}
                    onChange={e => setNewCall({...newCall, aiSummary: e.target.value})}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all resize-none font-semibold text-gray-900"
                    placeholder="Describe the call outcome..."
                  />
                </div>

                {/* Optional follow up scheduler within log modal */}
                <div className="p-4 bg-brand-50/50 border border-brand-100 rounded-2xl space-y-3">
                  <label className="flex items-center gap-2 text-xs font-black text-brand-700 uppercase tracking-wider cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newCall.scheduleFollowUp}
                      onChange={e => setNewCall({...newCall, scheduleFollowUp: e.target.checked})}
                      className="rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                    />
                    <span>Schedule follow-up callback</span>
                  </label>

                  {newCall.scheduleFollowUp && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                      <input 
                        required
                        type="date" 
                        value={newCall.followUpDate}
                        onChange={e => setNewCall({...newCall, followUpDate: e.target.value})}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                      />
                      <input 
                        required
                        type="time" 
                        value={newCall.followUpTime}
                        onChange={e => setNewCall({...newCall, followUpTime: e.target.value})}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold"
                      />
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-100 transition-all">
                  Save Call Log
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
        {/* Call List */}
        <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Call Logs</h1>
              <p className="text-gray-500 text-sm">Review AI-summarized call history.</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {[50, 100, 500].map(size => (
                  <button
                    key={size}
                    onClick={() => { setPageSize(size); setPage(1); }}
                    className={`px-3 py-1.5 text-xs font-black transition-all ${
                      pageSize === size ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-brand-600'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-200 transition-all w-full"
                />
              </div>
            </div>
          </div>

          {/* Bulk actions row */}
          {calls.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs font-bold text-slate-300">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox"
                  checked={selectedCallIds.length === calls.length && calls.length > 0}
                  onChange={handleSelectAllOnPage}
                  className="rounded text-brand-600 focus:ring-brand-500 border-gray-300"
                />
                <span>Select All ({selectedCallIds.length} Selected)</span>
              </div>
              {selectedCallIds.length > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <button 
                    onClick={handleBulkExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold tracking-wide transition-all"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ${selectedCallIds.length} calls?`)) {
                        bulkDeleteMutation.mutate(selectedCallIds);
                      }
                    }}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold tracking-wide transition-all disabled:opacity-50"
                  >
                    {bulkDeleteMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="py-20 flex justify-center border border-gray-100 rounded-2xl bg-white">
                <CallMindLoader size="md" text="Loading calls..." />
              </div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 border border-gray-150 rounded-3xl bg-white shadow-sm">
                <Search size={48} className="mb-4 opacity-10" />
                <p className="font-bold">No call logs found</p>
                <p className="text-xs text-gray-400 mt-1">Try resetting search queries or workspace hubs.</p>
              </div>
            ) : (
              <>
                {calls.map((call) => (
                  <CallItem
                    key={call.id}
                    call={call}
                    selectedCall={selectedCall}
                    agents={agents}
                    getStatusIcon={getStatusIcon}
                    getStatusBadge={getStatusBadge}
                    onSelect={setSelectedCall}
                    isSelectedCheckbox={selectedCallIds.includes(call.id)}
                    onToggleCheckbox={(e) => handleToggleCheckbox(e, call.id)}
                  />
                ))}

                {/* Server-Side Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6 text-sm font-bold">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-gray-500 font-semibold">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                <div className="text-center py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Showing {calls.length} of {total} calls
                </div>
              </>
            )}
          </div>
        </div>

        {/* Call Details / AI Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden max-h-[80vh] lg:max-h-none">
          <AnimatePresence mode="wait">
            {selectedCall ? (
              <motion.div
                key={selectedCall.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-gray-50 shrink-0">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl">
                      {selectedCall.leadName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedCall.leadName}</h2>
                      <p className="text-sm text-gray-500">{selectedCall.phone}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleWhatsAppRedirect(selectedCall.phone, `Hi ${selectedCall.leadName}, connecting from CallMind hub regarding our recent discussion.`)}
                      className="flex items-center justify-center gap-2 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all"
                    >
                      <Phone size={16} />
                      WhatsApp
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all">
                      <Sparkles size={16} />
                      Action
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                  {/*
                    An <audio controls> player headed "Call Recording" sat here,
                    shown whenever selectedCall.recordingUrl was set.

                    CallMind does not record calls. The mobile app dials through
                    the phone's own SIM with `tel:` and hands off to the system
                    dialler, so it never has the audio; the privacy policy says
                    plainly that no call audio is recorded or stored; and the
                    site says the same in five places, including the footer's
                    "Zero Audio Storage".

                    Nothing has ever written calls.recording_url, so the player
                    never appeared -- but it was a working audio element waiting
                    for someone to fill the column, which would have made every
                    one of those statements false.
                  */}

                  {/* Post-Call Integration (S-08) */}
                  <section className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar size={18} className="text-brand-600" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Post-Call (S-08)</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => generateAIDraft(selectedCall)}
                          disabled={isGeneratingDraft}
                          className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1"
                        >
                          {isGeneratingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare size={12} />}
                          WA Draft
                        </button>
                        <button 
                          onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                          className="text-xs font-bold text-brand-600 hover:underline"
                        >
                          {showFollowUpForm ? 'Cancel' : 'Schedule Follow-up'}
                        </button>
                      </div>
                    </div>

                    {aiDraft && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl animate-in fade-in zoom-in-95">
                        <p className="text-[11px] text-green-800 italic mb-2">"{aiDraft}"</p>
                        <button 
                          onClick={() => handleWhatsAppRedirect(selectedCall.phone, aiDraft)}
                          className="w-full py-2 bg-green-600 text-white rounded-lg text-[10px] font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={14} />
                          Send via WhatsApp (Free)
                        </button>
                      </div>
                    )}

                    {showFollowUpForm ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Date</label>
                            <input 
                              type="date" 
                              value={followUpDate}
                              onChange={(e) => setFollowUpDate(e.target.value)}
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-200 font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Time</label>
                            <input 
                              type="time" 
                              value={followUpTime}
                              onChange={(e) => setFollowUpTime(e.target.value)}
                              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-200 font-semibold"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={handleManualSchedule}
                          disabled={isScheduling || callbackMutation.isPending}
                          className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition-all disabled:opacity-50"
                        >
                          {isScheduling || callbackMutation.isPending ? 'Scheduling...' : 'Confirm Follow-up'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 italic">No manual follow-up scheduled for this call yet.</p>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center gap-2 text-brand-600 mb-3">
                      <BrainCircuit size={18} />
                      <h3 className="font-bold text-sm uppercase tracking-wider">AI Summary</h3>
                    </div>
                    <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                      <p className="text-sm text-gray-700 leading-relaxed font-semibold">
                        {selectedCall.aiSummary || 'No summary available.'}
                      </p>
                    </div>
                  </section>

                  {/* Real Insights parsed from summary */}
                  <section>
                    <div className="flex items-center gap-2 text-gray-600 mb-3">
                      <Sparkles size={18} />
                      <h3 className="font-bold text-sm uppercase tracking-wider">Key Insights</h3>
                    </div>
                    {aiInsights.length === 0 ? (
                      <p className="text-xs text-gray-400 font-semibold italic">No insights available.</p>
                    ) : (
                      <ul className="space-y-3 font-semibold">
                        {aiInsights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <Phone size={40} className="opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Select a call</h3>
                <p className="text-sm mt-2">Click on any call log to view AI summary and insights.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
