import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  User, Shield, Settings, Database, Lock, Camera, 
  Smartphone, Key, FileText, Clock, CreditCard,
  Download, Trash2, HelpCircle,
  AlertTriangle, CheckCircle2,
  ChevronRight, ChevronLeft,
  AlertCircle, Zap, Users,
  Mail, Bell,
  ShieldCheck, Share2, RotateCcw, CheckSquare,
  Building2, Briefcase, Target, Phone,
  Trash, Eye, EyeOff, Bot, Save, X, Plus, CheckCircle,
  XCircle, PlayCircle, Edit3,
  ShieldAlert, RefreshCw, Activity,
  FileSpreadsheet, ChevronDown, Bug, Send,
  Sparkles, Copy
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { masterFounderEmail } from '@/constants';
import { motion, AnimatePresence } from 'framer-motion';
import CallMindLoader from './CallMindLoader';
import { CleanupWidget } from './CleanupWidget';
import { SubAdminManagementTab } from './SubAdminManagementTab';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { formatDistanceToNow } from 'date-fns';
import { CompanySettings, TeamSettings, BillingInfo } from '@/types/settings';
import { GeminiKeysManager } from './GeminiKeysManager';
import { checkChatRateLimit, SUPPORT_EMAIL } from '@/lib/aiGuardrail';

// --- Reusable UI Components ---

const Toggle = React.memo(({ 
  enabled, 
  onChange, 
  disabled = false, 
  label, 
  description 
}: { 
  enabled: boolean, 
  onChange: (val: boolean) => void, 
  disabled?: boolean,
  label?: string,
  description?: string
}) => (
  <div className="flex items-center justify-between group py-2 px-1 transition-all">
    {(label || description) && (
      <div className="flex flex-col max-w-[80%]">
        {label && <span className="text-sm font-medium text-slate-800">{label}</span>}
        {description && <span className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">{description}</span>}
      </div>
    )}
    <button
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      type="button"
      className={`
        relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 outline-none
        ${enabled ? 'bg-brand-600' : 'bg-slate-200'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <motion.span
        initial={false}
        animate={{ x: enabled ? 18 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
      />
    </button>
  </div>
));
Toggle.displayName = 'Toggle';

const SettingsCard = React.memo(({ 
  title, 
  icon: Icon, 
  children, 
  className = "",
  description,
  headerAction
}: { 
  title: React.ReactNode, 
  icon: any, 
  children: React.ReactNode, 
  className?: string,
  description?: string,
  headerAction?: React.ReactNode
}) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`}>
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-brand-50 text-brand-600 rounded-xl">
          <Icon size={20} />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h4>
          </div>
          {description && <p className="text-[13px] text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {headerAction}
        </AnimatePresence>
      </div>
    </div>
    <div className="space-y-5">
      {children}
    </div>
  </div>
));
SettingsCard.displayName = 'SettingsCard';

const FormField = React.memo(({ label, children, description, error }: any) => (
  <div className="space-y-1.5 w-full">
    <div className="flex flex-col">
      <label className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
      {description && <p className="text-[11px] text-slate-500 ml-1 leading-relaxed">{description}</p>}
    </div>
    <div className="w-full">
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1 ml-1"><AlertCircle size={12}/> {error}</p>}
    </div>
  </div>
));
FormField.displayName = 'FormField';

export const SettingsPage = () => {
  const { 
    user, 
    profile, 
    signOut, 
    updateProfile,
    isFounder,
    isGodMode
  } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = searchParams.get('tab') || 'profile';
  const [activeSection, setActiveSection] = useState(initialSection);

  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [companyBackup, setCompanyBackup] = useState<any>(null);
  
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [newStatus, setNewStatus] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [emailConfirmation, setEmailConfirmation] = useState('');

  // Twilio/API keys Reveal States
  const [revealTwilioToken, setRevealTwilioToken] = useState(false);
  const [revealApiKey, setRevealApiKey] = useState(false);
  const [revealWebhook, setRevealWebhook] = useState(false);

  // Help & Support State
  const [supportSubTab, setSupportSubTab] = useState<'faq' | 'ai-chat' | 'bug-report' | 'channels'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // AI Chatbot State & 24H Auto-Delete History
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am CallMind Support AI. How can I assist you with CallMind Web App today?' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [chatLockedUntil, setChatLockedUntil] = useState<number | null>(null);

  // Fetch 24-hour chat history & auto purge older messages
  useEffect(() => {
    if (!companyId) return;
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from('support_chat_history')
      .select('sender, message, created_at')
      .eq('company_id', companyId)
      .gte('created_at', cutoff24h)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setChatMessages(data.map(d => ({
            role: d.sender === 'user' ? 'user' : 'ai',
            text: d.message
          })));
        }
      });

    // Auto purge history older than 24 hours
    supabase
      .from('support_chat_history')
      .delete()
      .eq('company_id', companyId)
      .lt('created_at', cutoff24h)
      .then(() => {});
  }, [companyId]);

  // Bug Report Form State
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [bugAttachment, setBugAttachment] = useState<File | null>(null);
  const [isBugSubmitting, setIsBugSubmitting] = useState(false);
  const [bugTicketId, setBugTicketId] = useState('');
  const [isBugSubmitted, setIsBugSubmitted] = useState(false);

  const [settings, setSettings] = useState<any>({
    myProfile: { name: '', phone: '', companyName: '', designation: '' },
    company: {
      name: 'CallMind Demo App',
      category: 'Software & Technology',
      size: '1-10',
      email: masterFounderEmail,
      timezone: 'Asia/Kolkata',
      language: 'English (Global)',
      hours: { start: '09:00', end: '19:00' },
      logoUrl: '',
      intendedUserCount: 1,
      goals: [] as string[]
    },
    team: {
      requireApproval: true,
      deviceLimit: 2,
      seatRelease: 'retain',
      allowQr: true,
      allowCode: true,
      backgroundFetch: true,
      deltaSync: true,
    },
    leads: {
      statuses: ['New', 'In Progress', 'Closed', 'Hot', 'Cold'],
      assignment: 'manual',
      defaultStage: 'New',
      duplicateDetection: true,
      agingThreshold: 48,
      rottingThreshold: 120,
      followUpDuration: '30m',
      followUpReminder: '5m',
    },
    privacy: {
      phoneMasking: false,
      biometricReq: true,
      autoLock: 'off',
      exportPerms: false,
      maxDevices: 2,
      autoDeleteLeadsMonths: 0,
      autoDeleteCallsMonths: 0,
      twoFactorEnabled: false
    },
    ai: {
      enabled: true,
      waDrafts: true,
      waMeOnly: false,
      callingMethod: 'sim',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
      twilioAppSid: '',
      agentOverrides: {},
    },
    notifications: {
      newJoinRequest: true,
      seatsFull: true,
      overdueFollowup: true,
      importFail: true,
      syncFail: false,
      memberReminders: true,
      memberSnooze: false,
      reminderInterval: '5',
      emailNotifications: true,
      smsNotifications: true,
      whatsappNotifications: false
    },
    developer: {
      apiKey: 'cm_live_79a2bd8fbc09d846e',
      webhookUrl: 'https://api.callmind.ai/webhooks/inbound'
    }
  });

  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});

  // ----------------------------------------------------
  // React Query Fetch Queries
  // ----------------------------------------------------

  const { data: companyDbData } = useQuery({
    queryKey: ['companyData', companyId],
    queryFn: async (): Promise<CompanySettings | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const { data: teamSettingsDbData } = useQuery({
    queryKey: ['teamSettingsData', companyId],
    queryFn: async (): Promise<TeamSettings | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('team_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const { data: importLogsData } = useQuery({
    queryKey: ['importLogs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('import_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const { data: auditLogsData } = useQuery({
    queryKey: ['auditLogs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const { data: leadsCountDb } = useQuery({
    queryKey: ['leadsCount', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_deleted', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId
  });

  // Sync profile details
  useEffect(() => {
    if (profile) {
      setSettings((prev: any) => ({
        ...prev,
        myProfile: {
          name: profile.name || prev.myProfile.name || '',
          phone: profile.phoneNumber || prev.myProfile.phone || '',
          companyName: profile.companyName || prev.myProfile.companyName || '',
          designation: profile.designation || prev.myProfile.designation || '',
        }
      }));
    }
  }, [profile]);

  // Sync company query data
  useEffect(() => {
    if (companyDbData) {
      setSettings((prev: any) => ({
        ...prev,
        company: {
          ...prev.company,
          name: companyDbData.name || prev.company.name,
          category: companyDbData.industry || prev.company.category,
          size: companyDbData.size || prev.company.size,
          adminName: companyDbData.admin_name || prev.company.adminName,
          phone: companyDbData.phone || prev.company.phone,
          email: companyDbData.email || prev.company.email,
          timezone: companyDbData.timezone || prev.company.timezone,
          hours: {
            start: companyDbData.working_hours?.start || prev.company.hours.start,
            end: companyDbData.working_hours?.end || prev.company.hours.end
          },
          logoUrl: companyDbData.logo_url || prev.company.logoUrl || '',
          intendedUserCount: companyDbData.intended_user_count || prev.company.intendedUserCount,
          goals: companyDbData.goals || prev.company.goals || []
        }
      }));
    }
  }, [companyDbData]);

  // Sync team settings query data
  useEffect(() => {
    if (teamSettingsDbData) {
      const data = teamSettingsDbData;
      setSettings((prev: any) => ({
        ...prev,
        team: {
          ...prev.team,
          requireApproval: data.require_approval ?? prev.team.requireApproval,
          deviceLimit: data.device_limit ?? prev.team.deviceLimit,
          allowQr: data.allow_qr ?? prev.team.allowQr,
          allowCode: data.allow_code ?? prev.team.allowCode,
          backgroundFetch: data.background_fetch ?? prev.team.backgroundFetch,
          deltaSync: data.delta_sync ?? prev.team.deltaSync,
        },
        privacy: {
          ...prev.privacy,
          phoneMasking: data.hide_phone_numbers ?? prev.privacy.phoneMasking,
          autoLock: data.auto_lock || prev.privacy.autoLock,
          maxDevices: data.max_devices || prev.privacy.maxDevices,
          biometricReq: data.biometric_enforcement ?? prev.privacy.biometricReq,
          exportPerms: data.export_perms ?? prev.privacy.exportPerms,
          autoDeleteLeadsMonths: data.auto_delete_leads_months ?? 0,
          autoDeleteCallsMonths: data.auto_delete_calls_months ?? 0,
          twoFactorEnabled: data.two_factor_enabled ?? false
        },
        leads: {
          ...prev.leads,
          statuses: data.leads_statuses || prev.leads.statuses,
          assignment: data.assignment_mode || prev.leads.assignment,
          defaultStage: data.default_stage || prev.leads.defaultStage,
          agingThreshold: data.aging_threshold ?? prev.leads.agingThreshold,
          rottingThreshold: data.rotting_threshold ?? prev.leads.rottingThreshold,
          duplicateDetection: data.duplicate_detection ?? prev.leads.duplicateDetection,
          followUpDuration: data.follow_up_duration || prev.leads.followUpDuration,
          followUpReminder: data.follow_up_reminder || prev.leads.followUpReminder,
        },
        ai: {
          ...prev.ai,
          enabled: data.ai_enabled ?? prev.ai.enabled,
          waDrafts: data.ai_wa_drafts ?? prev.ai.waDrafts,
          waMeOnly: data.ai_wa_me_only ?? prev.ai.waMeOnly,
          callingMethod: data.calling_method || prev.ai.callingMethod,
          twilioAccountSid: data.twilio_config?.accountSid || '',
          twilioAuthToken: data.twilio_config?.authToken || '',
          twilioPhoneNumber: data.twilio_config?.phoneNumber || '',
          twilioAppSid: data.twilio_config?.appSid || '',
          agentOverrides: data.agent_overrides || {},
        },
        notifications: {
          ...prev.notifications,
          newJoinRequest: data.new_join_request ?? prev.notifications.newJoinRequest,
          syncFail: data.sync_fail ?? prev.notifications.syncFail,
          importFail: data.import_fail ?? prev.notifications.importFail,
          seatsFull: data.seats_full ?? prev.notifications.seatsFull,
          memberReminders: data.member_reminders ?? prev.notifications.memberReminders,
          overdueFollowup: data.overdue_followup ?? prev.notifications.overdueFollowup,
          memberSnooze: data.member_snooze ?? prev.notifications.memberSnooze,
          reminderInterval: data.reminder_interval || prev.notifications.reminderInterval,
          emailNotifications: data.email_notifications ?? prev.notifications.emailNotifications,
          smsNotifications: data.sms_notifications ?? prev.notifications.smsNotifications,
          whatsappNotifications: data.whatsapp_notifications ?? prev.notifications.whatsappNotifications,
        },
        developer: {
          apiKey: data.api_key || prev.developer.apiKey,
          webhookUrl: data.webhook_url || prev.developer.webhookUrl
        }
      }));
    }
  }, [teamSettingsDbData]);

  // ----------------------------------------------------
  // Unsaved Changes & Clean switching
  // ----------------------------------------------------

  const isSettingsDirty = useMemo(() => {
    if (!companyDbData) return false;
    const cleanCompany = {
      name: companyDbData.name || '',
      category: companyDbData.industry || '',
      size: companyDbData.size || '',
      adminName: companyDbData.admin_name || '',
      phone: companyDbData.phone || '',
      email: companyDbData.email || '',
      timezone: companyDbData.timezone || '',
      hours: {
        start: companyDbData.working_hours?.start || '09:00',
        end: companyDbData.working_hours?.end || '19:00'
      },
      logoUrl: companyDbData.logo_url || '',
      intendedUserCount: companyDbData.intended_user_count || 1,
      goals: companyDbData.goals || []
    };
    return JSON.stringify(cleanCompany) !== JSON.stringify(settings.company);
  }, [companyDbData, settings.company]);

  const handleSectionChange = (sectionId: string) => {
    if (isSettingsDirty) {
      if (!window.confirm('You have unsaved changes in Company Profile. Discard and switch tabs?')) {
        return;
      }
    }
    setActiveSection(sectionId);
    setSearchParams({ tab: sectionId }, { replace: true });
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeSection) {
      setActiveSection(tab);
    }
  }, [searchParams, activeSection]);

  // ----------------------------------------------------
  // Handler actions
  // ----------------------------------------------------

  const handleUpdatePrivacy = useCallback(async (field: string, value: any) => {
    if (!companyId) return;
    setSettings((prev: any) => ({
      ...prev,
      privacy: { ...prev.privacy, [field]: value }
    }));

    const fieldMap: Record<string, string> = {
      phoneMasking: 'hide_phone_numbers',
      autoLock: 'auto_lock',
      maxDevices: 'max_devices',
      biometricReq: 'biometric_enforcement',
      exportPerms: 'export_perms',
      autoDeleteLeadsMonths: 'auto_delete_leads_months',
      autoDeleteCallsMonths: 'auto_delete_calls_months',
      twoFactorEnabled: 'two_factor_enabled'
    };

    const dbField = fieldMap[field];
    if (dbField) {
      try {
        await supabase
          .from('team_settings')
          .update({ [dbField]: value, updated_at: new Date().toISOString() })
          .eq('company_id', companyId);
      } catch (err) {
        console.error('Privacy update failed:', err);
      }
    }
  }, [companyId]);

  const handleUpdateAi = useCallback(async (field: string, value: any) => {
    if (!companyId) return;
    setSettings((prev: any) => ({
      ...prev,
      ai: { ...prev.ai, [field]: value }
    }));

    const fieldMap: Record<string, string> = {
      enabled: 'ai_enabled',
      waDrafts: 'ai_wa_drafts',
      waMeOnly: 'ai_wa_me_only'
    };

    const dbField = fieldMap[field];
    if (dbField) {
      try {
        await supabase
          .from('team_settings')
          .update({ [dbField]: value, updated_at: new Date().toISOString() })
          .eq('company_id', companyId);
      } catch (err) {
        console.error('AI settings update failed:', err);
      }
    }
  }, [companyId]);

  const handleUpdateLeads = useCallback(async (field: string, value: any) => {
    if (!companyId) return;
    setSettings((prev: any) => ({
      ...prev,
      leads: { ...prev.leads, [field]: value }
    }));

    const fieldMap: Record<string, string> = {
      assignment: 'assignment_mode',
      defaultStage: 'default_stage',
      agingThreshold: 'aging_threshold',
      rottingThreshold: 'rotting_threshold',
      duplicateDetection: 'duplicate_detection',
      followUpDuration: 'follow_up_duration',
      followUpReminder: 'follow_up_reminder'
    };

    const dbField = fieldMap[field];
    if (dbField) {
      try {
        await supabase
          .from('team_settings')
          .update({ [dbField]: value, updated_at: new Date().toISOString() })
          .eq('company_id', companyId);
      } catch (err) {
        console.error('Leads config update failed:', err);
      }
    }
  }, [companyId]);

  const handleUpdateNotifications = useCallback(async (field: string, value: any) => {
    if (!companyId) return;
    setSettings((prev: any) => ({
      ...prev,
      notifications: { ...prev.notifications, [field]: value }
    }));

    const fieldMap: Record<string, string> = {
      newJoinRequest: 'new_join_request',
      seatsFull: 'seats_full',
      overdueFollowup: 'overdue_followup',
      importFail: 'import_fail',
      syncFail: 'sync_fail',
      memberReminders: 'member_reminders',
      memberSnooze: 'member_snooze',
      reminderInterval: 'reminder_interval',
      emailNotifications: 'email_notifications',
      smsNotifications: 'sms_notifications',
      whatsappNotifications: 'whatsapp_notifications'
    };

    const dbField = fieldMap[field];
    if (dbField) {
      try {
        await supabase
          .from('team_settings')
          .update({ [dbField]: value, updated_at: new Date().toISOString() })
          .eq('company_id', companyId);
      } catch (err) {
        console.error('Notifications config update failed:', err);
      }
    }
  }, [companyId]);

  const handleSaveAll = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsSaving(true);
      setSaveSuccessMsg(null);

      // Validate Profile details
      await updateProfile({
        name: settings.myProfile.name,
        phoneNumber: settings.myProfile.phone,
        companyName: settings.myProfile.companyName,
        designation: settings.myProfile.designation
      });

      // Validate Company fields
      let errors: Record<string, string> = {};
      if (!settings.company.name.trim()) errors.companyName = 'Company name is required';
      if (!settings.company.adminName.trim()) errors.adminName = 'Super Admin name is required';
      if (!settings.company.email.trim()) {
        errors.email = 'Support email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.company.email)) {
        errors.email = 'Invalid email format';
      }

      if (Object.keys(errors).length > 0) {
        setSettingsErrors(errors);
        toast.error('Validation failed. Please correct company parameters.');
        if (activeSection !== 'company') handleSectionChange('company');
        setIsSaving(false);
        return;
      }

      setSettingsErrors({});

      // 1. Write Company details to Supabase
      const { error: companyErr } = await supabase
        .from('companies')
        .update({
          name: settings.company.name,
          industry: settings.company.category,
          size: settings.company.size,
          admin_name: settings.company.adminName,
          phone: settings.company.phone,
          email: settings.company.email,
          timezone: settings.company.timezone,
          working_hours: {
            start: settings.company.hours.start,
            end: settings.company.hours.end
          },
          logo_url: settings.company.logoUrl,
          intended_user_count: settings.company.intendedUserCount,
          goals: settings.company.goals,
          updated_at: new Date().toISOString()
        })
        .eq('id', companyId);

      if (companyErr) throw companyErr;

      // 2. Write Team details to Supabase
      const { error: teamSettingsErr } = await supabase
        .from('team_settings')
        .update({
          require_approval: settings.team.requireApproval,
          device_limit: settings.team.deviceLimit,
          allow_qr: settings.team.allowQr,
          allow_code: settings.team.allowCode,
          background_fetch: settings.team.backgroundFetch,
          delta_sync: settings.team.deltaSync,
          hide_phone_numbers: settings.privacy.phoneMasking,
          auto_lock: settings.privacy.autoLock,
          max_devices: settings.privacy.maxDevices,
          biometric_enforcement: settings.privacy.biometricReq,
          export_perms: settings.privacy.exportPerms,
          leads_statuses: settings.leads.statuses,
          assignment_mode: settings.leads.assignment,
          default_stage: settings.leads.defaultStage,
          aging_threshold: settings.leads.agingThreshold,
          rotting_threshold: settings.leads.rottingThreshold,
          duplicate_detection: settings.leads.duplicateDetection,
          follow_up_duration: settings.leads.followUpDuration,
          follow_up_reminder: settings.leads.followUpReminder,
          ai_enabled: settings.ai.enabled,
          ai_wa_drafts: settings.ai.waDrafts,
          ai_wa_me_only: settings.ai.waMeOnly,
          calling_method: settings.ai.callingMethod,
          twilio_config: {
            accountSid: settings.ai.twilioAccountSid,
            authToken: settings.ai.twilioAuthToken,
            phoneNumber: settings.ai.twilioPhoneNumber,
            appSid: settings.ai.twilioAppSid
          },
          agent_overrides: settings.ai.agentOverrides,
          new_join_request: settings.notifications.newJoinRequest,
          sync_fail: settings.notifications.syncFail,
          import_fail: settings.notifications.importFail,
          seats_full: settings.notifications.seatsFull,
          member_reminders: settings.notifications.memberReminders,
          overdue_followup: settings.notifications.overdueFollowup,
          member_snooze: settings.notifications.memberSnooze,
          reminder_interval: settings.notifications.reminderInterval,
          email_notifications: settings.notifications.emailNotifications,
          sms_notifications: settings.notifications.smsNotifications,
          whatsapp_notifications: settings.notifications.whatsappNotifications,
          auto_delete_leads_months: settings.privacy.autoDeleteLeadsMonths,
          auto_delete_calls_months: settings.privacy.autoDeleteCallsMonths,
          two_factor_enabled: settings.privacy.twoFactorEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);

      if (teamSettingsErr) throw teamSettingsErr;

      queryClient.invalidateQueries({ queryKey: ['companyData', companyId] });
      queryClient.invalidateQueries({ queryKey: ['teamSettingsData', companyId] });

      setIsEditingCompany(false);
      setIsSaving(false);
      
      const timeStr = new Date().toLocaleTimeString();
      setSaveSuccessMsg(`Settings saved successfully at ${timeStr}`);
      toast.success('Workspace Settings Synchronized Successfully');
      setTimeout(() => setSaveSuccessMsg(null), 5000);

    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Synchronization failed');
      setIsSaving(false);
    }
  }, [companyId, settings, activeSection, updateProfile, queryClient]);

  const handleStatusManagement = useMemo(() => ({
    add: async (status: string) => {
      const clean = status.trim();
      if (!clean) return;
      if (settings.leads.statuses.includes(clean)) {
        toast.error("Pipeline stage already exists");
        return;
      }
      const newStatuses = [...settings.leads.statuses, clean];
      setSettings((prev: any) => ({
        ...prev,
        leads: { ...prev.leads, statuses: newStatuses }
      }));

      if (companyId) {
        try {
          const { error } = await supabase
            .from('team_settings')
            .update({ leads_statuses: newStatuses, updated_at: new Date().toISOString() })
            .eq('company_id', companyId);
          if (error) throw error;
          toast.success("Pipeline updated");
          setNewStatus('');
        } catch (err) {
          console.error(err);
          toast.error("Failed to sync pipeline stage");
        }
      }
    },
    remove: async (status: string) => {
      if (settings.leads.statuses.length <= 1) {
        toast.error("Must have at least one pipeline step");
        return;
      }
      const newStatuses = settings.leads.statuses.filter((s: string) => s !== status);
      setSettings((prev: any) => ({
        ...prev,
        leads: { ...prev.leads, statuses: newStatuses }
      }));

      if (companyId) {
        try {
          const { error } = await supabase
            .from('team_settings')
            .update({ leads_statuses: newStatuses, updated_at: new Date().toISOString() })
            .eq('company_id', companyId);
          if (error) throw error;
          toast.success("Pipeline stage removed");
        } catch (err) {
          console.error(err);
          toast.error("Failed to remove pipeline stage");
        }
      }
    }
  }), [companyId, settings.leads.statuses]);

  // ----------------------------------------------------
  // Security Policies Controls
  // ----------------------------------------------------

  const handleRemoteWipe = useCallback(async () => {
    if (!companyId) return;
    if (!window.confirm("This will wipe all data from all connected mobile devices. Continue?")) return;
    try {
      toast.loading("Executing Remote Wipe...", { id: 'remote-wipe' });
      await supabase
        .from('team_settings')
        .update({
          remote_wipe_triggered_at: new Date().toISOString(),
          tokens_revoked: true,
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);
      toast.success("Remote Wipe Instruction Transmitted", { id: 'remote-wipe' });
    } catch (e: any) {
      toast.error("Wipe failed: " + e.message, { id: 'remote-wipe' });
    }
  }, [companyId]);

  const handleForceLogout = useCallback(async () => {
    if (!companyId) return;
    if (!window.confirm("This will sign out all users except you. Continue?")) return;
    try {
      toast.loading("Logging out devices...", { id: 'force-logout' });
      await supabase
        .from('team_settings')
        .update({
          force_logout_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);
      toast.success("Global Logout Complete", { id: 'force-logout' });
    } catch (e: any) {
      toast.error("Failed to execute logout", { id: 'force-logout' });
    }
  }, [companyId]);

  const handleGlobalKillswitch = useCallback(async () => {
    if (!companyId) return;
    if (!window.confirm("This will lock down this organization and terminate ALL sessions. Continue?")) return;
    try {
      toast.loading("Activating Kill-switch...", { id: 'killswitch' });
      await supabase
        .from('companies')
        .update({ is_locked: true, locked_at: new Date().toISOString() })
        .eq('id', companyId);

      await supabase
        .from('team_settings')
        .update({
          force_logout_timestamp: new Date().toISOString(),
          kill_switch_activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('company_id', companyId);

      toast.success("Organization Locked. Terminating active sessions.", { id: 'killswitch' });
      setTimeout(async () => {
        await signOut();
        navigate('/login');
      }, 2000);
    } catch (e: any) {
      toast.error("Kill-switch execution failed: " + e.message, { id: 'killswitch' });
    }
  }, [companyId, signOut, navigate]);

  const handleToggleEditCompany = useCallback(() => {
    if (isEditingCompany) {
      if (companyBackup) {
        setSettings((prev: any) => ({ ...prev, company: { ...companyBackup } }));
      }
      setIsEditingCompany(false);
    } else {
      setCompanyBackup({ ...settings.company });
      setIsEditingCompany(true);
    }
  }, [isEditingCompany, companyBackup, settings.company]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;

      setPasswordData({ current: '', new: '', confirm: '' });
      setShowPass({ current: false, new: false, confirm: false });
      toast.success("Password updated successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordData]);

  // ----------------------------------------------------
  // Logo upload
  // ----------------------------------------------------

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const { error } = await supabase
          .from('companies')
          .update({ logo_url: base64String, updated_at: new Date().toISOString() })
          .eq('id', companyId);

        if (error) throw error;
        setSettings((prev: any) => ({
          ...prev,
          company: { ...prev.company, logoUrl: base64String }
        }));
        toast.success('Company logo updated successfully');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      toast.error('Logo upload failed: ' + err.message);
    } finally {
      setIsUploadingLogo(false);
    }
  }, [companyId]);

  const handleRemoveLogo = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsUploadingLogo(true);
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('id', companyId);

      if (error) throw error;
      setSettings((prev: any) => ({
        ...prev,
        company: { ...prev.company, logoUrl: '' }
      }));
      toast.success('Logo removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove logo');
    } finally {
      setIsUploadingLogo(false);
    }
  }, [companyId]);

  // ----------------------------------------------------
  // Permanent Account Deletion
  // ----------------------------------------------------

  const handleDeleteAccount = useCallback(async () => {
    if (!companyId || !user) return;
    try {
      setIsDeleting(true);

      // Delete leads
      await supabase.from('leads').delete().eq('company_id', companyId);
      // Delete calls
      await supabase.from('calls').delete().eq('company_id', companyId);
      // Delete audit logs
      await supabase.from('audit_logs').delete().eq('company_id', companyId);
      // Delete team settings
      await supabase.from('team_settings').delete().eq('company_id', companyId);
      // Delete company
      await supabase.from('companies').delete().eq('id', companyId);
      // Delete user profile
      await supabase.from('users').delete().eq('id', user.id || user.uid);

      toast.success("Workspace permanently deleted.");
      setIsDeleteModalOpen(false);
      navigate('/');
    } catch (error: any) {
      console.error("Critical Deletion Failed:", error);
      toast.error(error.message || "Deletion sequence failed.");
    } finally {
      setIsDeleting(false);
    }
  }, [companyId, user, navigate]);

  // ----------------------------------------------------
  // GDPR Data Download
  // ----------------------------------------------------

  const handleDownloadData = useCallback(async () => {
    if (!companyId || !user) return;
    try {
      setIsExporting(true);
      toast.loading('Preparing your data export...', { id: 'gdpr-export' });

      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id || user.uid);
      const { data: leadsData } = await supabase.from('leads').select('*').eq('company_id', companyId);
      const { data: callsData } = await supabase.from('calls').select('*').eq('company_id', companyId);

      const exportData = {
        meta: {
          exportDate: new Date().toISOString(),
          requestedBy: user.email,
          organizationId: companyId
        },
        profile: profileData || [],
        leads: leadsData || [],
        calls: callsData || []
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `callmind_gdpr_export_${companyId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Your GDPR export is ready.', { id: 'gdpr-export' });
    } catch (error: any) {
      console.error("GDPR Export Failed:", error);
      toast.error("Failed to generate data export.", { id: 'gdpr-export' });
    } finally {
      setIsExporting(false);
    }
  }, [companyId, user]);

  const handleMasterLeadAudit = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsExporting(true);
      toast.loading('Synthesizing Master Audit Logs...', { id: 'audit-export' });

      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_deleted', false);

      if (error) throw error;
      if (!leads || leads.length === 0) {
        toast.error('No lead records found.', { id: 'audit-export' });
        return;
      }

      const csv = Papa.unparse(leads);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `leads_export_${companyId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Successfully exported ${leads.length} records.`, { id: 'audit-export' });
    } catch (error: any) {
      toast.error('Export failed: ' + error.message, { id: 'audit-export' });
    } finally {
      setIsExporting(false);
    }
  }, [companyId]);

  // ----------------------------------------------------
  // Webhook and API key generation
  // ----------------------------------------------------

  const handleRegenerateApiKey = async () => {
    if (!companyId) return;
    if (!window.confirm("Generating a new API key will invalidate the current live key. Continue?")) return;

    try {
      const newKey = 'cm_live_' + Array.from({ length: 16 }, () => Math.random().toString(36)[2]).join('');
      const { error } = await supabase
        .from('team_settings')
        .update({ api_key: newKey, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);

      if (error) throw error;
      setSettings((prev: any) => ({
        ...prev,
        developer: { ...prev.developer, apiKey: newKey }
      }));
      toast.success("New API key generated successfully!");
    } catch (e: any) {
      toast.error("Failed to regenerate API key: " + e.message);
    }
  };

  // ----------------------------------------------------
  // Support ticket submission
  // ----------------------------------------------------

  const getBrowserAndOS = () => {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Browser";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
    else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Microsoft Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";

    if (ua.indexOf("Windows NT 10.0") > -1) os = "Windows 10/11";
    else if (ua.indexOf("Macintosh") > -1) os = "macOS";
    else if (ua.indexOf("iPhone") > -1) os = "iOS";
    else if (ua.indexOf("Android") > -1) os = "Android";
    else if (ua.indexOf("Linux") > -1) os = "Linux";

    return { browser, os };
  };

  const classifyPriorityBySentiment = (text: string): 'low' | 'medium' | 'high' => {
    const lower = text.toLowerCase();
    const urgent = ['broken', 'urgent', 'fail', 'error', 'crashed', 'bug', 'critical', 'immediately'];
    if (urgent.some(k => lower.includes(k))) return 'high';
    return 'medium';
  };

  const handleBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setIsBugSubmitting(true);
    try {
      const { browser, os } = getBrowserAndOS();
      const priority = classifyPriorityBySentiment(`${bugTitle} ${bugDescription}`);
      
      let attachmentUrl = null;
      if (bugAttachment) {
        const fileExt = bugAttachment.name.split('.').pop();
        const filePath = `${companyId}/bug_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, bugAttachment);

        if (uploadError) {
          console.warn("Storage upload failed, proceeding without attachment:", uploadError);
        } else {
          const { data } = supabase.storage.from('support-attachments').getPublicUrl(filePath);
          attachmentUrl = data.publicUrl;
        }
      }

      const payload: any = {
        title: bugTitle,
        description: bugDescription,
        steps: bugSteps,
        status: 'open',
        priority,
        client_health_score: 95,
        user_email: user?.email || '',
        user_name: profile?.name || '',
        user_designation: profile?.designation || '',
        user_phone: profile?.phoneNumber || '',
        company_name: settings.company.name,
        company_id: companyId,
        os_info: os,
        browser_info: browser,
        network_latency: '15ms',
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('support_tickets')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setBugTicketId(`ENG-${data.id.toString().substring(0, 6).toUpperCase()}-QA`);
      setIsBugSubmitted(true);
      setBugAttachment(null);
      toast.success("Bug ticket submitted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to submit bug ticket: " + err.message);
    } finally {
      setIsBugSubmitting(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isAiTyping || !companyId) return;

    const now = Date.now();
    if (chatLockedUntil && now < chatLockedUntil) {
      const remainingSecs = Math.ceil((chatLockedUntil - now) / 1000);
      toast.error(`🔒 Chat temporarily locked for spam protection. Retry in ${remainingSecs}s or contact ${SUPPORT_EMAIL}`);
      return;
    }

    // Anti-Spam Rate Limit Check (5 msgs / minute)
    const rateCheck = checkChatRateLimit(user?.id || companyId || 'guest');
    if (rateCheck.isSpamming && rateCheck.lockedUntil) {
      setChatLockedUntil(rateCheck.lockedUntil);
      toast.error(`🔒 Frequent messages detected! Chatbot paused for 5 minutes. Contact support: ${SUPPORT_EMAIL}`);
      return;
    }

    const msg = chatMessage;
    setChatMessage('');
    
    // Save user message to database history
    await supabase.from('support_chat_history').insert({
      company_id: companyId,
      sender: 'user',
      message: msg,
      created_at: new Date().toISOString()
    });

    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsAiTyping(true);

    try {
      const idToken = user && typeof user.getIdToken === 'function' ? await user.getIdToken() : null;
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: msg, idToken, task: 'chat' })
      });
      const data = await response.json();
      const aiText = response.ok && data.response 
        ? data.response 
        : (data.error || "I am CallMind AI, specialized strictly in CRM sales, lead follow-ups, telecalling insights, and customer communication.");

      await supabase.from('support_chat_history').insert({
        company_id: companyId,
        sender: 'ai',
        message: aiText,
        created_at: new Date().toISOString()
      });

      setChatMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch {
      const aiText = "I'm having trouble connecting to AI services right now. A support assistant will review this shortly.";
      setChatMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // ----------------------------------------------------
  // Render Modules Switch Cases
  // ----------------------------------------------------

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="My Personal Profile" icon={User} description="Manage your identity and direct administrative contact parameters.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField label="Full Name" description="Used for activity logs and signature traces.">
                  <div className="relative">
                     <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       value={settings.myProfile.name} 
                       onChange={(e) => setSettings((prev: any) => ({...prev, myProfile: {...prev.myProfile, name: e.target.value}}))} 
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-xl text-sm font-medium text-slate-900 outline-none transition-all" 
                       placeholder="e.g. John Doe"
                     />
                  </div>
                </FormField>
                <FormField label="Contact Number" description="Mobile number for direct system notifications.">
                  <div className="relative">
                     <Smartphone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="tel" 
                       value={settings.myProfile.phone} 
                       onChange={(e) => setSettings((prev: any) => ({...prev, myProfile: {...prev.myProfile, phone: e.target.value}}))} 
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-xl text-sm font-medium text-slate-900 outline-none transition-all" 
                     />
                  </div>
                </FormField>
                <FormField label="Designation" description="Your functional role inside the business core.">
                  <div className="relative">
                     <Briefcase size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       value={settings.myProfile.designation} 
                       onChange={(e) => setSettings((prev: any) => ({...prev, myProfile: {...prev.myProfile, designation: e.target.value}}))} 
                       className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-xl text-sm font-medium text-slate-900 outline-none transition-all" 
                     />
                  </div>
                </FormField>
                <FormField label="Email Nexus" description="Your primary login identifier (fixed).">
                   <div className="relative">
                      <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-50 rounded-xl text-sm font-medium text-slate-400 outline-none cursor-not-allowed" 
                      />
                   </div>
                </FormField>
              </div>
            </SettingsCard>
          </div>
        );

      case 'company':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard 
              title={
                <div className="flex items-center gap-3">
                  Corporate Identity
                  {isEditingCompany && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Editing...
                    </motion.span>
                  )}
                </div>
              }
              icon={Building2} 
              description="Define your organization's core branding, operational hours, and timezone index."
              headerAction={
                !isEditingCompany ? (
                  <motion.button 
                    key="edit-btn"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={handleToggleEditCompany}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all active:scale-95 shadow-lg shadow-brand-200"
                  >
                    <Edit3 size={14} />
                    Edit Profile
                  </motion.button>
                ) : (
                  <motion.div 
                    key="save-cancel-btns"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-3"
                  >
                    <button 
                      onClick={handleToggleEditCompany}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveAll}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                    >
                      {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                      Save Changes
                    </button>
                  </motion.div>
                )
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <FormField label="Legal Company Name" description="Populates outbound PDF charts & audits." error={settingsErrors.companyName}>
                     <input 
                       type="text" 
                       value={settings.company.name} 
                       onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, name: e.target.value}}))}
                       disabled={!isEditingCompany}
                       className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`} 
                     />
                  </FormField>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Industry Vertical">
                      <input 
                        type="text" 
                        value={settings.company.category} 
                        onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, category: e.target.value}}))}
                        disabled={!isEditingCompany}
                        className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`} 
                      />
                    </FormField>
                    <FormField label="Company Size">
                      <select 
                        value={settings.company.size}
                        onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, size: e.target.value}}))}
                        disabled={!isEditingCompany}
                        className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`}
                      >
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201+">201+ employees</option>
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Workspace Timezone">
                      <select 
                        value={settings.company.timezone}
                        onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, timezone: e.target.value}}))}
                        disabled={!isEditingCompany}
                        className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`}
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                        <option value="US/Eastern">US/Eastern (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </FormField>
                    <FormField label="Planned Seats">
                      <input 
                        type="number" 
                        value={settings.company.intendedUserCount} 
                        onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, intendedUserCount: parseInt(e.target.value, 10)}}))}
                        disabled={!isEditingCompany}
                        className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`} 
                      />
                    </FormField>
                  </div>
                </div>

                <div className="space-y-6">
                  <FormField label="Support / Billing Email" error={settingsErrors.email}>
                    <input 
                      type="email" 
                      value={settings.company.email} 
                      onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, email: e.target.value}}))}
                      disabled={!isEditingCompany}
                      className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`} 
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Working Hours Start">
                      <input 
                        type="time" 
                        value={settings.company.hours.start} 
                        onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, hours: {...prev.company.hours, start: e.target.value}}}))}
                        disabled={!isEditingCompany}
                        className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`} 
                      />
                    </FormField>
                    <FormField label="Working Hours End">
                      <input 
                        type="time" 
                        value={settings.company.hours.end} 
                        onChange={(e) => setSettings((prev: any) => ({...prev, company: {...prev.company, hours: {...prev.company.hours, end: e.target.value}}}))}
                        disabled={!isEditingCompany}
                        className={`w-full p-4 border rounded-2xl text-sm font-bold outline-none transition-all ${!isEditingCompany ? 'bg-gray-50 border-transparent text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 focus:border-brand-500'}`} 
                      />
                    </FormField>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 ml-1 mb-2">Onboarding Goals</label>
                    <div className="flex flex-wrap gap-1.5">
                      {settings.company.goals.length > 0 ? (
                        settings.company.goals.map((g: string) => (
                          <span key={g} className="px-2.5 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">No goals defined</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden">
                    {settings.company.logoUrl ? <img src={settings.company.logoUrl} className="w-full h-full object-cover" /> : <Building2 size={24} className="text-slate-300" />}
                  </div>
                  <div>
                    <h6 className="text-sm font-bold text-slate-900">Virtual Branding Nexus</h6>
                    <p className="text-xs text-slate-500">Workspace Identity ID: <span className="font-mono text-brand-600">CALLMIND_{companyId?.slice(0, 6).toUpperCase()}</span></p>
                  </div>
                </div>
                {isEditingCompany && (
                  <div className="flex items-center gap-4">
                    <button onClick={handleRemoveLogo} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash size={18} /></button>
                    <label className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95 shadow-md">
                      <Camera size={16} />
                      Replace Logo
                      <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                    </label>
                  </div>
                )}
              </div>
            </SettingsCard>
          </div>
        );

      case 'leads':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="Sales Intelligence & Flow" icon={Target} description="Optimize your lead distribution, aging thresholds, and pipeline stages.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <FormField label="Distribution Architecture" description="Determines how incoming traffic is allocated to members.">
                    <select 
                      value={settings.leads.assignment}
                      onChange={(e) => handleUpdateLeads('assignment', e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
                    >
                       <option value="manual">Manual Allocation (Admin Controlled)</option>
                       <option value="round_robin">Round Robin (Sequential Looping)</option>
                       <option value="pool">Shared Pool (First-Claim Architecture)</option>
                    </select>
                  </FormField>

                  <FormField label="Default Pipeline Landing Stage" description="New leads will automatically be assigned to this stage.">
                    <select 
                      value={settings.leads.defaultStage}
                      onChange={(e) => handleUpdateLeads('defaultStage', e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
                    >
                      {settings.leads.statuses.map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </FormField>

                  <div className="space-y-6">
                    <h6 className="text-xs font-black uppercase tracking-widest text-slate-400">Aging & Decay Protocols</h6>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Aging (Hrs)" description="Threshold for 'Stale' warning">
                        <input 
                          type="number" 
                          value={settings.leads.agingThreshold} 
                          onChange={(e) => handleUpdateLeads('agingThreshold', parseInt(e.target.value, 10))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all" 
                        />
                      </FormField>
                      <FormField label="Rotting (Hrs)" description="Time before 'Dead' status">
                        <input 
                          type="number" 
                          value={settings.leads.rottingThreshold} 
                          onChange={(e) => handleUpdateLeads('rottingThreshold', parseInt(e.target.value, 10))}
                          className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all" 
                        />
                      </FormField>
                    </div>
                  </div>

                  <Toggle 
                    label="Active Duplicate Filtering" 
                    description="Prevent cross-contact duplicates within the database."
                    enabled={settings.leads.duplicateDetection}
                    onChange={(v) => handleUpdateLeads('duplicateDetection', v)}
                  />
                </div>

                <div className="space-y-6">
                  <h6 className="text-xs font-black uppercase tracking-widest text-slate-400">Pipeline Stages</h6>
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 font-display">Workflow Steps</span>
                      <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded uppercase">{settings.leads.statuses.length} STEPS</span>
                    </div>
                    <div className="space-y-2">
                      {settings.leads.statuses.map((status: string, i: number) => (
                        <div key={status} className="p-3.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                          <span className="text-xs font-bold text-slate-800">{i + 1}. {status}</span>
                          <button onClick={() => handleStatusManagement.remove(status)} className="p-1 text-slate-300 hover:text-red-500"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        placeholder="New step name..."
                        className="flex-1 p-3 bg-white border border-slate-100 rounded-xl text-xs outline-none"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleStatusManagement.add(newStatus); }}
                      />
                      <button onClick={() => handleStatusManagement.add(newStatus)} className="px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1">
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="Privacy & Security" icon={ShieldCheck} description="Manage masking, password changes, data retention, and MFA.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Toggle 
                    label="Lead Contact Masking" 
                    description="Hide phone numbers/emails from mobile agents."
                    enabled={settings.privacy.phoneMasking}
                    onChange={(v) => handleUpdatePrivacy('phoneMasking', v)}
                  />
                  <Toggle 
                    label="Biometric Enforcement" 
                    description="Require Fingerprint/FaceID lock on mobile app launch."
                    enabled={settings.privacy.biometricReq}
                    onChange={(v) => handleUpdatePrivacy('biometricReq', v)}
                  />

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display">Data Retention Policies</h6>
                    <FormField label="Auto-delete leads older than">
                      <select 
                        value={settings.privacy.autoDeleteLeadsMonths}
                        onChange={(e) => handleUpdatePrivacy('autoDeleteLeadsMonths', parseInt(e.target.value, 10))}
                        className="w-full p-3.5 bg-white border border-slate-100 rounded-xl text-xs font-bold"
                      >
                        <option value={0}>Never Delete</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                      </select>
                    </FormField>
                    <FormField label="Auto-delete call logs older than">
                      <select 
                        value={settings.privacy.autoDeleteCallsMonths}
                        onChange={(e) => handleUpdatePrivacy('autoDeleteCallsMonths', parseInt(e.target.value, 10))}
                        className="w-full p-3.5 bg-white border border-slate-100 rounded-xl text-xs font-bold"
                      >
                        <option value={0}>Never Delete</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months</option>
                      </select>
                    </FormField>
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display">Two-Factor Authentication</h6>
                        <p className="text-[10px] text-slate-400 font-medium">Protect workspace with second-factor security codes</p>
                      </div>
                      <Toggle 
                        enabled={settings.privacy.twoFactorEnabled}
                        onChange={(v) => handleUpdatePrivacy('twoFactorEnabled', v)}
                      />
                    </div>
                    {settings.privacy.twoFactorEnabled && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-[9px] font-black uppercase rounded-full">Coming Soon</span>
                        <span className="text-[10px] text-blue-700 font-semibold">Supabase MFA setups will display QR scanning sequences shortly.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h6 className="text-xs font-black uppercase tracking-widest text-slate-400">Update Credentials</h6>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <FormField label="New Password">
                      <input 
                        type="password" 
                        required
                        value={passwordData.new} 
                        onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-xl text-sm" 
                        placeholder="Min 8 characters"
                      />
                    </FormField>
                    <FormField label="Confirm Password">
                      <input 
                        type="password" 
                        required
                        value={passwordData.confirm} 
                        onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                        className="w-full p-4 bg-slate-50 border border-slate-100 focus:bg-white focus:border-brand-500 rounded-xl text-sm" 
                        placeholder="Re-type password"
                      />
                    </FormField>
                    <button type="submit" disabled={isChangingPassword} className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            </SettingsCard>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GeminiKeysManager />

            <SettingsCard title="AI Chatbot & Communications" icon={Bot} description="Configure Twilio and WhatsApp auto-draft sequences.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Toggle 
                    label="WhatsApp Draft Assistant" 
                    description="Generate context-based follow-up drafts for agents."
                    enabled={settings.ai.waDrafts}
                    onChange={(v) => handleUpdateAi('waDrafts', v)}
                  />
                  <Toggle 
                    label="Personal Templates only" 
                    description="Limit draft generation to agent-defined templates."
                    enabled={settings.ai.waMeOnly}
                    onChange={(v) => handleUpdateAi('waMeOnly', v)}
                  />

                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display">Twilio API Configuration</h6>
                    <FormField label="Twilio Account SID">
                      <input 
                        type="text"
                        value={settings.ai.twilioAccountSid}
                        onChange={(e) => setSettings((prev: any) => ({...prev, ai: {...prev.ai, twilioAccountSid: e.target.value}}))}
                        className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-mono" 
                      />
                    </FormField>
                    <FormField label="Twilio Auth Token">
                      <div className="relative">
                        <input 
                          type={revealTwilioToken ? "text" : "password"}
                          value={settings.ai.twilioAuthToken}
                          onChange={(e) => setSettings((prev: any) => ({...prev, ai: {...prev.ai, twilioAuthToken: e.target.value}}))}
                          className="w-full pl-3 pr-10 py-3 bg-white border border-slate-100 rounded-xl text-xs font-mono" 
                        />
                        <button 
                          type="button"
                          onClick={() => setRevealTwilioToken(!revealTwilioToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {revealTwilioToken ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </FormField>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>
        );

      case 'sync':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="Data Sync & Backups" icon={Database} description="Download data snapshots, export leads audit sheet, and trigger syncs.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                  <h6 className="text-sm font-bold text-slate-900">GDPR Organizational Export</h6>
                  <p className="text-xs text-slate-500">Download complete metadata parameters, user profile setups, and lead databases in JSON.</p>
                  <button onClick={handleDownloadData} className="px-5 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl">
                    Download JSON Data
                  </button>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                  <h6 className="text-sm font-bold text-slate-900">CSV Leads Spreadsheet Export</h6>
                  <p className="text-xs text-slate-500">Generate a unified CSV report containing all non-deleted database leads.</p>
                  <button onClick={handleMasterLeadAudit} className="px-5 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl">
                    Export Leads CSV
                  </button>
                </div>
              </div>
            </SettingsCard>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="Alerts & Notification Nexus" icon={Bell} description="Configure email and notification alerts for operational triggers.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <Toggle 
                    label="New Join Request Alerts" 
                    description="Nudge when a new telecaller requests to join company ID."
                    enabled={settings.notifications.newJoinRequest}
                    onChange={(v) => handleUpdateNotifications('newJoinRequest', v)}
                  />
                  <Toggle 
                    label="Seat Limits Notification" 
                    description="Alert when subscription seat quota is completely filled."
                    enabled={settings.notifications.seatsFull}
                    onChange={(v) => handleUpdateNotifications('seatsFull', v)}
                  />

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                    <h6 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display">Active Alert Channels</h6>
                    <Toggle 
                      label="Email Notifications" 
                      enabled={settings.notifications.emailNotifications}
                      onChange={(v) => handleUpdateNotifications('emailNotifications', v)}
                    />
                    <Toggle 
                      label="SMS Notifications" 
                      enabled={settings.notifications.smsNotifications}
                      onChange={(v) => handleUpdateNotifications('smsNotifications', v)}
                    />
                    <Toggle 
                      label="WhatsApp Notifications" 
                      enabled={settings.notifications.whatsappNotifications}
                      onChange={(v) => handleUpdateNotifications('whatsappNotifications', v)}
                    />
                  </div>
                </div>
              </div>
            </SettingsCard>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="Subscription & Billing Hub" icon={CreditCard} description="Manage workspace plan allocations and billing renewals.">
              <div className="max-w-md bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded">Active Workspace</span>
                <h4 className="text-2xl font-black mt-2 font-display">CallMind Growth Plan</h4>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs font-semibold">
                  <div>
                    <span className="block text-[10px] text-white/60">Seats Allocated</span>
                    <span className="text-base font-black">5 / 10 seats</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-white/60">Next Invoice Date</span>
                    <span className="text-base font-black">August 12, 2026</span>
                  </div>
                </div>
                <button onClick={() => navigate('/dashboard/billing')} className="mt-6 w-full py-3 bg-white text-brand-700 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg">
                  Manage Subscriptions
                </button>
              </div>
            </SettingsCard>
          </div>
        );

      case 'api_keys':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsCard title="API & Webhook Integrations" icon={Settings} description="Generate and rotate developer keys for external CRMs.">
              <div className="space-y-5">
                <FormField label="Production Live Key" description="Exposes CRM inbound lead pipelines.">
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type={revealApiKey ? "text" : "password"} 
                        value={settings.developer.apiKey} 
                        readOnly 
                        className="w-full pl-3 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => setRevealApiKey(!revealApiKey)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {revealApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button onClick={() => copyToClipboard(settings.developer.apiKey)} className="p-3.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200"><Copy size={14} /></button>
                    <button onClick={handleRegenerateApiKey} className="px-4 bg-slate-900 text-white rounded-xl text-xs font-bold">Regenerate</button>
                  </div>
                </FormField>

                <FormField label="Inbound Webhook Url">
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type={revealWebhook ? "text" : "password"} 
                        value={settings.developer.webhookUrl} 
                        readOnly 
                        className="w-full pl-3 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => setRevealWebhook(!revealWebhook)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {revealWebhook ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <button onClick={() => copyToClipboard(settings.developer.webhookUrl)} className="p-3.5 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200"><Copy size={14} /></button>
                  </div>
                </FormField>
              </div>
            </SettingsCard>
          </div>
        );

      case 'support':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-max">
              <button onClick={() => setSupportSubTab('faq')} className={`px-4 py-2 text-xs font-bold rounded-lg ${supportSubTab === 'faq' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>FAQ</button>
              <button onClick={() => setSupportSubTab('ai-chat')} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 ${supportSubTab === 'ai-chat' ? 'bg-white shadow text-violet-600' : 'text-slate-500 hover:text-slate-800'}`}>
                <Bot size={14} />
                AI Support Assistant
              </button>
              <button onClick={() => setSupportSubTab('bug-report')} className={`px-4 py-2 text-xs font-bold rounded-lg ${supportSubTab === 'bug-report' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>Report Bug</button>
            </div>

            {supportSubTab === 'faq' && (
              <SettingsCard title="FAQs" icon={HelpCircle}>
                <div className="space-y-2">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-800">How do I setup twilio VoIP?</p>
                    <p className="text-xs text-slate-500 mt-1">Insert Account SID in Communications tab, deploy credentials, and assign active lines to telecallers.</p>
                  </div>
                </div>
              </SettingsCard>
            )}

            {supportSubTab === 'ai-chat' && (
              <SettingsCard title="AI Support Assistant" icon={Bot} description="Get instant answers regarding CallMind CRM workflows, telecalling setups, and features.">
                <div className="space-y-4">
                  <div className="h-80 overflow-y-auto custom-scrollbar p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                          <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg shrink-0 mt-0.5">
                            <Bot size={14} />
                          </div>
                        )}
                        <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-brand-600 text-white rounded-tr-none shadow-sm font-medium'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                        {msg.role === 'user' && (
                          <div className="p-1.5 bg-brand-100 text-brand-600 rounded-lg shrink-0 mt-0.5">
                            <User size={14} />
                          </div>
                        )}
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 italic font-medium p-2">
                        <Bot size={14} className="animate-spin text-violet-500" />
                        <span>CallMind AI is typing response...</span>
                      </div>
                    )}
                  </div>

                  {/* User Quick Action Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Quick Help:</span>
                    {[
                      "📞 कॉल सेव्ह कसा करावा?",
                      "📋 लीड स्टेटस कसे बदलावावे?",
                      "💬 व्हॉट्सॲप मेसेज कसा पाठवावा?",
                      "⏰ फॉलो-अप रिमाइंडर कसा सेट करावा?",
                      "📅 माझी हजेरी (Attendance) कशी पाहावी?"
                    ].map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => {
                          setChatMessage(chip);
                        }}
                        className="text-[11px] font-medium bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-brand-200 transition-all cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {chatLockedUntil && Date.now() < chatLockedUntil && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
                      <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">🔒 Chatbot Temporarily Paused (Spam Guard)</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Frequent messages detected (max 5 msgs/min). Chatbot is locked for 5 minutes.
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          For urgent help, contact CallMind Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold underline text-brand-700">{SUPPORT_EMAIL}</a> <span className="text-slate-400">(Phone support coming soon)</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <input
                      type="text"
                      disabled={!!(chatLockedUntil && Date.now() < chatLockedUntil)}
                      placeholder={chatLockedUntil && Date.now() < chatLockedUntil ? "Chatbot is temporarily paused..." : "Ask any CRM sales, telecalling or feature query..."}
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-100 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!chatMessage.trim() || isAiTyping || !!(chatLockedUntil && Date.now() < chatLockedUntil)}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Send size={14} />
                      Send
                    </button>
                  </form>
                </div>
              </SettingsCard>
            )}

            {supportSubTab === 'bug-report' && (
              <SettingsCard title="Report Technical Bug" icon={Bug}>
                {isBugSubmitted ? (
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                    <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
                    <h5 className="text-xs font-black text-slate-900 uppercase">Ticket Generated</h5>
                    <p className="text-xs text-brand-600 font-mono mt-1 font-bold">{bugTicketId}</p>
                    <button onClick={() => setIsBugSubmitted(false)} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">New Bug Ticket</button>
                  </div>
                ) : (
                  <form onSubmit={handleBugSubmit} className="space-y-4">
                    <FormField label="Bug Title">
                      <input required type="text" value={bugTitle} onChange={e => setBugTitle(e.target.value)} className="w-full p-3 border border-slate-100 rounded-xl text-xs" />
                    </FormField>
                    <FormField label="Description">
                      <textarea required value={bugDescription} onChange={e => setBugDescription(e.target.value)} rows={3} className="w-full p-3 border border-slate-100 rounded-xl text-xs resize-none" />
                    </FormField>
                    <FormField label="Steps to Reproduce">
                      <textarea required value={bugSteps} onChange={e => setBugSteps(e.target.value)} rows={3} className="w-full p-3 border border-slate-100 rounded-xl text-xs resize-none" />
                    </FormField>
                    <FormField label="File Attachment">
                      <input type="file" onChange={e => setBugAttachment(e.target.files?.[0] || null)} className="text-xs" />
                    </FormField>
                    <button type="submit" disabled={isBugSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase">
                      {isBugSubmitting ? 'Uploading...' : 'Submit Bug Report'}
                    </button>
                  </form>
                )}
              </SettingsCard>
            )}
          </div>
        );

      case 'cleanup':
        return <CleanupWidget />;

      case 'sub_admins':
        return <SubAdminManagementTab />;

      default:
        return (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500">
            Select a configuration tab on the left sidebar to customize this workspace.
          </div>
        );
    }
  };

  const isFounderOrGod = isFounder || isGodMode;

  const SECTIONS = [
    { id: 'profile', icon: User, label: 'My Profile', desc: 'Personal identity', textColorActive: 'text-brand-600' },
    ...(isFounderOrGod ? [{ id: 'company', icon: Building2, label: 'Company', desc: 'Corporate identity', textColorActive: 'text-brand-600' }] : []),
    { id: 'leads', icon: Target, label: 'Lead Workflow', desc: 'Pipeline & stages', textColorActive: 'text-emerald-600' },
    { id: 'privacy', icon: ShieldCheck, label: 'Privacy & Security', desc: 'Masking & MFA', textColorActive: 'text-amber-600' },
    { id: 'ai', icon: Bot, label: 'AI & Comms', desc: 'Twilio & chatbot', textColorActive: 'text-violet-600' },
    { id: 'notifications', icon: Bell, label: 'Notifications', desc: 'Alert channels', textColorActive: 'text-cyan-600' },
    { id: 'sync', icon: Database, label: 'Data & Sync', desc: 'Backups & exports', textColorActive: 'text-slate-600' },
    ...(isFounderOrGod ? [{ id: 'sub_admins', icon: Users, label: 'Co-Admins', desc: 'Manage sub-admins', textColorActive: 'text-blue-600' }] : []),
    ...(isFounderOrGod ? [{ id: 'billing', icon: CreditCard, label: 'Subscription', desc: 'Quota parameters', textColorActive: 'text-brand-600' }] : []),
    ...(isFounderOrGod ? [{ id: 'api_keys', icon: Key, label: 'Developer APIs', desc: 'Manage access keys', textColorActive: 'text-indigo-600' }] : []),
    { id: 'support', icon: HelpCircle, label: 'Help & Support', desc: 'FAQs & bugs', textColorActive: 'text-pink-600' },
    ...(isFounderOrGod ? [{ id: 'cleanup', icon: Trash2, label: 'Data Cleanup', desc: 'Wipe & archive policies', textColorActive: 'text-red-500' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      
      {/* Sidebar Nav */}
      <div className={`bg-white border-r border-gray-100 py-6 px-4 shrink-0 transition-all ${isNavCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex items-center justify-between mb-8 px-2">
          {!isNavCollapsed && <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuration</span>}
          <button onClick={() => setIsNavCollapsed(!isNavCollapsed)} className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg">
            {isNavCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <div className="space-y-1.5">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                activeSection === section.id
                  ? 'bg-brand-50 border border-brand-100'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="p-1 rounded-lg">
                <section.icon
                  size={18}
                  strokeWidth={activeSection === section.id ? 2.4 : 2}
                  className={`shrink-0 transition-colors ${activeSection === section.id ? section.textColorActive : 'text-slate-400 group-hover:text-slate-600'}`}
                />
              </div>
              {!isNavCollapsed && (
                <span className={`whitespace-nowrap truncate text-[13px] transition-colors ${activeSection === section.id ? 'font-bold text-slate-900' : 'font-semibold text-slate-500'}`}>
                  {section.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Pane */}
      <div className="flex-1 p-6 sm:p-10 max-w-5xl">
        {saveSuccessMsg && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-black text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
        {renderSection()}
      </div>
    </div>
  );
};
