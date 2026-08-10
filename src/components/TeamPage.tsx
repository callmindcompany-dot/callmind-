import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { useCompany } from '@/CompanyContext';
import { TelecallerInviteModal } from './TelecallerInviteModal';
import { 
  Users, 
  QrCode, 
  Radar, 
  Clock, 
  Target, 
  History, 
  Megaphone, 
  Shield, 
  Shuffle,
  Search,
  XCircle,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  Activity,
  Zap,
  Sparkles,
  Download,
  Phone,
  AlertCircle,
  Mail,
  MapPin,
  Globe,
  ArrowRight,
  UserCheck,
  UserX,
  CreditCard,
  ExternalLink,
  Smartphone,
  MonitorSmartphone,
  Settings,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import CallMindLoader from './CallMindLoader';
import { toast } from 'react-hot-toast';
import { trackTrialEvent } from '@/utils/trialTracking';
import { ConfirmModal } from './ConfirmModal';

// Supabase Hooks & Types
import { 
  useTeamMembers,
  usePendingRequests,
  useInvites,
  useTeamSettings,
  useAgentStatuses,
  useAuditLogs,
  useCompanyPlan,
  useApproveRequest,
  useRejectRequest,
  useCreateInvite,
  useRevokeInvite,
  useProcessMember,
  useUpdateTeamSettings,
  TeamMember as Member,
  JoinRequestRow as JoinRequest,
  InviteRow as Invite,
  AgentStatusRow as AgentStatus,
  AuditLogRow as AuditLog,
  TeamSettingsRow as DbTeamSettings
} from '../hooks/useTeam';

export interface TeamSettings {
  hidePhoneNumbers: boolean;
  requireApproval: boolean;
  allowQr: boolean;
  allowCode: boolean;
  deviceLimit: number;
}

const TEAM_MENU_ITEMS = [
  { id: 'members', label: 'Members', icon: Users, description: 'Manage active team and seats' },
  { id: 'requests', label: 'Pending Requests', icon: UserPlus, description: 'Review admission queue' },
  { id: 'join-tools', label: 'Join Tools', icon: QrCode, description: 'QR, Join Codes & Links' },
  { id: 'availability', label: 'Live Radar', icon: Radar, description: 'Agent availability tracking' },
  { id: 'attendance', label: 'Attendance', icon: Clock, description: 'Daily logs & punch-ins (Beta)' },
  { id: 'targets', label: 'Targets', icon: Target, description: 'KPIs & performance goals (Beta)' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, description: 'Broadcast team updates (Beta)' },
  { id: 'activity', label: 'Activity Logs', icon: History, description: 'Security & audit tracking' },
  { id: 'reassign', label: 'Bulk Reassign', icon: Shuffle, description: 'Mass lead redistribution (Power Tool)' },
  { id: 'settings', label: 'Team Settings', icon: Settings, description: 'Admission & seat rules' },
];

import { TrialLockOverlay } from './TrialLockOverlay';
import { AttendanceSection } from './AttendanceSection';
import { TeamTargetsSection } from './TeamTargetsSection';
import { TeamAnnouncementsSection } from './TeamAnnouncementsSection';
import { TeamJoinToolsSection } from './TeamJoinToolsSection';

// -------------------------------------------------------------
// Sub-components with strict types
// -------------------------------------------------------------

interface JoinRequestItemProps {
  req: JoinRequest;
  onApprove: (req: JoinRequest) => void;
  onReject: (requestId: string, name: string) => void;
  onSelect: (item: any) => void;
  isFull: boolean;
  getViaIcon: (via: string) => React.ComponentType<any>;
}

const JoinRequestItem = React.memo(({ req, onApprove, onReject, onSelect, isFull, getViaIcon }: JoinRequestItemProps) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-6 py-5">
        <div>
          <p className="text-sm font-bold text-gray-900">{req.name}</p>
          <p className="text-[10px] font-medium text-gray-500">{req.email}</p>
        </div>
      </td>
      <td className="px-6 py-5">
        <p className="text-xs font-bold text-gray-700 font-mono">{req.phone}</p>
        <p className="text-[10px] font-medium text-gray-400">{req.city} • {req.language}</p>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
            {React.createElement(getViaIcon(req.requested_via || 'Manual'), { size: 10 })}
            {(req.requested_via || 'Manual').replace('_', ' ')}
          </span>
          <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest">-1 Seat</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
            {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}
          </span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
            {req.created_at ? new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => onApprove(req)}
            disabled={isFull}
            className={`px-4 py-2 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isFull ? 'bg-gray-200 text-gray-400' : 'bg-brand-600 shadow-brand-100 hover:bg-brand-700 active:scale-95'}`}
          >
            {isFull ? 'Limit Reached' : 'Approve'}
          </button>
          <button 
            onClick={() => onReject(req.id, req.name)}
            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => onSelect({ ...req, type: 'request' })}
            className="p-2 text-gray-400 hover:text-gray-900 rounded-lg transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});
JoinRequestItem.displayName = 'JoinRequestItem';

interface AuditLogItemProps {
  log: AuditLog;
}

const AuditLogItem = React.memo(({ log }: AuditLogItemProps) => {
  return (
    <div className="p-6 flex items-start gap-6 hover:bg-gray-50/50 transition-colors">
      <div className={`p-3 rounded-2xl shrink-0 ${
        log.action?.includes('APPROVE') ? 'bg-green-100 text-green-600' :
        log.action?.includes('REMOVE') || log.action?.includes('WIPE') ? 'bg-red-100 text-red-600' :
        log.action?.includes('DISABLE') ? 'bg-orange-100 text-orange-600' :
        'bg-brand-100 text-brand-600'
      }`}>
        {log.action?.includes('MEMBER') ? <UserCheck size={20} /> : <Shield size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight">{log.action?.replace(/_/g, ' ')}</h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
          </span>
        </div>
        <p className="text-xs text-gray-500 font-medium leading-relaxed">{log.details}</p>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gray-200" />
            <span className="text-[10px] font-black text-gray-900 uppercase">{log.user_name || 'System'}</span>
          </div>
          {log.target && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <ArrowRight size={10} />
              <span className="text-[10px] font-bold">Target: {log.target}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
AuditLogItem.displayName = 'AuditLogItem';

interface StatCardProps {
  stat: {
    label: string;
    value: string | number;
    icon: React.ComponentType<any>;
    color: string;
    highlight?: boolean;
  };
}

const StatCard = React.memo(({ stat }: StatCardProps) => (
  <div className="bg-white border border-gray-100 rounded-[32px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-1">
    <div className="flex items-center justify-between">
      <stat.icon size={16} className={stat.color} />
      {stat.highlight && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
    </div>
    <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
  </div>
));
StatCard.displayName = 'StatCard';

interface AdmissionControlItemProps {
  label: string;
  sub: string;
  active: boolean;
  onToggle: () => void;
}

const AdmissionControlItem = React.memo(({ label, sub, active, onToggle }: AdmissionControlItemProps) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 pb-4">
    <div className="flex flex-col">
      <span className="text-sm font-bold text-gray-900">{label}</span>
      <span className="text-[10px] text-gray-400 font-medium">{sub}</span>
    </div>
    <button 
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-all relative ${active ? 'bg-brand-600' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-6' : 'left-1'}`} />
    </button>
  </div>
));
AdmissionControlItem.displayName = 'AdmissionControlItem';

interface AgentStatusMetricCardProps {
  icon: React.ComponentType<any>;
  color: { bg: string; text: string; border: string };
  value: number;
  label: string;
  animate?: boolean;
}

const AgentStatusMetricCard = React.memo(({ icon: Icon, color, value, label, animate = false }: AgentStatusMetricCardProps) => (
  <div className="glass p-8 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
    <div className={`w-20 h-20 rounded-full ${color.bg} flex items-center justify-center ${color.text} relative`}>
      <Icon size={40} className={animate ? 'animate-spin-slow' : ''} />
      {animate && <div className={`absolute inset-0 rounded-full border-2 ${color.border} animate-ping opacity-20`} />}
    </div>
    <div>
      <h3 className="text-3xl font-black text-gray-900">{value}</h3>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
    </div>
  </div>
));
AgentStatusMetricCard.displayName = 'AgentStatusMetricCard';

interface InfrastructurePolicyCardProps {
  icon: React.ComponentType<any>;
  color: string;
  title: string;
  sub: string;
}

const InfrastructurePolicyCard = React.memo(({ icon: Icon, color, title, sub }: InfrastructurePolicyCardProps) => (
  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
    <Icon size={24} className={`${color} mb-3`} />
    <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">{title}</h4>
    <p className="text-[10px] font-medium text-gray-500">{sub}</p>
  </div>
));
InfrastructurePolicyCard.displayName = 'InfrastructurePolicyCard';

interface RequestsSectionProps {
  requests: JoinRequest[];
  availableSeats: number;
  isFull: boolean;
  onApprove: (req: JoinRequest) => void;
  onReject: (requestId: string, name: string) => void;
  onSelect: (item: any) => void;
  getViaIcon: (via: string) => React.ComponentType<any>;
}

const RequestsSection = React.memo(({ requests, availableSeats, isFull, onApprove, onReject, onSelect, getViaIcon }: RequestsSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pending Requests</h2>
          <p className="text-gray-500 text-sm">Review inbound team join requests and seat impact.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isFull ? 'bg-red-50 border-red-100 text-red-700' : 'bg-brand-50 border-brand-100 text-brand-700'}`}>
              {isFull ? <AlertCircle size={16} /> : <CreditCard size={16} />}
              <span className="text-xs font-black uppercase tracking-widest">
                 {isFull ? 'No Seats Available' : `${availableSeats} Seats Left`}
              </span>
           </div>
        </div>
      </div>

      {requests.length === 0 ? (
         <div className="bg-white rounded-[32px] border border-gray-100 p-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
               <UserPlus size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-500 text-sm max-w-sm">
               When new agents scan your team QR or use your join code, they will appear here for approval.
            </p>
         </div>
      ) : (
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Applicant</th>
                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Contact & Locale</th>
                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Via & Impact</th>
                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Flags</th>
                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map((req) => (
                     <JoinRequestItem 
                       key={req.id} 
                       req={req} 
                       onApprove={onApprove}
                       onReject={onReject}
                       onSelect={onSelect}
                       isFull={isFull}
                       getViaIcon={getViaIcon}
                     />
                  ))}
                </tbody>
             </table>
          </div>
      )}
    </div>
  );
});
RequestsSection.displayName = 'RequestsSection';

interface ActivityLogsSectionProps {
  auditLogs: AuditLog[];
}

const ActivityLogsSection = React.memo(({ auditLogs }: ActivityLogsSectionProps) => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Operational Log</h2>
        <p className="text-gray-500 text-sm">Historical record of team lifecycle events and security actions.</p>
      </div>
      <button 
        onClick={() => {
           toast.success("Full Audit CSV Export Initiated");
        }}
        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
      >
        <Download size={18} /> Export Full Log
      </button>
    </div>
    <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
       <div className="divide-y divide-gray-50">
          {auditLogs.length > 0 ? auditLogs.map((log) => (
            <AuditLogItem key={log.id} log={log} />
          )) : (
            <div className="p-20 text-center text-gray-400 font-medium italic">
               No operational activity recorded yet.
            </div>
          )}
       </div>
    </div>
  </div>
));
ActivityLogsSection.displayName = 'ActivityLogsSection';

interface TeamSettingsSectionProps {
  teamSettings: TeamSettings;
  handleToggleSetting: (field: string) => void;
  handleUpdateSetting: (field: string, value: any) => void;
}

const TeamSettingsSection = React.memo(({ teamSettings, handleToggleSetting, handleUpdateSetting }: TeamSettingsSectionProps) => {
  const { companyId } = useCompany();

  const handleCopyLink = () => {
    if (!companyId) {
      toast.error("Company context not found");
      return;
    }
    const inviteLink = `${window.location.origin}/join?org=${companyId}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Magic invite link copied to clipboard!");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Hub Settings</h2>
          <p className="text-gray-500 text-sm">Operational settings for member admission and seat management.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full border border-brand-100">
          <Shield size={16} />
          <span className="text-xs font-black uppercase tracking-widest">Team Enforcement Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
               <UserPlus size={18} className="text-brand-600" />
               Admission Controls
            </h3>
            
            <div className="space-y-4">
              <AdmissionControlItem 
                label="Connection Approval"
                sub="Require manual verification for new members"
                active={!!teamSettings.requireApproval}
                onToggle={() => handleToggleSetting('requireApproval')}
              />

              <AdmissionControlItem 
                label="Allow QR Join"
                sub="Members can scan team QR to request access"
                active={!!teamSettings.allowQr}
                onToggle={() => handleToggleSetting('allowQr')}
              />

              <AdmissionControlItem 
                label="Allow Join Code"
                sub="Accept 6-digit codes for inbound requests"
                active={!!teamSettings.allowCode}
                onToggle={() => handleToggleSetting('allowCode')}
              />

              <div 
                onClick={handleCopyLink}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 border border-transparent hover:border-brand-500 hover:bg-white rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                     Copy Magic Invite Link
                     <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[8px] font-black uppercase tracking-tighter rounded border border-green-150">Active</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">Magic link for remote member onboarding</span>
                </div>
                <ExternalLink size={16} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
             <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <Smartphone size={18} className="text-brand-600" />
                Infrastructure Policies
             </h3>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Device Limit Per Member</label>
                   <div className="flex gap-2">
                      {[1, 2, 3].map(n => (
                         <button 
                           key={n}
                           onClick={() => handleUpdateSetting('deviceLimit', n)}
                           className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all border-2 ${teamSettings.deviceLimit === n ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'}`}
                         >
                            {n} Device{n > 1 ? 's' : ''}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-2">
                   <div className="flex items-center gap-2 text-gray-400">
                      <History size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Seat Release Behavior</span>
                   </div>
                   <p className="text-[10px] font-bold text-gray-700 leading-tight">Member seats are released instantly upon disabling. All data is retained for audit logs in the cloud.</p>
                </div>

                <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-2">
                   <div className="flex items-center gap-2 text-blue-600">
                      <MonitorSmartphone size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Mobile-Only Access</span>
                   </div>
                   <p className="text-[10px] font-bold text-blue-900 leading-tight">Team members access the platform exclusively via the Android/iOS app. No web login permitted.</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <InfrastructurePolicyCard 
                icon={Activity}
                color="text-brand-600"
                title="Mobile Monitoring"
                sub="Live session tracking and radar visibility are enforced for all active mobile members."
             />
             <InfrastructurePolicyCard 
                icon={Clock}
                color="text-orange-600"
                title="Inactive Handling"
                sub="Accounts with 72h+ sync inactivity are flagged for automatic seat reclamation review."
             />
          </div>
        </div>
      </div>
    </div>
  );
});
TeamSettingsSection.displayName = 'TeamSettingsSection';

interface TeamMemberRowProps {
  member: Member;
  teamSettings: TeamSettings;
  getStatusColor: (status: string) => string;
  getViaIcon: (via: string) => React.ComponentType<any>;
  onDisable: (member: Member) => void;
  onRemove: (member: Member) => void;
  onSelect: (member: Member) => void;
}

const TeamMemberRow = React.memo(({ member, teamSettings, getStatusColor, getViaIcon, onDisable, onRemove, onSelect }: TeamMemberRowProps) => {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-700 font-bold border border-brand-100">
            {/* No photo_url column exists and nothing uploads one, so this
                always fell through to the initial anyway. */}
            {(member.display_name || member.name || member.email)?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{member.display_name || member.name || member.email}</p>
            <p className="text-[10px] font-medium text-gray-400">{member.role || 'Telecaller'}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <p className="text-xs font-bold text-gray-700 font-mono italic">
          {teamSettings.hidePhoneNumbers ? '********' + (member.phone?.slice(-4) || '****') : (member.phone || 'N/A')}
        </p>
      </td>
      <td className="px-6 py-5">
        <div className="flex justify-center">
          <div className={`w-2.5 h-2.5 rounded-full ${member.seat_active ? 'bg-brand-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-gray-200'}`} />
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border w-fit ${getStatusColor(member.status || 'Active')}`}>
            {member.status || 'Active'}
          </span>
          <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest">
            {React.createElement(getViaIcon(member.joined_via || 'Manual'), { size: 10 })}
            via {member.joined_via || 'Manual'}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 text-center">
        <p className="text-xs font-bold text-gray-900">{member.assigned_leads || 0}</p>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{member.calls_today || 0} Calls Today</p>
      </td>
      <td className="px-6 py-5">
        {/* This read `member.last_seen ? 'Recently' : 'Recently'` -- both
            branches identical, on a column that does not exist. Presence lives
            in agent_status, which this table does not join. */}
        <p className="text-[10px] font-medium text-gray-500">—</p>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onDisable(member)}
            disabled={member.status === 'disabled'}
            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
            title="Disable Member"
          >
            <UserX size={16} />
          </button>
          <button 
            onClick={() => onRemove(member)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Remove & Release Seat"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={() => onSelect(member)}
            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
});
TeamMemberRow.displayName = 'TeamMemberRow';

interface MembersSectionProps {
  members: Member[];
  displayedMembers: Member[];
  filteredMembers: Member[];
  isLoadingMembers: boolean;
  inputValue: string;
  setInputValue: (val: string) => void;
  setShowInviteModal: (val: boolean) => void;
  teamSettings: TeamSettings;
  getStatusColor: (status: string) => string;
  getViaIcon: (via: string) => React.ComponentType<any>;
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  currentPage: number;
  setCurrentPage: (val: number | ((prev: number) => number)) => void;
  totalPages: number;
  onDisable: (m: Member) => void;
  onRemove: (m: Member) => void;
  onSelect: (m: Member) => void;
}

const MembersSection = React.memo(({ 
  members,
  displayedMembers, 
  filteredMembers, 
  isLoadingMembers, 
  inputValue, 
  setInputValue, 
  setShowInviteModal, 
  teamSettings,
  getStatusColor,
  getViaIcon,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  currentPage,
  setCurrentPage,
  totalPages,
  onDisable,
  onRemove,
  onSelect
}: MembersSectionProps) => {
  const handleExportCSV = () => {
    if (!filteredMembers || filteredMembers.length === 0) {
      toast.error("No team members to export.");
      return;
    }
    const headers = ["Name", "Email", "Phone", "Role", "Status", "Joined Via", "Assigned Leads", "Calls Today"];
    const rows = filteredMembers.map(m => {
      const displayPhone = teamSettings.hidePhoneNumbers
        ? "XXXXXXXXXX"
        : (m.phone || '');
      return [
        `"${m.display_name || m.name || ''}"`,
        `"${m.email || ''}"`,
        `"${displayPhone}"`,
        `"${m.role || 'Telecaller'}"`,
        `"${m.status || 'Active'}"`,
        `"${m.joined_via || 'Manual'}"`,
        `"${m.assigned_leads || 0}"`,
        `"${m.calls_today || 0}"`
      ].join(",");
    });

    const csvContent = headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `callmind_team_members_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-500 text-sm">Manage seat-based access and telecaller performance.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowInviteModal(true)}
             className="flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all btn-tactile"
           >
             <UserPlus size={18} />
             Invite Member
           </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, role or phone..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-200 transition-all font-medium"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
           <select 
             value={roleFilter}
             onChange={(e) => {
               setRoleFilter(e.target.value);
               setCurrentPage(1);
             }}
             className="px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-brand-200 transition-all cursor-pointer"
           >
              <option value="all">All Roles</option>
              <option value="telecaller">Telecallers Only</option>
              <option value="admin">Admins Only</option>
              <option value="founder">Founders Only</option>
           </select>

           <select 
             value={statusFilter}
             onChange={(e) => {
               setStatusFilter(e.target.value);
               setCurrentPage(1);
             }}
             className="px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs font-bold text-slate-700 outline-none hover:bg-white focus:border-brand-200 transition-all cursor-pointer"
           >
              <option value="all">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="disabled">Disabled Seats</option>
           </select>

           <button 
             onClick={handleExportCSV}
             className="p-3 bg-gray-50 text-gray-500 rounded-2xl border border-gray-100 hover:bg-white hover:text-brand-600 transition-all"
             title="Export CSV"
           >
              <Download size={18} />
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Member & Role</th>
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Seat Active</th>
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status & Via</th>
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Leads/Calls</th>
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Last Seen</th>
              <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoadingMembers ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center border-b border-gray-100">
                  <CallMindLoader size="md" text="Loading team..." />
                </td>
              </tr>
            ) : filteredMembers.length === 0 && members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                      <Users size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Team Members Found</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">Your team is empty. Invite members to start collaborating.</p>
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="mt-4 px-6 py-2 bg-brand-50 text-brand-700 font-bold text-sm rounded-xl hover:bg-brand-100 transition-colors"
                    >
                      Invite Now
                    </button>
                  </div>
                </td>
              </tr>
            ) : displayedMembers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center">
                   <div className="flex flex-col items-center">
                     <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                       <Search size={32} className="text-gray-300" />
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 mb-2">No Results Found</h3>
                     <p className="text-sm text-gray-500 max-w-sm mx-auto">No members match your filter conditions.</p>
                     <button 
                       onClick={() => {
                         setInputValue('');
                         setRoleFilter('all');
                         setStatusFilter('all');
                       }}
                       className="mt-4 px-6 py-2 bg-gray-50 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors"
                     >
                       Clear Filters
                     </button>
                   </div>
                </td>
              </tr>
            ) : displayedMembers.map((member, i) => (
              <TeamMemberRow
                key={member.id || i}
                member={member}
                teamSettings={teamSettings}
                getStatusColor={getStatusColor}
                getViaIcon={getViaIcon}
                onDisable={onDisable}
                onRemove={onRemove}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 px-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Showing {((currentPage - 1) * 8) + 1} - {Math.min(currentPage * 8, filteredMembers.length)} of {filteredMembers.length} members
          </span>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
MembersSection.displayName = 'MembersSection';

interface AgentSessionItemProps {
  agent: AgentStatus;
}

const AgentSessionItem = React.memo(({ agent }: AgentSessionItemProps) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-brand-600">
            {agent.user_name?.charAt(0)}
          </div>
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
            agent.status === 'active' ? 'bg-green-500' : 
            agent.status === 'on_call' ? 'bg-orange-500' : 'bg-gray-400'
          }`}>
            {(agent.status === 'active' || agent.status === 'on_call') && (
              <div className={`absolute inset-0 rounded-full animate-ping opacity-40 ${
                agent.status === 'active' ? 'bg-green-500' : 'bg-orange-500'
              }`} />
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{agent.user_name}</p>
          {/*
            Was `agent.location || 'Unknown Location'`. agent_status has no
            location column — src/types/supabase.ts declared one and the
            database never had it — so this row read "Unknown Location" for
            everybody, always. last_seen is real and is the thing an admin
            looking at a presence board actually wants.
          */}
          <p className="text-xs text-gray-500">
            {agent.last_seen
              ? `Last seen ${new Date(agent.last_seen).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Not seen yet'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
          agent.status === 'active' ? 'bg-green-100 text-green-700' : 
          agent.status === 'on_call' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {agent.status.replace('_', ' ')}
        </div>
      </div>
    </div>
  );
});
AgentSessionItem.displayName = 'AgentSessionItem';

interface AvailabilitySectionProps {
  agentStatuses: AgentStatus[];
}

const AvailabilitySection = React.memo(({ agentStatuses }: AvailabilitySectionProps) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Radar</h2>
          <p className="text-gray-500 text-sm">Real-time agent availability and current status.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-xs font-bold uppercase tracking-wider">Live Tracking Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AgentStatusMetricCard 
          icon={Radar}
          color={{ bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-500' }}
          value={agentStatuses.filter((s) => s.status === 'active').length}
          label="Agents Online"
          animate={true}
        />
        <AgentStatusMetricCard 
          icon={Clock}
          color={{ bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' }}
          value={agentStatuses.filter((s) => s.status === 'on_call').length}
          label="On Call"
        />
        <AgentStatusMetricCard 
          icon={XCircle}
          color={{ bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-400' }}
          value={agentStatuses.filter((s) => s.status === 'offline').length}
          label="Offline"
        />
      </div>

      <div className="glass p-8 rounded-[40px]">
        <h3 className="font-bold text-gray-900 mb-6">Active Sessions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentStatuses.map((agent) => (
            <AgentSessionItem key={agent.id} agent={agent} />
          ))}
          {agentStatuses.length === 0 && (
            <div className="col-span-2 py-12 text-center text-gray-400">
              <Radar className="mx-auto mb-4 opacity-20" size={48} />
              <p>No active agents detected on radar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
AvailabilitySection.displayName = 'AvailabilitySection';

interface ReassignSectionProps {
  isSuperFounder: boolean;
  members: Member[];
  reassignData: { source: string; target: string; count: string };
  setReassignData: React.Dispatch<React.SetStateAction<{ source: string; target: string; count: string }>>;
  isReassigning: boolean;
  handleBulkReassign: () => void;
}

const ReassignSection = React.memo(({ members, reassignData, setReassignData, isReassigning, handleBulkReassign }: ReassignSectionProps) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk Reassignment</h2>
          <p className="text-gray-500 text-sm">Mass redistribute leads between team members.</p>
        </div>
        <div className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full border border-orange-150 flex items-center gap-2">
          <AlertCircle size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">High Impact Action</span>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-100/50">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source Agent (From)</label>
               <select 
                 value={reassignData.source}
                 onChange={(e) => setReassignData((prev) => ({ ...prev, source: e.target.value }))}
                 className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-brand-500 outline-none font-bold text-gray-950"
               >
                  <option value="">Select Source Member</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.display_name || m.name || m.email} ({m.assigned_leads || 0} leads)</option>)}
               </select>
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Agent (To)</label>
               <select 
                 value={reassignData.target}
                 onChange={(e) => setReassignData((prev) => ({ ...prev, target: e.target.value }))}
                 className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-brand-500 outline-none font-bold text-gray-950"
               >
                  <option value="">Select Target Member</option>
                  {members.filter((m) => m.id !== reassignData.source).map((m) => <option key={m.id} value={m.id}>{m.display_name || m.name || m.email}</option>)}
               </select>
            </div>
         </div>
         
         <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-900">Transfer Volume</h4>
              <p className="text-xs text-gray-500 mt-1">How many leads should be moved?</p>
            </div>
            <div className="flex items-center gap-4">
              {['10', '50', 'ALL'].map(val => (
                <button 
                  key={val}
                  onClick={() => setReassignData((prev) => ({ ...prev, count: val === 'ALL' ? members.find((m) => m.id === reassignData.source)?.assigned_leads?.toString() || '0' : val }))}
                  className={`px-6 py-2 rounded-xl font-black text-[10px] transition-all border-2 ${reassignData.count === val ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-100 text-gray-400 hover:border-brand-200'}`}
                >
                  {val}
                </button>
              ))}
            </div>
         </div>

         <button 
           onClick={handleBulkReassign}
           disabled={isReassigning || !reassignData.source || !reassignData.target}
           className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-50"
         >
            {isReassigning ? 'Processing Transaction...' : <><Shuffle size={20} /> Execute Lead Reassignment</>}
         </button>
      </div>
    </div>
  );
});
ReassignSection.displayName = 'ReassignSection';

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------

export const TeamPage = ({ onTabChange }: { onTabChange?: (tab: string) => void }) => {
  const { user, profile, isSuperFounder, plan_status, trialDaysRemaining } = useAuth();
  const plan = usePlan();
  const { companyId } = useCompany();
  const location = useLocation();
  const navigate = useNavigate();

  if ((profile as any)?.role === 'Telecaller') {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeSection, setActiveSection] = useState('members');
  const [isWiping, setIsWiping] = useState<string | null>(null);
  const [reassignData, setReassignData] = useState({ source: '', target: '', count: '' });
  const [isReassigning, setIsReassigning] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Agent');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState('ADMIN_POOL');
  const [memberToProcess, setMemberToProcess] = useState<Member | null>(null);
  const [processAction, setProcessAction] = useState<'disable' | 'remove' | null>(null);
  const [showTelecallerPairModal, setShowTelecallerPairModal] = useState(false);

  // ConfirmModal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Query states
  const { data: members = [], isLoading: isLoadingMembers } = useTeamMembers(companyId);
  const { data: requests = [] } = usePendingRequests(companyId);
  const { data: invites = [] } = useInvites(companyId);
  const { data: dbSettings } = useTeamSettings(companyId);
  const { data: agentStatuses = [] } = useAgentStatuses(companyId);
  const { data: auditLogs = [] } = useAuditLogs(companyId);
  const { data: companyData } = useCompanyPlan(companyId);

  const teamSettings = {
    hidePhoneNumbers: dbSettings?.hide_phone_numbers ?? false,
    requireApproval: dbSettings?.require_approval ?? true,
    allowQr: dbSettings?.allow_qr ?? true,
    allowCode: dbSettings?.allow_code ?? true,
    deviceLimit: dbSettings?.device_limit ?? 1,
  };

  // Mutations
  const approveRequestMutation = useApproveRequest(companyId);
  const rejectRequestMutation = useRejectRequest(companyId);
  const createInviteMutation = useCreateInvite(companyId);
  const revokeInviteMutation = useRevokeInvite(companyId);
  const processMemberMutation = useProcessMember(companyId);
  const updateSettingsMutation = useUpdateTeamSettings(companyId);

  // Seat Logic
  //
  // This used to guess a cap by substring-matching plan names that do not
  // exist ('enterprise', 'professional'), and fall back to `return 1000` --
  // so in practice nobody ever ran out of seats. The cap now comes from the
  // plan, and a BEFORE INSERT trigger on `users` enforces the same number in
  // the database, which is what actually stops an over-limit invite.
  const memberLimit = plan.limit('seats');

  const usedSeats = React.useMemo(() => {
    return members.filter(m => {
      const status = (m.status || 'active').toLowerCase();
      return status !== 'disabled' && status !== 'removed' && m.seat_active !== false;
    }).length;
  }, [members]);

  const activeMembersCount = React.useMemo(() => {
    return members.filter(m => {
      const status = (m.status || 'active').toLowerCase();
      return status === 'active' && m.seat_active !== false;
    }).length;
  }, [members]);

  const disabledMembersCount = React.useMemo(() => {
    return members.filter(m => {
      const status = (m.status || 'active').toLowerCase();
      return status === 'disabled' || m.seat_active === false;
    }).length;
  }, [members]);

  const pendingRequestsCount = requests.length;
  const overLimitCount = React.useMemo(() => Math.max(0, usedSeats - memberLimit), [usedSeats, memberLimit]);
  const availableSeats = React.useMemo(() => Math.max(0, memberLimit - usedSeats), [memberLimit, usedSeats]);
  const remainingSeats = availableSeats;
  const todayActiveCallers = React.useMemo(() => agentStatuses.filter(s => s.status === 'active' || s.status === 'on_call').length, [agentStatuses]);
  const isFull = React.useMemo(() => availableSeats === 0, [availableSeats]);

  const filteredMembers = React.useMemo(() => {
    return members.filter(m => {
      const lowerQuery = inputValue.toLowerCase();
      const matchesSearch = !inputValue || 
                            (m.display_name || '').toLowerCase().includes(lowerQuery) || 
                            (m.name || '').toLowerCase().includes(lowerQuery) || 
                            (m.email || '').toLowerCase().includes(lowerQuery) ||
                            (m.role || '').toLowerCase().includes(lowerQuery) ||
                            (m.phone || '').includes(inputValue);

      if (!matchesSearch) return false;

      if (roleFilter !== 'all') {
        const roleVal = (m.role || 'Telecaller').toLowerCase();
        if (roleFilter === 'telecaller' && roleVal !== 'telecaller' && roleVal !== 'agent') return false;
        if (roleFilter === 'admin' && roleVal !== 'admin') return false;
        if (roleFilter === 'founder' && roleVal !== 'founder') return false;
      }

      if (statusFilter !== 'all') {
        const statusVal = (m.status || 'active').toLowerCase();
        if (statusFilter === 'active' && statusVal !== 'active') return false;
        if (statusFilter === 'disabled' && statusVal !== 'disabled') return false;
      }

      return true;
    });
  }, [members, inputValue, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredMembers.length / 8) || 1;

  const displayedMembers = React.useMemo(() => {
    const startIdx = (currentPage - 1) * 8;
    return filteredMembers.slice(startIdx, startIdx + 8);
  }, [filteredMembers, currentPage]);

  const handleApproveRequest = React.useCallback(async (request: JoinRequest) => {
    if (usedSeats >= memberLimit) {
      toast.error("No seats available. Please upgrade your plan or release seats before approving.");
      return;
    }
    if (!companyId) return;

    try {
      let inviteToUpdate = null;
      if (request.requested_via === 'join_code' || request.requested_via === 'qr_scan') {
        inviteToUpdate = invites.find(inv => 
          (request.requested_via === 'join_code' && inv.join_code) ||
          (request.requested_via === 'qr_scan' && inv.token)
        );
      }

      approveRequestMutation.mutate({ request, inviteToUpdate });
      if (user?.uid) {
        trackTrialEvent(companyId, user.uid, 'teammate_invited');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to approve request: ${error.message || 'Check permissions.'}`);
    }
  }, [companyId, usedSeats, memberLimit, invites, user?.uid, approveRequestMutation]);

  const handleRejectRequest = React.useCallback(async (requestId: string, name: string) => {
    rejectRequestMutation.mutate({ requestId, targetName: name });
  }, [rejectRequestMutation]);

  const handleProcessMember = React.useCallback(async () => {
    if (!memberToProcess || !processAction) return;

    try {
      if (processAction === 'disable') {
        try {
          const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
          await fetch('/api/admin/remote-wipe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': idToken ? `Bearer ${idToken}` : ''
            },
            body: JSON.stringify({
              targetUserId: memberToProcess.id
            })
          });
        } catch (err) {
          console.error("Failed to trigger remote wipe API:", err);
        }
      } else if (processAction === 'remove') {
        // Reassign first, and stop if it fails.
        //
        // This used to fire the request and ignore everything about it: fetch
        // resolves on a 401 or a 500 as happily as on a 200, and only a network
        // error reached the catch. So the member was removed regardless, their
        // leads stayed assigned to a removed user where nobody would see them,
        // and the audit log recorded a transfer that had not occurred.
        const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
        const reassignRes = await fetch('/api/admin/bulk-reassign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : ''
          },
          body: JSON.stringify({
            sourceUserId: memberToProcess.id,
            targetUserId: transferTarget,
            count: 'ALL'
          })
        });

        const reassignResult = await reassignRes.json().catch(() => ({}));
        if (!reassignRes.ok || reassignResult.success === false) {
          toast.error(
            `Could not reassign this member's leads: ${reassignResult.error || reassignRes.status}. ` +
            'They have not been removed.'
          );
          return;
        }
      }

      processMemberMutation.mutate({
        memberId: memberToProcess.id,
        displayName: memberToProcess.display_name || memberToProcess.name || memberToProcess.email,
        action: processAction,
        transferTarget
      });

      // Automatically revoke active QR when seat is freed
      const existingQRs = invites.filter(i => i.type === 'qr_live' && i.status === 'active');
      for (const eqr of existingQRs) {
        revokeInviteMutation.mutate(eqr.id);
      }

      setShowTransferModal(false);
      setMemberToProcess(null);
      setProcessAction(null);
    } catch (error) {
      console.error(error);
    }
  }, [memberToProcess, processAction, invites, transferTarget, user, processMemberMutation, revokeInviteMutation]);

  const handleToggleSetting = React.useCallback(async (field: string) => {
    if (!isSuperFounder || !companyId) return;
    
    // Map camelCase fields to snake_case table columns
    const dbFieldMap: Record<string, string> = {
      requireApproval: 'require_approval',
      allowQr: 'allow_qr',
      allowCode: 'allow_code',
      hidePhoneNumbers: 'hide_phone_numbers'
    };
    
    const dbField = dbFieldMap[field] || field;
    const currentValue = teamSettings[field as keyof typeof teamSettings];
    
    updateSettingsMutation.mutate({ [dbField]: !currentValue });
  }, [isSuperFounder, companyId, teamSettings, updateSettingsMutation]);

  const handleUpdateSetting = React.useCallback(async (field: string, value: any) => {
    if (!isSuperFounder || !companyId) return;
    
    const dbFieldMap: Record<string, string> = {
      deviceLimit: 'device_limit'
    };
    
    const dbField = dbFieldMap[field] || field;
    updateSettingsMutation.mutate({ [dbField]: value });
  }, [isSuperFounder, companyId, updateSettingsMutation]);

  useEffect(() => {
    const state = location.state as { activeSection?: string };
    if (state?.activeSection) {
      setActiveSection(state.activeSection);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleGenerateJoinCode = React.useCallback(async () => {
    if (!companyId || isFull) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    createInviteMutation.mutate({
      email: null,
      role: 'Agent',
      type: 'join_code',
      joinCode: code,
      token: `TKN-${code}`,
      maxUses: availableSeats
    });
  }, [companyId, isFull, availableSeats, createInviteMutation]);

  const handleGenerateQR = React.useCallback(async () => {
    if (!companyId || isFull) return;
    
    // Revoke old active QRs
    const existingQRs = invites.filter(i => i.type === 'qr_live' && i.status === 'active');
    for (const eqr of existingQRs) {
      revokeInviteMutation.mutate(eqr.id);
    }

    createInviteMutation.mutate({
      email: null,
      role: 'Agent',
      type: 'qr_live',
      token: `QR-${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
      maxUses: availableSeats
    });
  }, [companyId, isFull, invites, availableSeats, createInviteMutation, revokeInviteMutation]);

  const handleRevokeInvite = React.useCallback(async (inviteId: string) => {
    revokeInviteMutation.mutate(inviteId);
  }, [revokeInviteMutation]);

  const handleSendInvite = React.useCallback(async () => {
    if (!inviteEmail) {
       toast.error("Email is required");
       return;
    }
    if (isFull) {
       toast.error("No seats left! Please upgrade your plan to invite more members.");
       return;
    }
    createInviteMutation.mutate({
      email: inviteEmail.toLowerCase(),
      role: inviteRole,
      type: 'sent',
      maxUses: 1
    }, {
      onSuccess: () => {
        toast.success(`Invitation sent to ${inviteEmail}!`);
        setShowInviteModal(false);
        setInviteEmail('');
      }
    });
  }, [inviteEmail, inviteRole, isFull, createInviteMutation]);

  const handleRemoteWipe = React.useCallback(async (targetUser: Member) => {
    if (!isSuperFounder) return;
    setConfirmModal({
      isOpen: true,
      title: 'CRITICAL SECURITY ACTION: Remote Wipe Device',
      message: `Are you sure you want to REMOTE WIPE ${targetUser.display_name || targetUser.name || targetUser.email}'s device? This will clear all local data and revoke access immediately.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsWiping(targetUser.id);
        try {
          const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
          const response = await fetch('/api/admin/remote-wipe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': idToken ? `Bearer ${idToken}` : ''
            },
            body: JSON.stringify({
              targetUserId: targetUser.id
            })
          });

          const result = await response.json();
          if (result.success) {
            toast.success(`Remote wipe triggered for ${targetUser.display_name || targetUser.name || targetUser.email}.`);
          } else {
            throw new Error(result.error || 'Failed to trigger remote wipe');
          }
        } catch (error: any) {
          console.error("Remote Wipe Error:", error);
          toast.error(`Error: ${error.message}`);
        } finally {
          setIsWiping(null);
        }
      }
    });
  }, [isSuperFounder, user]);

  const handleBulkReassign = React.useCallback(async () => {
    if (!isSuperFounder) return;
    if (!reassignData.source || !reassignData.target) {
      toast.error("Please select both source and target agents.");
      return;
    }
    
    setIsReassigning(true);
    try {
      const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const response = await fetch('/api/admin/bulk-reassign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify({
          sourceUserId: reassignData.source,
          targetUserId: reassignData.target,
          count: parseInt(reassignData.count) || 0
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Successfully reassigned ${result.count} leads.`);
        setReassignData({ source: '', target: '', count: '' });
      } else {
        throw new Error(result.error || 'Failed to reassign leads');
      }
    } catch (error: any) {
      console.error("Reassign Error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsReassigning(false);
    }
  }, [isSuperFounder, reassignData, user]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'disabled': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'removed': return 'bg-red-100 text-red-700 border-red-200';
      case 'incomplete profile': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  const getViaIcon = (via: string) => {
    switch (via?.toLowerCase()) {
      case 'qr_live':
      case 'qr scan': return QrCode;
      case 'join_code':
      case 'join code': return Zap;
      case 'link': return ExternalLink;
      case 'manual': return UserPlus;
      default: return Activity;
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'requests':
        return (
          <RequestsSection 
            requests={requests}
            availableSeats={availableSeats}
            isFull={isFull}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onSelect={setSelectedItem}
            getViaIcon={getViaIcon}
          />
        );
      case 'join-tools':
        return (
          <TeamJoinToolsSection 
            availableSeats={availableSeats} 
            isFull={isFull} 
            pendingRequestsCount={pendingRequestsCount} 
            overLimitCount={overLimitCount} 
            invites={invites}
            onGenerateQR={handleGenerateQR}
            onGenerateJoinCode={handleGenerateJoinCode}
            onRevokeInvite={handleRevokeInvite}
          />
        );
      case 'activity':
        return <ActivityLogsSection auditLogs={auditLogs} />;
      case 'settings':
        return <TeamSettingsSection teamSettings={teamSettings} handleToggleSetting={handleToggleSetting} handleUpdateSetting={handleUpdateSetting} />;
      case 'members':
        return (
          <MembersSection 
            members={members}
            displayedMembers={displayedMembers}
            filteredMembers={filteredMembers}
            isLoadingMembers={isLoadingMembers}
            inputValue={inputValue}
            setInputValue={setInputValue}
            setShowInviteModal={setShowInviteModal}
            teamSettings={teamSettings}
            getStatusColor={getStatusColor}
            getViaIcon={getViaIcon}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            onDisable={(m: Member) => {
              setConfirmModal({
                isOpen: true,
                title: 'Disable Member?',
                message: `Are you sure you want to disable ${m.display_name || m.name || m.email}? Their seat will be freed and their device remote wiped.`,
                onConfirm: () => {
                  setMemberToProcess(m);
                  setProcessAction('disable');
                  setShowTransferModal(true);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
            onRemove={(m: Member) => {
              setConfirmModal({
                isOpen: true,
                title: 'Remove Member?',
                message: `Are you sure you want to remove ${m.display_name || m.name || m.email} from the team?`,
                onConfirm: () => {
                  setMemberToProcess(m);
                  setProcessAction('remove');
                  setShowTransferModal(true);
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
              });
            }}
            onSelect={(m: Member) => setSelectedItem({ ...m, type: 'member' })}
          />
        );
      case 'availability':
        return <AvailabilitySection agentStatuses={agentStatuses} />;
      case 'attendance':
        return <AttendanceSection companyId={companyId} members={members} />;
      case 'targets':
        return <TeamTargetsSection />;
      case 'announcements':
        return <TeamAnnouncementsSection />;
      case 'reassign':
        return (
          <ReassignSection 
            isSuperFounder={isSuperFounder}
            members={members}
            reassignData={reassignData}
            setReassignData={setReassignData}
            isReassigning={isReassigning}
            handleBulkReassign={handleBulkReassign}
          />
        );
      default:
        const moduleName = TEAM_MENU_ITEMS.find(m => m.id === activeSection)?.label || 'Module';
        return (
          <div className="flex flex-col items-center justify-center min-h-[600px] text-gray-400 p-8">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 rounded-[32px] bg-brand-50 flex items-center justify-center mb-8 border border-brand-100"
            >
              <Sparkles size={48} className="text-brand-300" />
            </motion.div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{moduleName} Optimization</h3>
            <p className="text-gray-500 mt-4 max-w-sm text-center leading-relaxed font-medium">
              The <span className="text-brand-600 font-bold">{moduleName}</span> module is currently locked in our sandbox vault. 
              Real-time synchronization and KPI tracking are undergoing migration to our production edge cluster.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all">
                Enable Beta Channel
              </button>
              <button className="flex-1 px-8 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all">
                API Docs
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto relative space-y-8">
      <TrialLockOverlay />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      
      {/* Premium Operational Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {React.useMemo(() => [
          { label: 'Purchased Seats', value: memberLimit, icon: CreditCard, color: 'text-gray-400' },
          { label: 'Active Members', value: activeMembersCount, icon: UserCheck, color: 'text-green-600' },
          { label: 'Available Seats', value: availableSeats, icon: Sparkles, color: 'text-brand-600', highlight: availableSeats < 2 },
          { label: 'Pending Requests', value: pendingRequestsCount, icon: UserPlus, color: 'text-orange-500' },
          { label: 'Disabled/Removed', value: disabledMembersCount, icon: UserX, color: 'text-gray-400' },
          { label: 'Today Active', value: todayActiveCallers, icon: Activity, color: 'text-brand-600' },
        ], [memberLimit, activeMembersCount, availableSeats, pendingRequestsCount, disabledMembersCount, todayActiveCallers]).map((stat, i) => (
          <StatCard key={i} stat={stat} />
        ))}
      </div>

      {/* Lead Transfer / Seat Release Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowTransferModal(false)}
               className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[120]"
            />
            <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[48px] shadow-2xl z-[121] overflow-hidden"
            >
               <div className="p-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${processAction === 'remove' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                        {processAction === 'remove' ? <Trash2 size={32} /> : <UserX size={32} />}
                     </div>
                     <div>
                        <h3 className="text-2xl font-black text-gray-900 leading-tight">
                           {processAction === 'remove' ? 'Remove Member' : 'Disable Member'}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">Safe operational handoff for {memberToProcess?.display_name || memberToProcess?.name}</p>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="bg-gray-50 rounded-3xl border border-gray-100 p-6 space-y-4">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Mandatory Lead Handoff</p>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                           This member has <span className="font-bold text-gray-900">{memberToProcess?.assigned_leads || 0} assigned leads</span>. You must choose where to move these leads before proceeding.
                        </p>
                        <div className="space-y-3 pt-2">
                           {[
                              { id: 'ADMIN_POOL', label: 'Move to Admin Pool (Unassigned)', sub: 'Available for any agent to pick up' },
                              ...members.filter(m => m.id !== memberToProcess?.id && m.status === 'active').map(m => ({
                                 id: m.id,
                                 label: `Transfer to ${m.display_name || m.name || m.email}`,
                                 sub: `Directly reassign to ${m.role || 'Agent'}`
                              }))
                           ].map(opt => (
                              <button 
                                 key={opt.id}
                                 onClick={() => setTransferTarget(opt.id || '')}
                                 className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${transferTarget === opt.id ? 'border-brand-600 bg-brand-50' : 'border-gray-100 bg-white hover:border-brand-200'}`}
                              >
                                 <p className={`text-sm font-bold ${transferTarget === opt.id ? 'text-brand-900' : 'text-gray-900'}`}>{opt.label}</p>
                                 <p className="text-[10px] text-gray-400 font-medium">{opt.sub}</p>
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100 flex items-start gap-4">
                        <Sparkles className="text-brand-600 animate-pulse shrink-0" size={20} />
                        <div>
                           <p className="text-xs font-bold text-brand-900">Seat Management</p>
                           <p className="text-[10px] text-brand-700 font-medium leading-relaxed">
                              Proceeding will instantly <span className="font-bold">release 1 seat</span> ({usedSeats - 1}/{memberLimit} total used). Historical call logs and performance data remain preserved.
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                     <button 
                        onClick={() => setShowTransferModal(false)}
                        className="py-4 rounded-3xl bg-gray-50 border border-gray-100 text-gray-500 font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                     >
                        Cancel
                     </button>
                     <button 
                        onClick={handleProcessMember}
                        className={`py-4 rounded-3xl text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all ${processAction === 'remove' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-100'}`}
                     >
                        Confirm & Process
                     </button>
                  </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showInviteModal && (
        <AnimatePresence>
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[110]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[48px] shadow-2xl z-[111] overflow-hidden"
            >
               <div className="p-10 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
                     <Mail size={40} className="text-brand-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Invite New Member</h3>
                  <p className="text-sm text-gray-500 mb-8">Send an invitation link to add an agent or admin to your team.</p>

                  <div className="space-y-6 text-left">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address *</label>
                        <div className="relative">
                           <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                           <input 
                             type="email"
                             value={inviteEmail}
                             onChange={(e) => setInviteEmail(e.target.value)}
                             placeholder="name@company.com"
                             className="w-full pl-12 pr-4 py-4 border-2 border-transparent bg-gray-50 focus:border-brand-500 focus:bg-white rounded-3xl outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Team Role</label>
                        <div className="grid grid-cols-2 gap-3">
                           {['Agent', 'Admin'].map(role => (
                              <button 
                                key={role}
                                onClick={() => setInviteRole(role)}
                                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${inviteRole === role ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-brand-200'}`}
                              >
                                 {role === 'Admin' ? <Shield size={18} /> : <Users size={18} />}
                                 {role}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className={`p-4 rounded-3xl border flex items-center justify-between ${isFull ? 'bg-red-50 border-red-100' : (remainingSeats === 1 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100')}`}>
                          <div className="flex items-center gap-3">
                             <CreditCard size={20} className={isFull ? 'text-red-500' : (remainingSeats === 1 ? 'text-orange-500' : 'text-gray-400')} />
                             <div>
                                <p className={`text-xs font-black uppercase tracking-widest ${isFull ? 'text-red-700' : (remainingSeats === 1 ? 'text-orange-700' : 'text-gray-600')}`}>
                                   {isFull ? 'Team Capacity Reached' : (remainingSeats === 1 ? 'Last Available Seat' : `${remainingSeats} Seats Remaining`)}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400">Current Plan: {plan_status}</p>
                             </div>
                          </div>
                          <button 
                            onClick={() => navigate('/dashboard/billing')}
                            className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                          >
                            Upgrade
                          </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-10">
                     <button 
                       onClick={() => setShowInviteModal(false)}
                       disabled={createInviteMutation.isPending}
                       className="py-4 rounded-3xl bg-gray-50 font-black text-gray-500 uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile"
                     >
                        Cancel
                     </button>
                     <button 
                       onClick={handleSendInvite}
                       disabled={isFull || createInviteMutation.isPending}
                       className="py-4 rounded-3xl bg-brand-600 text-white font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-100 disabled:opacity-70 flex items-center justify-center gap-2 disabled:cursor-not-allowed btn-tactile"
                     >
                        {createInviteMutation.isPending ? (
                          <>
                            <CallMindLoader size="xs" />
                            Sending...
                          </>
                        ) : isFull ? 'Plan Full' : <><ArrowRight size={20} /> Send Invite</>}
                     </button>
                  </div>
               </div>
            </motion.div>
          </>
        </AnimatePresence>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        {/* Sub-navigation Sidebar */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          <button 
            onClick={() => {
              if (onTabChange) {
                onTabChange('Home');
                navigate('/dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-600 transition-colors w-fit font-bold text-sm mb-2"
          >
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          
          <div className="px-4 py-4">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Team Hub</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Management Console</p>
          </div>
          
          <div className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto scrollbar-hide pb-2 lg:pb-0 px-2 lg:px-0">
            {TEAM_MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex-none lg:w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                  activeSection === item.id 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-100' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 bg-white lg:bg-transparent border lg:border-none border-gray-100'
                }`}
                style={{ width: 'max-content' }}
              >
                <item.icon size={20} className={`shrink-0 ${activeSection === item.id ? 'text-white' : 'text-gray-400 group-hover:text-brand-600'}`} />
                <div className="text-left w-max">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold leading-none">{item.label}</p>
                    {item.label.includes('(Beta)') && (
                      <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded ${activeSection === item.id ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600'}`}>Beta</span>
                    )}
                  </div>
                  <p className={`hidden lg:block text-[10px] mt-1 font-medium ${activeSection === item.id ? 'text-brand-100' : 'text-gray-400'}`}>
                    {item.description.replace(' (Beta)', '')}
                  </p>
                </div>
                {activeSection === item.id && (
                  <motion.div layoutId="activeIndicator" className="hidden lg:block ml-auto">
                    <ChevronRight size={16} />
                  </motion.div>
                )}
              </button>
            ))}
          </div>

          <div className="hidden lg:block mt-8 p-6 bg-gradient-to-br from-brand-600 to-brand-800 rounded-[32px] text-white relative overflow-hidden">
            <Zap className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Team Efficiency</p>
            <h4 className="text-2xl font-black">94.2%</h4>
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '94.2%' }}
                className="h-full bg-white"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="glass p-5 sm:p-10 rounded-[32px] sm:rounded-[48px] min-h-0 sm:min-h-[800px]"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Detail Slide-over Panel */}
      <AnimatePresence>
        {selectedItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
            >
               <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                  <div>
                     <h3 className="text-xl font-bold text-gray-900">{selectedItem.type === 'member' ? 'Member Profile' : 'Join Request Review'}</h3>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {selectedItem.id}
                     </p>
                  </div>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <XCircle size={24} className="text-gray-400" />
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Identity Section */}
                  <div className="flex flex-col items-center text-center">
                     <div className="w-24 h-24 rounded-[32px] bg-brand-50 flex items-center justify-center text-brand-600 font-black text-3xl mb-4 border-4 border-white shadow-lg shadow-brand-100/50">
                        {(selectedItem.name || selectedItem.display_name || selectedItem.email)?.charAt(0)}
                     </div>
                     <h2 className="text-2xl font-black text-gray-900">{selectedItem.name || selectedItem.display_name}</h2>
                     <p className="text-sm font-medium text-gray-500">{selectedItem.email}</p>
                     
                     <div className="flex flex-wrap justify-center gap-2 mt-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedItem.status || 'Active')}`}>
                           {selectedItem.status || 'Active'}
                        </span>
                        {selectedItem.role && (
                          <span className="px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-[10px] font-black uppercase tracking-widest text-blue-600">
                             {selectedItem.role}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-500">
                           {React.createElement(getViaIcon(selectedItem.requested_via || selectedItem.joined_via || 'Manual'), { size: 12 })}
                           {selectedItem.requested_via || selectedItem.joined_via || 'Manual'}
                        </div>
                     </div>
                  </div>

                  {/* Duplicate Warning */}
                  {selectedItem.type !== 'member' && members.some(m => m.email === selectedItem.email || m.phone === selectedItem.phone) && (
                     <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex gap-3">
                        <AlertCircle className="text-red-600 shrink-0" size={20} />
                        <div>
                           <p className="text-sm font-bold text-red-900">Possible Duplicate Found</p>
                           <p className="text-xs text-red-700 mt-0.5">A member with this phone or email already exists in your team.</p>
                        </div>
                     </div>
                  )}

                  {/* Detail Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                           <Phone size={14} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Phone</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {teamSettings.hidePhoneNumbers && selectedItem.type === 'member'
                            ? '********' + (selectedItem.phone?.slice(-4) || '****')
                            : (selectedItem.phone || 'Not Provided')}
                        </p>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                           <MapPin size={14} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{selectedItem.city || 'Not Provided'}</p>
                     </div>
                     <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 col-span-2">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                           <Globe size={14} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Languages</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{selectedItem.language || 'English (Global)'}</p>
                     </div>
                  </div>

                  {/* Seat Impact Logic */}
                  {selectedItem.type !== 'member' && (
                     <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seat Impact Analysis</h4>
                        <div className="p-5 border-2 border-dashed border-gray-100 rounded-3xl space-y-4">
                           <div className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                              <span className="text-xs font-bold text-gray-500">Current Seats</span>
                              <span className="text-sm font-black text-gray-900">{usedSeats}/{memberLimit}</span>
                           </div>
                           <div className="flex justify-between items-center bg-brand-50 p-3 rounded-xl border border-brand-100">
                              <span className="text-xs font-bold text-brand-700">Projected Seats</span>
                              <span className="text-sm font-black text-brand-700">{usedSeats + 1}/{memberLimit}</span>
                           </div>
                           {isFull && (
                              <p className="text-[10px] font-bold text-red-600 flex items-center gap-1.5 justify-center">
                                 <AlertCircle size={12} /> Limit reached. Approval restricted.
                              </p>
                           )}
                        </div>
                     </div>
                  )}

                  <div className="pt-4">
                     <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">
                        Requested {selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : 'Recently'}
                     </p>
                  </div>
               </div>

               <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                  {selectedItem.type === 'member' ? (
                     <div className="flex gap-3">
                        <button className="flex-1 px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-brand-500 active:scale-95 transition-all">
                           Edit Profile
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Disable Member?',
                              message: `Are you sure you want to disable ${selectedItem.display_name || selectedItem.name || selectedItem.email}? Their seat will be freed and their device remote wiped.`,
                              onConfirm: () => {
                                setMemberToProcess(selectedItem);
                                setProcessAction('disable');
                                setShowTransferModal(true);
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                setSelectedItem(null);
                              }
                            });
                          }}
                          className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 active:scale-95 transition-all"
                        >
                           Disable Member
                        </button>
                     </div>
                  ) : (
                     <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            handleApproveRequest(selectedItem);
                            setSelectedItem(null);
                          }}
                          disabled={isFull}
                          className={`flex-[2] px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all btn-tactile ${isFull ? 'bg-gray-200 text-gray-400' : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-100'}`}
                        >
                           {isFull ? 'Plan Limit Reached' : 'Approve Admission'}
                        </button>
                        <button 
                          onClick={() => {
                            handleRejectRequest(selectedItem.id, selectedItem.name);
                            setSelectedItem(null);
                          }}
                          className="flex-1 px-6 py-4 bg-white border border-gray-200 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-100 transition-all"
                        >
                           Reject
                        </button>
                     </div>
                  )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TelecallerInviteModal 
        isOpen={showTelecallerPairModal} 
        onClose={() => setShowTelecallerPairModal(false)} 
        companyName={companyData?.name || 'My Workspace'} 
        companyId={companyId || ''} 
        joinCode={invites.find(i => i.type === 'join_code')?.join_code || 'CALLMIND-6829'} 
      />
    </div>
  );
};
