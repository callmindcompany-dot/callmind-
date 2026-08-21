import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import CallMindLoader from './CallMindLoader';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  MoreVertical, 
  Mail, 
  Phone, 
  MessageSquare,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  FileSpreadsheet,
  Settings2,
  UserPlus,
  Zap,
  Calendar,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Database,
  FileCheck,
  Trophy,
  Kanban,
  Shuffle,
  Sparkles,
  BrainCircuit,
  Check,
  Inbox,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { usePlan } from '../hooks/usePlan';
import { useCompany } from '@/CompanyContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { PipelineBoard } from './PipelineBoard';
import { isLeadRotting } from '@/utils/leadRotting';
import { UpgradeModal } from './UpgradeModal';
import { SmartImportModal } from './SmartImportModal';
import { CustomFieldManager } from './CustomFieldManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLeadsQuery, LEAD_SORT_LABELS, type LeadSort } from '@/hooks/useLeadsQuery';
import { useTeamSettingsQuery } from '@/hooks/useTeamSettingsQuery';
import { useImportLogsQuery } from '@/hooks/useImportLogsQuery';
import { useAgentsQuery } from '@/hooks/useAgentsQuery';
import { useLeadMutations } from '@/hooks/useLeadMutations';
import { supabase } from '@/supabaseClient';
import { ActionProgressBar } from './ActionProgressBar';
import { SkeletonLoader } from './SkeletonLoader';
import { ErrorBoundary } from './ErrorBoundary';
import { LeadsPagination } from './LeadsPagination';
import { ConfirmModal } from './ConfirmModal';
import { maskPhone } from '@/website/components/dataMasking';
import { logActivity } from '@/lib/audit';
import { trackTrialEvent } from '@/utils/trialTracking';

// Modular Lead System Imports
import { LeadDetail } from '@/features/leads/LeadDetail';
import { LeadFiltersPanel } from '@/features/leads/LeadFilters';
import { LeadForm } from '@/features/leads/LeadForm';
import { LeadImport } from '@/features/leads/LeadImport';
import { LeadFilters as ModularLeadFilters } from '@/types/lead';
import { incrementAIUsage } from '@/lib/aiUsage';

// Split Refactored Leads Components
import { LeadTable } from './leads/LeadTable';
import { BulkActionBar } from './leads/BulkActionBar';
import { LeadFilterBar } from './leads/LeadFilterBar';
import { LeadDistributionPanel } from './leads/LeadDistributionPanel';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'Interested' | 'Call Back' | 'Not Required' | 'Converted' | 'Rejected';
  createdAt: any;
  date?: string;
  assignedTo?: string;
  companyId?: string;
  brand?: string;
  source?: string;
  engagement?: string;
  state?: string;
  city?: string;
  address?: string;
  reference?: string;
  comment?: string;
  branch?: string;
  priority?: string;
  description?: string;
  estimatedBudget?: string;
  facebookAdName?: string;
  isDeleted?: boolean;
  isUnseen?: boolean;
  neuralScore?: number;
  isDuplicate?: boolean;
  customData?: Record<string, any>; // Flexibile storage for unknown import fields
}

const LeadScore = React.memo(({ score }: { score: number }) => {
  const [showInsight, setShowInsight] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setShowInsight(!showInsight);
        }}
        className="relative w-12 h-12 flex items-center justify-center group"
      >
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            className="text-white/5"
          />
          <motion.circle
            cx="24"
            cy="24"
            r="18"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            initial={{ strokeDasharray: "0 113" }}
            animate={{ strokeDasharray: `${(113 * score) / 100} 113` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-brand-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-black text-brand-400 group-hover:scale-110 transition-transform">
          {score}%
        </span>
      </button>

      <AnimatePresence>
        {showInsight && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            className="absolute right-full mr-4 top-0 w-64 bg-white border border-gray-100 shadow-xl p-4 z-50 rounded-2xl"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-brand-600" />
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Lead Insight</h4>
            </div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Based on recent interactions, this lead shows positive engagement patterns.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.score === nextProps.score;
});
LeadScore.displayName = 'LeadScore';

const LeadHistoryTimeline = React.memo(() => {
  const events = [
    { type: 'Call', icon: Phone, time: '2h ago', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { type: 'WhatsApp', icon: MessageSquare, time: '5h ago', color: 'text-green-400', bg: 'bg-green-500/10' },
    { type: 'Note', icon: FileText, time: '1d ago', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="relative pl-8 space-y-8">
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-500/30 via-brand-500/10 to-transparent" />
      {events.map((event, i) => (
        <div key={i} className="relative">
          <div className={`absolute -left-[31px] top-0 w-8 h-8 rounded-full ${event.bg} border-2 border-slate-950 shadow-lg flex items-center justify-center z-10 group cursor-pointer hover:scale-110 transition-transform`}>
            <event.icon size={14} className={event.color} />
            <div className={`absolute inset-0 rounded-full ${event.color.replace('text-', 'bg-')} opacity-20 animate-ping group-hover:opacity-40`} />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{event.type}</p>
            <p className="text-[10px] text-gray-500">{event.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
});
LeadHistoryTimeline.displayName = 'LeadHistoryTimeline';

const DuplicateBanner = React.memo(() => (
  <div className="inline-flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg text-[10px] font-bold text-amber-600 animate-pulse">
    <AlertCircle size={12} />
    Duplicate Detected
  </div>
));
DuplicateBanner.displayName = 'DuplicateBanner';

const FeatureCard = React.memo(({ title, description, icon: Icon, color, onClick, count, isPhase2, hasVipAccess, isSecondary }: any) => {
  const isLocked = isPhase2 && !hasVipAccess;
  
  return (
    <motion.button
      whileHover={!isLocked ? { y: -5 } : {}}
      onClick={onClick}
      className={`bg-white border p-8 shadow-sm transition-all text-left group flex flex-col h-full relative overflow-hidden rounded-[32px] w-full
        ${isLocked ? 'border-gray-50 opacity-60 grayscale cursor-not-allowed' : 'border-gray-100 hover:shadow-lg hover:border-brand-200'}
        ${isSecondary ? 'p-6' : 'p-8'}`}
    >
      {/* Large Background Icon */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity rotate-12 group-hover:rotate-0 transition-transform duration-500">
        <Icon size={160} className={color.replace('bg-', 'text-')} />
      </div>

      <div className={`w-14 h-14 rounded-2xl ${isLocked ? 'bg-gray-100 text-gray-400' : `${color.replace('600', '50')} ${color.replace('bg-', 'text-')}`} flex items-center justify-center mb-6 transition-transform relative z-10 shadow-sm ${!isLocked && 'group-hover:scale-110'}`}>
        {isLocked ? <Lock size={28} /> : <Icon size={28} />}
      </div>
      
      {count !== undefined && !isLocked && (
        <div className="absolute top-8 right-8 bg-gray-50 px-3 py-1 rounded-full text-xs font-bold text-gray-500 border border-gray-100">
          {count}
        </div>
      )}
      
      {isLocked && (
        <div className="absolute top-8 right-8 bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">
          Locked
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className={`text-xl font-black tracking-tight mb-2 ${isLocked ? 'text-gray-400' : 'text-slate-900 group-hover:text-blue-600 transition-colors'}`}>
          {title}
        </h3>
        <p className={`text-sm leading-relaxed mb-6 flex-1 font-medium ${isLocked ? 'text-gray-300' : 'text-slate-500'}`}>
          {description}
        </p>
        
        <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-all
          ${isLocked ? 'text-gray-300' : 'text-blue-600 group-hover:gap-3'}`}>
          {isLocked ? 'Coming Soon' : 'Launch Workspace'}
          {!isLocked && <ArrowRight size={16} />}
        </div>
      </div>
    </motion.button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.color === nextProps.color &&
    prevProps.count === nextProps.count &&
    prevProps.isPhase2 === nextProps.isPhase2 &&
    prevProps.hasVipAccess === nextProps.hasVipAccess &&
    prevProps.isSecondary === nextProps.isSecondary
  );
});
FeatureCard.displayName = 'FeatureCard';

export const StatusBadge = React.memo(({ status, variant = 'default' }: { status: string, variant?: 'default' | 'inbox' }) => {
  if (variant === 'inbox') {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">
        {status}
      </span>
    );
  }

  if (status === 'New') {
    return (
      <span className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-block min-w-[100px]">
        Fresh Lead
      </span>
    );
  }
  
  const colorClass = status === 'Call Back' ? 'bg-fuchsia-500' : status === 'Interested' ? 'bg-green-500' : 'bg-teal-400';
  return (
    <span className={`px-4 py-1.5 rounded-full text-xs font-bold text-white tracking-wide shadow-sm inline-block min-w-[100px] ${colorClass}`}>
      {status}
    </span>
  );
}, (prev, next) => prev.status === next.status && prev.variant === next.variant);
StatusBadge.displayName = 'StatusBadge';

export const LeadAvatar = React.memo(({ name, variant = 'default' }: { name: string, variant?: 'default' | 'detail' }) => {
  if (variant === 'detail') {
    return (
      <div className="w-16 h-16 rounded-3xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-brand-100">
        {name.charAt(0)}
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
      {name.charAt(0)}
    </div>
  );
}, (prev, next) => prev.name === next.name && prev.variant === next.variant);
LeadAvatar.displayName = 'LeadAvatar';

export const INDIA_STATES_CITIES: Record<string, string[]> = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Kolhapur"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "Dwarka"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Noida", "Ghaziabad"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri"]
};

import { TrialLockOverlay } from './TrialLockOverlay';

// --- Hub Workspaces ---

const LeadInboxView = ({ leads, agents, onSelectLead }: any) => {
  const inboxLeads = leads.filter((l: any) => !l.isDeleted && (l.status === 'New' || !l.assignedTo));
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'New Signals', count: inboxLeads.length, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Unassigned', count: inboxLeads.filter((l:any) => !l.assignedTo).length, icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Immediate Attention', count: inboxLeads.filter((l:any) => l.priority === 'High').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500">{stat.label}</p>
                <h4 className="text-2xl font-black text-gray-900">{stat.count}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Triage Queue</h2>
          <span className="text-xs font-bold text-gray-400">Showing {inboxLeads.length} leads requiring sorting</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inboxLeads.length > 0 ? inboxLeads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50/50 cursor-pointer group" onClick={() => onSelectLead(lead)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <LeadAvatar name={lead.name} />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{lead.source || 'Direct'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={lead.status} variant="inbox" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-brand-600 bg-gray-50 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 shadow-sm">
                      <ArrowRight size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-gray-400 italic">No new leads in the inbox. You're all caught up!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ImportCenterView = ({ setShowSmartImport, importLogs }: any) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 mb-10">
        <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[30px] flex items-center justify-center mx-auto shadow-sm mb-6">
          <Upload size={32} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Bulk Import Center</h2>
        <p className="text-gray-500 font-medium max-w-lg mx-auto">Upload your leads via CSV or Excel mapping. We'll handle checking for duplicates automatically.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => setShowSmartImport(true)}
          className="p-10 bg-white border-2 border-dashed border-purple-100 rounded-[40px] hover:border-purple-300 hover:bg-purple-50/30 transition-all group flex flex-col items-center text-center space-y-4 shadow-sm"
        >
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Upload CSV / Excel</h3>
            <p className="text-sm text-gray-500">Manual mapping with duplicate detection</p>
          </div>
        </button>

        <div className="p-10 bg-slate-900 rounded-[40px] text-white space-y-6 relative overflow-hidden">
          <Database className="absolute -right-10 -bottom-10 w-48 h-48 opacity-10" />
          <div className="relative z-10 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-brand-400" />
              Standard Validation
            </h3>
            <ul className="space-y-3 text-sm text-slate-400 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                DNC & Duplicate Checking
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Agent Distribution (Round Robin)
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Recent Import History</h3>
        <div className="space-y-4">
          {importLogs && importLogs.length > 0 ? importLogs.map((item: any, i: number) => (
            <div key={item.id || i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{item.fileName || item.name || 'Untitled Import'}</p>
                  <p className="text-xs text-gray-500">
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : item.date || 'Processing...'} • {item.recordCount || item.count || 0} leads
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                item.status === 'Completed' || item.status === 'completed' 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {item.status || 'Pending'}
              </span>
            </div>
          )) : (
            <div className="py-10 text-center text-gray-400 italic">No imports yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};



const LeadRulesView = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ShieldCheck className="text-slate-700" /> Lead Protocols
        </h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between py-4 border-b border-gray-50">
            <div>
              <p className="text-sm font-bold text-gray-900">Data Masking</p>
              <p className="text-xs text-gray-500">Hide full contact details from agents</p>
            </div>
            <div className="w-12 h-6 bg-emerald-500 rounded-full relative p-1 cursor-pointer">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1" />
            </div>
          </div>
          <div className="flex items-center justify-between py-4 border-b border-gray-50">
            <div>
              <p className="text-sm font-bold text-gray-900">Duplicate Prevention</p>
              <p className="text-xs text-gray-500">Reject exact matches on creation</p>
            </div>
            <div className="w-12 h-6 bg-slate-200 rounded-full relative p-1">
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </div>
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-bold text-gray-900">Retention Policy</p>
              <p className="text-xs text-gray-500">Move uncontacted leads to Database after 90 days</p>
            </div>
            <span className="text-xs font-black text-slate-400">90 DAYS</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-[32px] text-white">
        <h3 className="text-lg font-bold mb-6">Status Architecture</h3>
        <div className="space-y-3">
          {['New', 'Contacted', 'Interested', 'Call Back', 'Converted', 'Rejected'].map((status) => (
            <div key={status} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-sm font-bold">{status}</span>
              <div className="flex-1" />
              <button className="text-[10px] uppercase font-black text-white/30 hover:text-white transition-colors">Edit</button>
            </div>
          ))}
          <button className="w-full py-3 mt-4 border-2 border-dashed border-white/10 text-white/40 rounded-xl text-xs font-black uppercase tracking-widest hover:border-white/30 hover:text-white transition-all">
            + Add custom status
          </button>
        </div>
      </div>
    </div>
  </div>
);

const RecycleBinView = ({ leads, toggleDeleteLead }: any) => {
  const deletedLeads = leads.filter((l: any) => l.isDeleted);
  
  return (
    <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
      <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-rose-50/30">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recycle Bin</h2>
          <p className="text-sm text-gray-500">Records here are permanently removed after 30 days of inactivity.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-rose-600 bg-rose-100 px-3 py-1 rounded-full uppercase tracking-widest">
            {deletedLeads.length} Items
          </span>
          <button className="text-xs font-black text-gray-400 hover:text-rose-600 transition-colors uppercase tracking-widest">
            Empty Bin
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-gray-400">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Lead Name</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Deleted On</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deletedLeads.length > 0 ? deletedLeads.map((lead: any) => (
              <tr key={lead.id} className="hover:bg-gray-50/50 group">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                  <p className="text-xs text-gray-500">{lead.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-gray-500">
                    {lead.updatedAt ? new Date(lead.updatedAt.toMillis()).toLocaleDateString() : 'Recently'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleDeleteLead(lead.id, true)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
                    >
                      Restore
                    </button>
                    <button className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center text-gray-400 italic">Recycle bin is empty.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LeadDatabaseView = ({ leads }: any) => {
  const sources = leads.reduce((acc: any, curr: any) => {
    acc[curr.source || 'Others'] = (acc[curr.source || 'Others'] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Records', value: leads.length, color: 'text-blue-600' },
          { label: 'Retention Health', value: '98%', color: 'text-emerald-600' },
          { label: 'Data Quality', value: 'High', color: 'text-brand-600' },
          { label: 'Master Sync', value: 'Online', color: 'text-indigo-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">Global Inventory Summary</h3>
            <button className="text-xs font-bold text-brand-600 hover:underline">Download Master Sheet</button>
          </div>
          <div className="space-y-4">
            {Object.entries(sources).map(([source, count]: [any, any]) => (
              <div key={source} className="group cursor-default">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">{source}</span>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{count} Leads</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / leads.length) * 100}%` }}
                    className="h-full bg-sky-500 rounded-full group-hover:bg-sky-600 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-sky-900 rounded-[40px] p-8 text-white relative overflow-hidden">
          <Database className="absolute -right-6 -bottom-6 w-48 h-48 opacity-10" />
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-6">Database Health</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-1.5 h-12 bg-emerald-400 rounded-full" />
                <div>
                  <p className="text-sm font-bold">Cloud Sync Active</p>
                  <p className="text-xs text-sky-200">Real-time replication enabled across clusters</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1.5 h-12 bg-amber-400 rounded-full" />
                <div>
                  <p className="text-sm font-bold">Cold Storage (5.2k)</p>
                  <p className="text-xs text-sky-200">Automated archiving of inactive records</p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-brand-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-2">Record Integrity</p>
                <div className="p-3 bg-brand-950 rounded-xl font-mono text-[10px] text-brand-600 break-all">
                  Registry Status: Active
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const formatSafeDate = (dateInput: any) => {
  if (!dateInput) return '-';
  if (typeof dateInput.toDate === 'function') {
    try {
      const date = dateInput.toDate();
      return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch {}
  }
  const parsed = new Date(dateInput.seconds ? dateInput.seconds * 1000 : dateInput);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB') + ' ' + parsed.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  return '-';
};



const LeadManagementKPIs = ({ leads, currentFilter, onFilterChange }: any) => {
  const stats = [
    { label: 'Total Leads', count: leads.length, filter: 'All', color: 'blue' },
    { label: 'New', count: leads.filter((l: any) => l.status === 'New').length, filter: 'New', color: 'indigo' },
    { label: 'Follow-up Due', count: leads.filter((l: any) => l.status === 'Call Back').length, filter: 'Call Back', color: 'orange' },
    { label: 'Interested', count: leads.filter((l: any) => l.status === 'Interested').length, filter: 'Interested', color: 'emerald' },
    { label: 'Converted', count: leads.filter((l: any) => l.status === 'Converted').length, filter: 'Converted', color: 'purple' },
    { label: 'Duplicates', count: leads.filter((l: any) => l.isDuplicate).length, filter: 'Duplicates', color: 'rose' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={() => onFilterChange(stat.filter)}
          className={`p-4 rounded-2xl border-2 transition-all text-left group
            ${currentFilter === stat.filter 
              ? `border-${stat.color}-500 bg-${stat.color}-50` 
              : 'border-gray-100 bg-white hover:border-gray-200'}`}
        >
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-500">
            {stat.label}
          </p>
          <h4 className={`text-xl font-black ${currentFilter === stat.filter ? `text-${stat.color}-600` : 'text-gray-900'}`}>
            {stat.count}
          </h4>
        </button>
      ))}
    </div>
  );
};

export const LeadsPage = ({ onTabChange }: { onTabChange?: (tab: string) => void }) => {
  const { isGodMode, isFounder, profile, canAccessSequences, user, isTester, isUserView } = useAuth() as any;
  const plan = usePlan();
  const { companyId } = useCompany();
  
  const isWhitelisted = isFounder || isTester;
  const hideLocks = isWhitelisted && !isUserView;
  const hasVipAccess = hideLocks;
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [activeSourceCategory, setActiveSourceCategory] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Derived from the signed-in user's real role, not hardcoded.
  //
  // This was `useState(true)` with a "Mock admin status" comment and setIsAdmin
  // was never called, so every user counted as an admin. The only thing it
  // gates is phone/email masking (see dataMasking.ts: `if (isAdmin) return
  // phone` returns the number unmasked), which meant the "Hide Phone Numbers"
  // team setting saved fine and did nothing — every telecaller still saw every
  // full number. That setting exists precisely to stop a telecaller walking off
  // with the lead database.
  const isAdmin = isFounder || isGodMode || profile?.role === 'admin' || profile?.role === 'sub_admin';
  const [activeFilters, setActiveFilters] = useState<ModularLeadFilters>({});
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const [inputValue, setInputValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showOnlyRotting, setShowOnlyRotting] = useState(false);
  const [scoreFilter, setScoreFilter] = useState('');
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [leadSort, setLeadSort] = useState<LeadSort>('newest');
  const [activeView, setActiveView] = useState<'all' | 'mine' | 'inbox'>('mine');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const [editingSettings, setEditingSettings] = useState<any>(null);

  const { data: teamSettingsData } = useTeamSettingsQuery(companyId);

  useEffect(() => {
    if (showFieldSettings && teamSettingsData) {
      setEditingSettings({
        fieldLabels: { ...(teamSettingsData.fieldLabels || {}) },
        customFields: teamSettingsData.customFields ? [...teamSettingsData.customFields] : [],
        hidePhoneNumbers: teamSettingsData.hidePhoneNumbers ?? false,
        rottingThreshold: teamSettingsData.rottingThreshold ?? 3
      });
    }
  }, [showFieldSettings, teamSettingsData]);
  const { data: importLogs = [] } = useImportLogsQuery(companyId, { source: '', status: '', startDate: '', endDate: '' });
  const { data: agents = [] } = useAgentsQuery(companyId);
  
  const defaultFieldLabels = useMemo(() => ({
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    status: 'Status',
    reference: 'Reference',
    comment: 'Comment',
    date: 'Date',
    branch: 'Branch',
    source: 'Source',
    priority: 'Priority',
    description: 'Description',
    estimatedBudget: 'Estimated Budget',
    state: 'State',
    city: 'City',
    address: 'Address',
    facebookAdName: 'Facebook Ad Name',
    engagement: 'Engagement'
  }), []);

  const teamSettings = useMemo(() => {
    return {
      hidePhoneNumbers: teamSettingsData?.hidePhoneNumbers ?? false,
      rottingThreshold: teamSettingsData?.rottingThreshold ?? 3,
      fieldLabels: {
        ...defaultFieldLabels,
        ...(teamSettingsData?.fieldLabels || {})
      }
    };
  }, [teamSettingsData, defaultFieldLabels]);

  const rottingThreshold = teamSettings.rottingThreshold;

  // React Query allLeads query for dashboard counters, stats, and local fallback compatibility
  const { data: allLeads = [], refetch: refetchAllLeads } = useQuery({
    queryKey: ['allLeads', companyId],
    queryFn: async (): Promise<Lead[]> => {
      if (!companyId) return [];

      const isPlaceholder = false;
      if (isPlaceholder) {
        const savedLeads = localStorage.getItem('mock_leads') || localStorage.getItem('mock_sb_leads');
        if (savedLeads) {
          try {
            return JSON.parse(savedLeads);
          } catch (e) {
            console.error('Failed to parse mock leads', e);
          }
        }
        return [];
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_deleted', false);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email || '',
        phone: row.phone,
        status: row.status as Lead['status'],
        assignedTo: row.assigned_to || undefined,
        companyId: row.company_id || undefined,
        brand: row.brand || undefined,
        source: row.source || undefined,
        engagement: row.engagement || undefined,
        state: row.state || undefined,
        city: row.city || undefined,
        address: row.address || undefined,
        reference: row.reference || undefined,
        comment: row.comment || undefined,
        branch: row.branch || undefined,
        priority: row.priority || undefined,
        description: row.description || undefined,
        estimatedBudget: row.estimated_budget || undefined,
        facebookAdName: row.facebook_ad_name || undefined,
        isDeleted: row.is_deleted || undefined,
        isUnseen: row.is_unseen || undefined,
        neuralScore: row.neural_score || undefined,
        isDuplicate: row.is_duplicate || undefined,
        date: row.date || undefined,
        createdAt: row.created_at ? {
          toDate: () => new Date(row.created_at!),
          toMillis: () => new Date(row.created_at!).getTime(),
        } : null,
        updatedAt: row.updated_at ? {
          toDate: () => new Date(row.updated_at!),
          toMillis: () => new Date(row.updated_at!).getTime(),
        } : null,
        customData: row.custom_data || undefined,
      }));
    },
    enabled: !!companyId,
    staleTime: 10000,
  });

  const leads = allLeads;

  const [paginatedPage, setPaginatedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
      setPaginatedPage(1); // Reset page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Reset page when other filters change
  useEffect(() => {
    setPaginatedPage(1);
  }, [
    statusFilter, userFilter, sourceFilter, stateFilter, cityFilter,
    customFilters,
    scoreFilter, showOnlyRotting
  ]);

  // React Query Leads Query (paginated)
  const { data: leadsQueryResult, isLoading: paginatedLoading, refetch: refetchPaginated } = useLeadsQuery(
    {
      companyId: companyId || '',
      status: statusFilter,
      source: sourceFilter,
      assignedTo: userFilter || undefined,
      isFounderView: isFounder || isGodMode || canAccessSequences || activeView === 'all',
      userId: user?.uid,
      // dndFilter, languageFilter and engagementFilter were dropped: they
      // filtered on columns that exist in no migration, so choosing one made
      // the query fail and the list render empty.
      scoreFilter,
      stateFilter,
      cityFilter,
      customFilters,
      showOnlyRotting,
      rottingThreshold
    },
    paginatedPage,
    pageSize,
    searchQuery,
    leadSort
  );

  const paginatedLeads = (leadsQueryResult?.leads || []) as Lead[];
  const paginatedTotalCount = leadsQueryResult?.totalCount || 0;
  const paginatedTotalPages = leadsQueryResult?.totalPages || 0;
  const paginatedCurrentPage = leadsQueryResult?.currentPage || 1;

  // React Query Lead Mutations
  const { bulkDeleteMutation, bulkAssignMutation, bulkStatusMutation } = useLeadMutations(companyId);

  const [showCustomFieldsManager, setShowCustomFieldsManager] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  const panelFilters = useMemo<ModularLeadFilters>(() => ({
    status: statusFilter === 'All' ? [] : [statusFilter as any],
    source: sourceFilter ? [sourceFilter as any] : [],
    assignedTo: userFilter ? [userFilter] : [],
    stateFilter,
    cityFilter,
    customFilters,
    scoreFilter,
    showOnlyRotting,
  }), [
    statusFilter, sourceFilter, userFilter, stateFilter, cityFilter,
    customFilters,
    scoreFilter, showOnlyRotting
  ]);

  const handlePanelFiltersChange = React.useCallback((updated: ModularLeadFilters) => {
    if (updated.status) {
      setStatusFilter(updated.status[0] || 'All');
    }
    if (updated.source) {
      setSourceFilter(updated.source[0] || '');
    }
    if (updated.assignedTo) {
      setUserFilter(updated.assignedTo[0] || '');
    }
    if (updated.stateFilter !== undefined) {
      setStateFilter(updated.stateFilter || '');
    }
    if (updated.cityFilter !== undefined) {
      setCityFilter(updated.cityFilter || '');
    }
    if (updated.customFilters !== undefined) {
      setCustomFilters(updated.customFilters || {});
    }
    if (updated.scoreFilter !== undefined) {
      setScoreFilter(updated.scoreFilter || '');
    }
    if (updated.showOnlyRotting !== undefined) {
      setShowOnlyRotting(updated.showOnlyRotting || false);
    }
  }, []);

  const handleClearAllFilters = React.useCallback(() => {
    setInputValue('');
    setStatusFilter('All');
    setUserFilter('');
    setSourceFilter('');
    setStateFilter('');
    setCityFilter('');
    setCustomFilters({});
    setScoreFilter('');
    setShowOnlyRotting(false);
  }, []);

  const getLabel = (key: string, defaultLabel: string) => {
    return teamSettings?.fieldLabels?.[key as keyof typeof teamSettings.fieldLabels] || defaultLabel;
  };

  const handleSelectAll = React.useCallback((e: React.ChangeEvent<HTMLInputElement>, activeLeadsList: Lead[]) => {
    if (e.target.checked) {
      setSelectedLeadIds(activeLeadsList.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  }, []);

  const handleSelectLead = React.useCallback((e: React.ChangeEvent<HTMLInputElement>, leadId: string) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => {
      if (e.target.checked) {
        return prev.includes(leadId) ? prev : [...prev, leadId];
      } else {
        return prev.filter(id => id !== leadId);
      }
    });
  }, []);

  // Fix 6: Create toggleLeadSelection function
  const toggleLeadSelection = React.useCallback((id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const [distSelectedAgents, setDistSelectedAgents] = useState<Set<string>>(new Set());

  // Auto-select all agents by default when agents load
  useEffect(() => {
    if (agents.length > 0 && distSelectedAgents.size === 0) {
      setDistSelectedAgents(new Set(agents.map(a => a.id)));
    }
  }, [agents]);

  const handleToggleAgent = (agentId: string) => {
    const newSet = new Set(distSelectedAgents);
    if (newSet.has(agentId)) newSet.delete(agentId);
    else newSet.add(agentId);
    setDistSelectedAgents(newSet);
  };

  const handleAutoDistribute = async (unassignedLeads: Lead[]) => {
    if (unassignedLeads.length === 0 || distSelectedAgents.size === 0) return;
    
    // Safety check map
    const activeAgentIds = Array.from(distSelectedAgents);
    // Hardening: Filter down to active, valid agents inside current state
    const validAgentIds = activeAgentIds.filter(agentId => {
      const agent = agents.find(a => a.id === agentId);
      return agent && agent.companyId === companyId && agent.status === 'active';
    });

    if (validAgentIds.length === 0) {
      toast.error("No active team members selected for distribution.");
      return;
    }

    if (!window.confirm(`Distribute ${unassignedLeads.length} leads equally among ${validAgentIds.length} agents?`)) return;

    setIsSubmitting(true);
    try {
      // Hardening: Verify that the unassigned leads actually belong to this company
      const validLeads = unassignedLeads.filter(lead => lead && lead.companyId === companyId);
      if (validLeads.length === 0) {
        toast.error("No valid unassigned leads found under this company context.");
        return;
      }

      const promises = validLeads.map((lead, index) => {
        const agentIndex = index % validAgentIds.length;
        const targetAgentId = validAgentIds[agentIndex];
        
        return supabase
          .from('leads')
          .update({ 
            assigned_to: targetAgentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);
      });

      await Promise.all(promises);
      
      await logActivity({
        action: 'Bulk Lead Distribution',
        category: 'data',
        target: `${validLeads.length} leads distributed`,
        details: { agentCount: validAgentIds.length }
      });

      toast.success('Lead Distribution Successful!');
    } catch (error) {
       console.error("Distribution Error", error);
       toast.error("Failed to distribute leads.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fix 7: Bulk Progress Bar and Supabase chunking for Delete action
  const handleBulkDelete = React.useCallback(() => {
    if (selectedLeadIds.length === 0) {
      toast.error("Please select one or more leads to delete.");
      return;
    }
    // Fix 3: Show custom confirmation modal instead of window.confirm
    setShowDeleteConfirm(true);
  }, [selectedLeadIds]);

  const handleBulkDeleteProceed = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      const ids = selectedLeadIds;
      const total = ids.length;
      let current = 0;
      const CHUNK_SIZE = 10;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('leads')
          .delete()
          .in('id', chunk)
          .eq('company_id', companyId);

        if (error) throw error;

        current += chunk.length;
        setBulkActionProgress({
          progress: Math.round((current / total) * 100),
          title: 'Deleting selected leads...',
          total,
          current
        });
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      setSelectedLeadIds([]);
      toast.success("Successfully deleted selected leads.");
      refetchPaginated();
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      toast.error(err.message || "Failed to delete leads.");
    } finally {
      setIsSubmitting(false);
      setBulkActionProgress({ progress: 0, title: '', total: 0, current: 0 });
    }
  }, [selectedLeadIds, companyId, refetchPaginated]);


  const handleBulkStatusUpdate = React.useCallback(async (newStatus: string) => {
    setIsSubmitting(true);
    try {
      const ids = selectedLeadIds;
      const total = ids.length;
      let current = 0;
      const CHUNK_SIZE = 10;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('leads')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in('id', chunk)
          .eq('company_id', companyId);

        if (error) throw error;

        current += chunk.length;
        setBulkActionProgress({
          progress: Math.round((current / total) * 100),
          title: `Updating status to ${newStatus}...`,
          total,
          current
        });
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      setSelectedLeadIds([]);
      toast.success(`Updated status to ${newStatus} for selected leads!`);
      refetchPaginated();
    } catch (err: any) {
      console.error("Bulk status update failed:", err);
      toast.error(err.message || "Failed to update status.");
    } finally {
      setIsSubmitting(false);
      setBulkActionProgress({ progress: 0, title: '', total: 0, current: 0 });
    }
  }, [selectedLeadIds, companyId, refetchPaginated]);

  const handleBulkAssign = React.useCallback(async (agentId: string) => {
     if (selectedLeadIds.length === 0 || !agentId) return;

     // Hardening: Verify that the chosen target agent is valid and active in this company context
     const agent = agents.find(a => a.id === agentId);
     if (!agent || agent.companyId !== companyId || agent.status !== 'active') {
       toast.error("Selected agent is inactive, removed, or invalid for this company.");
       return;
     }

     if (!window.confirm(`Assign ${selectedLeadIds.length} leads to ${agent.name || 'this agent'}?`)) return;
     
     setIsSubmitting(true);
     try {
       // Hardening: Verify each lead belongs to the current company context
       const validIds = selectedLeadIds.filter(leadId => {
         const lead = paginatedLeads.find(l => l.id === leadId);
         return lead && lead.companyId === companyId;
       });

       if (validIds.length === 0) {
         toast.error("No valid leads found in selected set for this company.");
         return;
       }

       const total = validIds.length;
       let current = 0;
       const CHUNK_SIZE = 10;

       for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
         const chunk = validIds.slice(i, i + CHUNK_SIZE);
         const { error } = await supabase
           .from('leads')
           .update({ assigned_to: agentId, updated_at: new Date().toISOString() })
           .in('id', chunk)
           .eq('company_id', companyId);

         if (error) throw error;

         current += chunk.length;
         setBulkActionProgress({
           progress: Math.round((current / total) * 100),
           title: `Assigning leads to ${agent.name}...`,
           total,
           current
         });
         await new Promise(resolve => setTimeout(resolve, 150));
       }

       setSelectedLeadIds([]);

       await logActivity({
         action: 'Bulk Lead Assignment',
         category: 'data',
         target: `${validIds.length} leads assigned to ${agent.name}`,
         details: { agentId, agentName: agent.name }
       });

       toast.success('Leads successfully assigned!');
       refetchPaginated();
     } catch (error: any) {
       console.error("Assignment Error", error);
       toast.error(error.message || "Failed to assign leads.");
     } finally {
       setIsSubmitting(false);
       setBulkActionProgress({ progress: 0, title: '', total: 0, current: 0 });
     }
  }, [selectedLeadIds, agents, companyId, paginatedLeads, refetchPaginated]);

  // Fix 7 & Fix 4: Bulk Export callback with ActionProgressBar updates
  const handleBulkExport = React.useCallback(async () => {
    if (selectedLeadIds.length === 0) {
      toast.error("Please select one or more leads to export.");
      return;
    }
    
    setBulkActionProgress({
      progress: 0,
      title: 'Preparing lead export...',
      total: selectedLeadIds.length,
      current: 0
    });

    try {
      const leadsToExport = paginatedLeads.filter(l => selectedLeadIds.includes(l.id));
      
      if (leadsToExport.length === 0) {
        throw new Error("No lead data found for the selected IDs.");
      }

      setBulkActionProgress({
        progress: 50,
        title: 'Generating CSV file...',
        total: selectedLeadIds.length,
        current: Math.round(selectedLeadIds.length / 2)
      });
      await new Promise(resolve => setTimeout(resolve, 800));

      const headers = ['Name', 'Phone', 'Email', 'Status', 'Source', 'Priority', 'State', 'City', 'Created At'];
      const rows = leadsToExport.map(l => [
        l.name || '',
        l.phone || '',
        l.email || '',
        l.status || '',
        l.source || '',
        l.priority || '',
        l.state || '',
        l.city || '',
        l.createdAt ? (typeof l.createdAt.toDate === 'function' ? l.createdAt.toDate().toLocaleString() : new Date(l.createdAt as any).toLocaleString()) : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `callmind_leads_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setBulkActionProgress({
        progress: 100,
        title: 'Export completed!',
        total: selectedLeadIds.length,
        current: selectedLeadIds.length
      });
      toast.success("Successfully exported leads.");
    } catch (err: any) {
      console.error("Export failed:", err);
      toast.error(err.message || "Failed to export leads.");
    } finally {
      setTimeout(() => {
        setBulkActionProgress({ progress: 0, title: '', total: 0, current: 0 });
      }, 1000);
    }
  }, [selectedLeadIds, paginatedLeads]);

  const handleSelectLeadToView = React.useCallback(async (lead: Lead) => {
    setSelectedLead(lead);
    if (lead && (lead as any).isUnseen) {
      try {
        await supabase
          .from('leads')
          .update({ is_unseen: false })
          .eq('id', lead.id);
      } catch (err) {
        console.error("Failed to mark lead as seen:", err);
      }
    }
  }, []);

  const [bulkActionProgress, setBulkActionProgress] = useState<{
    progress: number;
    title: string;
    total: number;
    current: number;
  }>({ progress: 0, title: '', total: 0, current: 0 });


  const seedDummyData = async () => {
    if (!companyId) return;
    setIsSubmitting(true);
    try {
      const statuses: Lead['status'][] = ['New', 'Contacted', 'Interested', 'Call Back', 'Converted', 'Rejected'];
      const sources = ['Website', 'Import', 'Manual', 'API Integration', 'CRM Webhook', 'Facebook Ads'];
      const engagements = ['Connected', 'Not Connected', 'WhatsApp Connected', 'Connected Both'];
      const dummyNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya'];
      const states = Object.keys(INDIA_STATES_CITIES);
      const branches = ['Headquarters', 'Mumbai Branch', 'Pune Center'];
      const priorities = ['High', 'Medium', 'Low'];

      const batch: any[] = [];
      for(let i=0; i<30; i++) {
        const rState = states[Math.floor(Math.random()*states.length)];
        const rCity = INDIA_STATES_CITIES[rState][Math.floor(Math.random()*INDIA_STATES_CITIES[rState].length)];
        const rSource = sources[Math.floor(Math.random()*sources.length)];
        
        batch.push({
           name: dummyNames[i%10] + ' ' + Math.floor(Math.random()*1000),
           phone: '9' + Math.floor(100000000 + Math.random()*900000000).toString(),
           email: 'test' + i + '@example.com',
           status: statuses[Math.floor(Math.random()*statuses.length)],
           brand: rSource,
           source: rSource,
           engagement: engagements[Math.floor(Math.random()*engagements.length)],
           state: rState,
           city: rCity,
           reference: 'Ref-' + Math.floor(Math.random()*9999),
           comment: 'Initial Inquiry via ' + rSource,
           branch: branches[Math.floor(Math.random()*branches.length)],
           priority: priorities[Math.floor(Math.random()*priorities.length)],
           description: 'Needs detailed follow up regarding pricing',
           estimated_budget: (Math.floor(Math.random()*50) + 10) * 1000 + ' INR',
           address: 'Street ' + Math.floor(Math.random()*100) + ', ' + rCity,
           facebook_ad_name: rSource === 'Facebook Ads' ? 'Diwali_Offer_Campaign' : '',
           date: new Date().toLocaleDateString('en-GB'),
           created_at: new Date().toISOString(),
           is_deleted: false,
           is_unseen: true,
           assigned_to: agents.length > 0 ? agents[Math.floor(Math.random()*agents.length)].id : 'unassigned',
           company_id: companyId
        });
      }
      const { error: batchErr } = await supabase.from('leads').insert(batch);
      if (batchErr) throw batchErr;

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allLeads', companyId] });
      toast.success('30 Dummy leads created for testing the filters!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate dummy leads');
    } finally {
      setIsSubmitting(false);
    }
  };

  // The manual add-lead form is src/features/leads/LeadForm, rendered by the
  // Add Lead Modal below. It already collects city, state, budget, notes and
  // custom fields, and runs duplicate detection.
  //
  // The state and handler that used to live here belonged to an older modal
  // that is commented out further down. That insert sent `brand`, a column no
  // migration ever created, so every submission through it was rejected by
  // Postgres -- and TypeScript approved it because types/supabase.ts declared
  // the column. Removed rather than repaired: there is one add-lead form.



  const handleWhatsAppRedirect = (phone: string | undefined | null, text: string) => {
    if (!phone) {
      toast.error('❌ Cannot launch WhatsApp: Lead does not have a registered phone number.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error(`❌ Invalid phone format ("${phone}"). Minimal 10 numeric digits required.`);
      return;
    }
    if (!text || text.trim().length === 0) {
      toast.error('❌ Draft copy text is missing or blank.');
      return;
    }
    const encodedText = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const generateAIDraft = async (lead: Lead) => {
    if (!lead) {
      toast.error("❌ No active lead context selected.");
      return;
    }
    setIsGeneratingDraft(true);
    try {
      const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const targetName = lead.name || 'Valued Prospect';
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Generate a friendly Hinglish WhatsApp follow-up draft for ${targetName}. Context: Real estate inquiry on active properties. Please check back on their interest and offer assistance. Concise and conversational.`, 
          idToken,
          featureType: 'waDrafts',
          task: 'draft'
        })
      });
      const result = await response.json();
      if (response.ok && result.response) {
        setAiDraft(result.response);
        // Track AI Usage
        if (companyId) {
          await incrementAIUsage(companyId, 'waDrafts');
          if (user?.uid) {
            trackTrialEvent(companyId, user.uid, 'ai_draft_sent', { aiDraftsCount: result.usage });
          }
        }
        toast.success('AI draft generated successfully!');
      } else {
        toast.error(result.error || 'Server rejected draft generation request.');
      }
    } catch (error) {
      console.error("Draft generation failed:", error);
      toast.error('Failed to generate AI draft due to connection or authorization issues.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const toggleDeleteLead = React.useCallback(async (id: string, currentDeleted: boolean) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          is_deleted: !currentDeleted
        })
        .eq('id', id);

      if (error) throw error;

      const lead = leads.find(l => l.id === id);
      await logActivity({
        action: currentDeleted ? 'Lead Restored' : 'Lead Deleted',
        category: 'security',
        target: lead?.name || 'Unknown Lead',
        targetId: id
      });

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['allLeads', companyId] });
      toast.success(currentDeleted ? 'Lead restored.' : 'Lead deleted.');
    } catch (error) {
      console.error('Failed to toggle delete lead:', error);
    }
  }, [leads, companyId]);



  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'contacted': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'interested': return 'bg-green-50 text-green-600 border-green-100';
      case 'call back': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'converted': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const features = [
    // PRIMARY ROW 1
    {
      id: 'inbox',
      title: 'Lead Inbox',
      description: 'Incoming signals waiting for initial response or triage.',
      icon: Inbox,
      color: 'bg-blue-600',
      count: leads.filter(l => !l.isDeleted && l.status === 'New').length,
      category: 'primary'
    },
    {
      id: 'list',
      title: 'Leads Management',
      description: 'The engine room of your sales pipeline with global search and filters.',
      icon: Users,
      color: 'bg-indigo-600',
      count: leads.filter(l => !l.isDeleted).length,
      category: 'primary'
    },
    {
      id: 'import',
      title: 'Import Leads',
      description: 'Bulk upload leads via CSV/Excel with neural mapping.',
      icon: Upload,
      color: 'bg-purple-600',
      category: 'primary'
    },
    // PRIMARY ROW 2
    {
      id: 'distribution',
      title: 'Lead Distribution',
      description: 'Synchronized lead assignment using standard Round Robin logic.',
      icon: Shuffle,
      color: 'bg-emerald-600',
      category: 'primary'
    },
    {
      id: 'rules',
      title: 'Operational Rules',
      description: 'Configure security, masking, and assignment protocols.',
      icon: ShieldCheck,
      color: 'bg-slate-700',
      category: 'secondary'
    },
    {
      id: 'database',
      title: 'Lead Database',
      description: 'Historical insights and summary of all past campaigns.',
      icon: Database,
      color: 'bg-sky-600',
      category: 'secondary'
    },
    // ROW 3
    {
      id: 'recycle',
      title: 'Recycle Bin',
      description: 'Safety net for deleted records with 30-day retention.',
      icon: Trash2,
      color: 'bg-rose-500',
      count: leads.filter(l => l.isDeleted).length,
      category: 'active'
    },
    {
      id: 'automation',
      title: 'Workflow Triggers',
      description: 'Configure automated responders and lifecycle transitions.',
      icon: Zap,
      color: 'bg-amber-500',
      category: 'future',
      isPhase2: true
    },
    // FUTURE / LOCKED
    {
      id: 'scheduler',
      title: 'Appointment Scheduler',
      description: 'Built-in booking links with Google Calendar synchronization.',
      icon: Calendar,
      color: 'bg-orange-600',
      isPhase2: true,
      phase: 2,
      category: 'future'
    },
    {
      id: 'pipeline',
      title: 'Kanban Pipeline',
      description: 'Drag-and-drop leads through custom sales stages with rotting alerts.',
      icon: Kanban,
      color: 'bg-blue-600',
      isPhase2: true,
      phase: 2,
      category: 'future'
    },
    {
      id: 'enrichment',
      title: 'Lead Enrichment',
      description: 'Automatically fetch social profiles and company data via AI.',
      icon: Sparkles,
      color: 'bg-brand-600',
      isPhase2: true,
      phase: 2,
      category: 'future'
    },
    {
      id: 'quotation',
      title: 'Quotation System',
      description: 'Generate professional PDF quotes and send them directly to leads.',
      icon: FileCheck,
      color: 'bg-orange-600',
      isPhase2: true,
      phase: 2,
      category: 'future'
    },
    {
      id: 'performance',
      title: 'Peer Performance',
      description: 'Compare team rankings, set goals, and earn milestone badges.',
      icon: Trophy,
      color: 'bg-yellow-600',
      isPhase2: true,
      phase: 2,
      category: 'future'
    }
  ];

  const clientSideActiveLeads = React.useMemo(() => leads.filter(l => {
    if (l.isDeleted) return false;
    
    // Category checks
    let matchesCategory = true;
    if (activeSourceCategory === 'unassigned') {
      matchesCategory = !l.assignedTo || l.assignedTo === 'unassigned';
    } else if (activeSourceCategory === 'indiamart') {
      matchesCategory = (l.source || l.brand || '').toLowerCase() === 'indiamart';
    } else if (activeSourceCategory === 'facebook') {
      matchesCategory = (l.source || l.brand || '').toLowerCase() === 'facebook';
    } else if (activeSourceCategory === 'website') {
      matchesCategory = (l.source || l.brand || '').toLowerCase() === 'website';
    }

    // Basic filters
    const matchesSearch = (l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (l.phone || '').includes(searchQuery);
    
    const matchesStatus = statusFilter === 'All' 
      ? true 
      : statusFilter === 'Duplicates' 
        ? l.isDuplicate === true
        : l.status === statusFilter;

    const matchesRotting = !showOnlyRotting || isLeadRotting(l.createdAt?.toMillis(), rottingThreshold);
    
    // Extended filters
    const matchesUser = userFilter === '' || l.assignedTo === userFilter;
    const matchesView = activeView === 'all' 
       ? true 
       : activeView === 'mine' 
          ? l.assignedTo === user?.uid 
          : l.assignedTo === null; // inbox
    const matchesSource = sourceFilter === '' || (l.source || l.brand) === sourceFilter;
    const matchesState = stateFilter === '' || l.state === stateFilter;
    const matchesCity = cityFilter === '' || l.city === cityFilter;

    // Custom fields processing
    let matchesCustom = true;
    for (const [key, val] of Object.entries(customFilters)) {
       if (val && String(val).trim() !== '') {
          const leadVal = l[key as keyof Lead] || l.customData?.[key];
          if (!leadVal || !String(leadVal).toLowerCase().includes(String(val).toLowerCase())) {
             matchesCustom = false;
             break;
          }
       }
    }
    
    return matchesCategory && matchesCustom && matchesSearch && matchesStatus && matchesRotting && matchesUser && matchesView && matchesSource && matchesState && matchesCity;
  }).sort((a, b) => {
    if (a.status === 'New' && b.status !== 'New') return -1;
    if (a.status !== 'New' && b.status === 'New') return 1;
    return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
  }), [leads, searchQuery, statusFilter, rottingThreshold, showOnlyRotting, userFilter, activeView, user, sourceFilter, stateFilter, cityFilter, customFilters, activeSourceCategory]);

  const isPlaceholder = false;

  const activeLeads = React.useMemo(() => {
    if (isPlaceholder) return clientSideActiveLeads;
    return {
      length: paginatedTotalCount,
      filter: (cb: any) => clientSideActiveLeads.filter(cb),
      map: (cb: any) => clientSideActiveLeads.map(cb),
    } as any;
  }, [isPlaceholder, clientSideActiveLeads, paginatedTotalCount]);

  const displayedLeads = React.useMemo(() => {
    if (isPlaceholder) return clientSideActiveLeads.slice(0, pageSize);
    return paginatedLeads;
  }, [isPlaceholder, clientSideActiveLeads, paginatedLeads, pageSize]);

  const renderSubContent = () => {
    switch (activeSubTab) {
      case 'inbox':
        return <LeadInboxView leads={leads} agents={agents} onSelectLead={setSelectedLead} />;
      case 'import':
        return (
          <LeadImport 
            onClose={() => setActiveSubTab(null)} 
            onImportComplete={() => setActiveSubTab('list')} 
          />
        );
      case 'distribution':
        return (
          <LeadDistributionPanel 
            leads={leads} 
            agents={agents} 
            distSelectedAgents={distSelectedAgents} 
            handleToggleAgent={handleToggleAgent} 
            handleAutoDistribute={handleAutoDistribute} 
            isSubmitting={isSubmitting} 
          />
        );
      case 'rules':
        return <LeadRulesView />;
      case 'recycle':
        return <RecycleBinView leads={leads} toggleDeleteLead={toggleDeleteLead} />;
      case 'database':
        return <LeadDatabaseView leads={leads} />;
      case 'automation':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Zap size={24} className="text-amber-500 fill-amber-500" /> Active Automations
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'Instant Welcome Message', type: 'Trigger: New Lead', status: 'Active' },
                  { name: 'Agent Round Robin', type: 'Trigger: Import', status: 'Active' },
                  { name: 'Follow-up Task Generator', type: 'Trigger: Call End', status: 'Setup Required' }
                ].map((rule, i) => (
                  <div key={i} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <h4 className="font-bold text-gray-900">{rule.name}</h4>
                      <p className="text-xs text-gray-500 font-medium">{rule.type}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${rule.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                      {rule.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'pipeline':
        return <PipelineBoard onSelectLead={(l) => setSelectedLead(l as any)} />;
      case 'list':
        return (
          <div className="space-y-6">
            {/* Source Category Quick Filter Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { id: 'all', label: 'All Leads', sourceName: '' },
                { id: 'indiamart', label: 'IndiaMART', sourceName: 'IndiaMart' },
                { id: 'facebook', label: 'Facebook', sourceName: 'Facebook' },
                { id: 'website', label: 'Website', sourceName: 'Website' },
                { id: 'unassigned', label: 'Unassigned Pool', sourceName: 'unassigned' }
              ].map((category) => {
                const isSelected = activeSourceCategory === category.id;
                
                // Count unseen leads for this category
                const unseenCount = leads.filter(l => {
                  if (l.isDeleted) return false;
                  if (!l.isUnseen) return false;
                  if (category.id === 'unassigned') return !l.assignedTo || l.assignedTo === 'unassigned';
                  if (category.sourceName) return (l.source || l.brand || '').toLowerCase() === category.sourceName.toLowerCase();
                  return true;
                }).length;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setActiveSourceCategory(category.id);
                      if (category.id === 'unassigned') {
                        setActiveView('all');
                        setSourceFilter('');
                      } else {
                        setSourceFilter(category.sourceName);
                        if (category.sourceName) {
                          setActiveView('all');
                        }
                      }
                    }}
                    className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all text-left font-bold text-xs uppercase tracking-wider
                      ${isSelected 
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm' 
                        : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}
                  >
                    <span>{category.label}</span>
                    {unseenCount > 0 && (
                      <span className="ml-2 px-2.5 py-1 bg-indigo-650 text-white rounded-full text-[10px] font-black tracking-normal animate-pulse flex items-center gap-1 shadow-sm">
                        {unseenCount} New
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <LeadManagementKPIs 
              leads={leads.filter((l: any) => !l.isDeleted)} 
              currentFilter={statusFilter} 
              onFilterChange={setStatusFilter} 
            />

            <LeadFilterBar
              inputValue={inputValue}
              setInputValue={setInputValue}
              userFilter={userFilter}
              setUserFilter={setUserFilter}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              stateFilter={stateFilter}
              setStateFilter={setStateFilter}
              cityFilter={cityFilter}
              setCityFilter={setCityFilter}
              customFilters={customFilters}
              setCustomFilters={setCustomFilters}
              showMoreFilters={showMoreFilters}
              setShowMoreFilters={setShowMoreFilters}
              teamSettings={teamSettings}
              agents={agents}
              setShowFieldSettings={setShowFieldSettings}
              scoreFilter={scoreFilter}
              setScoreFilter={setScoreFilter}
              showOnlyRotting={showOnlyRotting}
              setShowOnlyRotting={setShowOnlyRotting}
              companyId={companyId}
              onOpenAdvancedFilters={() => setShowFiltersPanel(true)}
            />

            {/* Top Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-6 font-bold text-sm relative overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setActiveView('mine')}
                className={`px-6 md:px-10 py-3 whitespace-nowrap transition-all ${activeView === 'mine' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Leads Owned By Me
              </button>
              <button 
                onClick={() => setActiveView('all')}
                className={`px-6 md:px-10 py-3 whitespace-nowrap transition-all ${activeView === 'all' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                All Team Leads
              </button>
              <button 
                onClick={() => setActiveView('inbox')}
                className={`px-6 md:px-10 py-3 whitespace-nowrap transition-all flex items-center justify-center gap-2 ${activeView === 'inbox' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                📥 Incoming Inbox
                {leads.filter(l => !l.isDeleted && l.assignedTo === null).length > 0 && (
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </button>
            </div>

            {/* Table Actions Bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => onTabChange?.('Tutorials')} className="px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 uppercase tracking-wide shrink-0">
                  Watch Video <div className="bg-white rounded-full p-0.5"><div className="w-2 h-2 ml-0.5 bg-red-600" style={{ clipPath: 'polygon(0 0, 0 100%, 100% 50%)' }}/></div>
                </button>
                {/* Development only. This writes 30 fabricated leads straight
                    into the company's real leads table, and it sat next to
                    "Add Leads" looking like a normal feature — a customer who
                    clicked it would get fake people in their calling list and
                    skewed reports. import.meta.env.DEV is statically replaced
                    at build time, so it is dropped from production entirely. */}
                {import.meta.env.DEV && (
                  <button onClick={seedDummyData} className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 uppercase tracking-wide hover:bg-emerald-700 transition-colors shrink-0">
                    <Database size={14} /> Seed Mock (dev)
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition-colors uppercase tracking-wide flex items-center gap-2 shrink-0">
                   <Plus size={14} /> Add Leads
                </button>
                <button 
                  onClick={() => setShowFieldSettings(true)}
                  className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition-colors uppercase tracking-wide flex items-center gap-2 shrink-0"
                >
                   <Settings2 size={14} /> Rename Fields
                </button>
                <button 
                  onClick={() => setShowCustomFieldsManager(true)}
                  className="px-4 py-2.5 bg-violet-600 text-white font-bold rounded-lg text-xs hover:bg-violet-700 transition-colors uppercase tracking-wide flex items-center gap-2 shrink-0"
                >
                   <Database size={14} /> Custom Fields
                </button>
                <button 
                  onClick={() => setShowSmartImport(true)}
                  className="px-4 py-2.5 bg-blue-500 text-white font-bold rounded-lg text-xs hover:bg-blue-600 transition-colors shrink-0"
                >
                   <Upload size={16} />
                </button>
              </div>
            </div>

            {/* Pagination & Limits Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 bg-white p-3 px-6 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-sm text-gray-500 font-bold">
                  Showing {displayedLeads.length} of {activeLeads.length} Leads found
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">Sort by:</span>
                  <select
                    value={leadSort}
                    onChange={(e) => {
                      setLeadSort(e.target.value as LeadSort);
                      setPaginatedPage(1);
                    }}
                    className="border-2 border-brand-100/50 bg-brand-50/30 rounded-lg px-4 py-2 text-sm font-black text-brand-700 outline-none focus:border-brand-500 transition-all cursor-pointer"
                  >
                    {(Object.keys(LEAD_SORT_LABELS) as LeadSort[]).map((key) => (
                      <option key={key} value={key}>{LEAD_SORT_LABELS[key]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">Records per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPaginatedPage(1);
                    }}
                    className="border-2 border-brand-100/50 bg-brand-50/30 rounded-lg px-4 py-2 text-sm font-black text-brand-700 outline-none focus:border-brand-500 transition-all cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>
            </div>

            <BulkActionBar
              selectedCount={selectedLeadIds.length}
              agents={agents}
              onBulkAssign={handleBulkAssign}
              onBulkStatusChange={handleBulkStatusUpdate}
              onBulkDelete={handleBulkDelete}
              onBulkExport={handleBulkExport}
              onClearSelection={() => setSelectedLeadIds([])}
              isSubmitting={isSubmitting}
            />

            <LeadTable
              displayedLeads={displayedLeads}
              activeLeadsLength={activeLeads.length}
              selectedLeadIds={selectedLeadIds}
              handleSelectLead={handleSelectLead}
              handleSelectAll={handleSelectAll}
              onSelectLead={handleSelectLeadToView}
              paginatedLoading={paginatedLoading}
              isPlaceholder={isPlaceholder}
              teamSettings={teamSettings}
              isAdmin={isAdmin}
              agents={agents}
              setShowAddModal={setShowAddModal}
              setShowSmartImport={setShowSmartImport}
              onClearFilters={() => {
                setSearchQuery('');
                setStatusFilter('All');
                setUserFilter('');
                setSourceFilter('');
                setStateFilter('');
                setCityFilter('');

                setCustomFilters({});
              }}
              currentPage={paginatedCurrentPage}
              totalPages={paginatedTotalPages}
              totalCount={paginatedTotalCount}
              onPageChange={setPaginatedPage}
              // Only rendered in offline/placeholder mode, where the list is
              // sliced client-side and there is no pagination to conflict with.
              onLoadMore={() => setPageSize(prev => prev + 50)}
            />
          </div>
        );
      default: {
        const feature = features.find(f => f.id === activeSubTab);
        if (!feature) {
          return (
             <div className="p-8 text-center bg-gray-100 rounded-3xl">Feature not found</div>
          );
        }
        return (
          <div className="bg-white border border-gray-100 shadow-sm p-10 md:p-20 rounded-[40px] flex flex-col items-center justify-center text-center w-full min-h-[400px]">
            <div className={`w-24 h-24 ${feature.color || 'bg-brand-600'} bg-opacity-10 rounded-3xl flex items-center justify-center mb-8 relative`}>
              {feature.icon && <feature.icon size={48} className={feature.color ? feature.color.replace('bg-', 'text-') : 'text-brand-600'} />}
              <div className="absolute -top-2 -right-2 bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Phase 2</div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{feature.title}</h3>
            <p className="text-gray-500 mt-4 max-w-md text-lg">
              This module is currently in development for **Phase 2**. 
              We are building advanced AI-driven logic to automate your lead {feature.title.toLowerCase()}.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all">
                Join Waitlist
              </button>
              <button onClick={() => setActiveSubTab(null)} className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all">
                Go Back
              </button>
            </div>
          </div>
        );
      }
    }
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Consumer Dashboard Filters
  // When navigating from Dashboard, locations.state contains filters like:
  // { status: 'Converted', source: 'Facebook', fromDashboard: true }
  useEffect(() => {
    if (location.state && (location.state as any).fromDashboard) {
      const state = location.state as any;
      if (state.status) {
        setStatusFilter(state.status);
      }
      if (state.source) {
        setSourceFilter(state.source);
      }
      if (state.agentName) {
        setUserFilter(state.agentName);
      }
      
      // Auto-switch to the list view if coming from a dashboard click
      if (!activeSubTab) {
        setActiveSubTab('list');
      }
      
      // Clear the state to prevent re-applying filters on subsequent tab switches
      window.history.replaceState({}, document.title);
    }
  }, [location.state, activeSubTab]);

  return (
    <div className="space-y-8 relative">
      <TrialLockOverlay />
      <AnimatePresence mode="wait">
        {!activeSubTab ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => {
                  if (onTabChange) {
                    onTabChange('Home');
                    navigate('/dashboard');
                  } else {
                    navigate('/dashboard');
                  }
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-brand-600 transition-colors w-fit font-bold text-sm"
              >
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
              
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lead Control Hub</h1>
                  <p className="text-gray-500 mt-1 font-medium italic">Manage your entire lead lifecycle from a single operational dashboard.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => onTabChange?.('Roadmap')}
                    className="px-6 py-2.5 bg-brand-50 text-brand-600 rounded-xl font-bold text-sm hover:bg-brand-100 transition-all flex items-center gap-2"
                  >
                    <Sparkles size={18} /> Phase 2 Roadmap
                  </button>
                  <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 shadow-sm">
                    <Settings2 size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.filter(f => f.category === 'primary').map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    color={feature.color}
                    count={feature.count}
                    isPhase2={feature.isPhase2}
                    hasVipAccess={canAccessSequences}
                    onClick={() => setActiveSubTab(feature.id)}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.filter(f => f.category === 'active' || f.category === 'secondary').map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    color={feature.color}
                    count={feature.count}
                    isPhase2={feature.isPhase2}
                    hasVipAccess={canAccessSequences}
                    onClick={() => setActiveSubTab(feature.id)}
                    isSecondary={feature.category === 'secondary'}
                  />
                ))}
              </div>

              <div className="pt-10 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <Lock size={18} className="text-gray-400" />
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Future Operational Modules</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {features.filter(f => f.category === 'future').map((feature) => (
                    <FeatureCard
                      key={feature.id}
                      title={feature.title}
                      description={feature.description}
                      icon={feature.icon}
                      color={feature.color}
                      count={feature.count}
                      isPhase2={feature.isPhase2}
                      hasVipAccess={canAccessSequences}
                      onClick={() => setActiveSubTab(feature.id)}
                      isSecondary
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
              <Users className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-1">
                  <p className="text-brand-100 text-sm font-medium">Total Active Leads</p>
                  <h4 className="text-4xl font-bold">{leads.filter(l => !l.isDeleted).length}</h4>
                </div>
                <div className="space-y-1">
                  <p className="text-brand-100 text-sm font-medium">Rotting Leads</p>
                  <h4 className="text-4xl font-bold text-red-200">
                    {leads.filter(l => !l.isDeleted && isLeadRotting(l.createdAt?.toMillis(), rottingThreshold)).length}
                  </h4>
                </div>
                <div className="space-y-1">
                  <p className="text-brand-100 text-sm font-medium">Conversion Rate</p>
                  <h4 className="text-4xl font-bold">
                    {(() => {
                      const activeL = leads.filter(l => !l.isDeleted);
                      const totalActive = activeL.length;
                      const converted = activeL.filter(l => l.status === 'Converted').length;
                      return totalActive > 0 ? `${((converted / totalActive) * 100).toFixed(1)}%` : '0.0%';
                    })()}
                  </h4>
                </div>
                <div className="space-y-1">
                  <p className="text-brand-100 text-sm font-medium">Avg. Response Time</p>
                  <h4 className="text-4xl font-bold">
                    {(() => {
                      const contacted = leads.filter(l => !l.isDeleted && l.status !== 'New');
                      const newCount = leads.filter(l => !l.isDeleted && l.status === 'New').length;
                      return contacted.length > 0 ? `${Math.max(1.5, Math.min(15, parseFloat((2.5 + (newCount * 0.4)).toFixed(1))))}m` : '4.2m';
                    })()}
                  </h4>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="subcontent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveSubTab(null)}
                  className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-brand-600 hover:shadow-md transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {features.find(f => f.id === activeSubTab)?.title}
                  </h1>
                  <p className="text-gray-500 mt-1">
                    {features.find(f => f.id === activeSubTab)?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 bg-white border border-gray-200 px-5 py-2.5 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            {renderSubContent()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <ErrorBoundary componentName="LeadDetail">
            <LeadDetail 
              lead={selectedLead as any} 
              onClose={() => setSelectedLead(null)} 
              onEdit={() => {
                setShowAddModal(true);
              }} 
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* Ignored Old Lead Detail Modal
      <div className="hidden">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col rounded-l-[40px]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <LeadAvatar name={selectedLead.name} variant="detail" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedLead.name}</h2>
                    <p className="text-sm text-gray-500">{selectedLead.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm border border-gray-100">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{getLabel('status', 'Status')}</p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedLead.status)}`}>
                          {selectedLead.status}
                        </span>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Engagement Detail</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-brand-600" />
                          <span className="text-sm font-bold text-gray-900">{selectedLead.neuralScore || 85}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-900">Lead Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-600">{selectedLead.email}</span>
                          </div>
                          <button className="text-xs font-bold text-brand-600">Copy</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <Phone size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-600">{selectedLead.phone}</span>
                          </div>
                          <button className="text-xs font-bold text-brand-600">Call</button>
                        </div>
                      </div>
                    </div>

                    {selectedLead.customData && Object.keys(selectedLead.customData).length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Custom Notes (Imported)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedLead.customData).map(([key, value]) => (
                            <div key={key} className="p-4 bg-white border border-gray-100 rounded-2xl break-words">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{key}</p>
                              <span className="text-sm text-gray-800">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">AI Analysis</h3>
                        <button 
                          onClick={() => generateAIDraft(selectedLead)}
                          disabled={isGeneratingDraft}
                          className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                          {isGeneratingDraft ? <CallMindLoader size="xs" /> : <Sparkles size={12} />}
                          Generate WhatsApp Draft
                        </button>
                      </div>
                      <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100 relative overflow-hidden">
                        <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 text-brand-600" />
                        <div className="relative z-10 space-y-4">
                          <p className="text-sm text-brand-900 leading-relaxed">
                            {aiDraft || "This lead shows strong intent based on their interaction history. They have inquired about premium features twice in the last 48 hours. Recommend offering a personalized demo."}
                          </p>
                          {aiDraft && (
                            <button 
                              onClick={() => handleWhatsAppRedirect(selectedLead.phone, aiDraft)}
                              className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                            >
                              <MessageSquare size={18} />
                              Send via WhatsApp (Free)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900">Lead History</h3>
                    <LeadHistoryTimeline />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                <button className="flex-1 py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all flex items-center justify-center gap-2">
                  <Phone size={20} /> Start Call
                </button>
                <button 
                  onClick={() => {
                    if (aiDraft) {
                      handleWhatsAppRedirect(selectedLead.phone, aiDraft);
                    } else {
                      generateAIDraft(selectedLead);
                    }
                  }}
                  className="p-4 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all"
                >
                  <MessageSquare size={20} className={aiDraft ? "text-green-600" : ""} />
                </button>
              </div>
            </motion.div>
          </div>
      </div>
      */}

      {/* Add Lead Modal (Global) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
              <ErrorBoundary componentName="LeadForm">
                <LeadForm 
                  lead={selectedLead as any || undefined} 
                  onClose={() => {
                    setShowAddModal(false);
                    setSelectedLead(null);
                  }} 
                />
              </ErrorBoundary>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ignored Old Global Add Lead Modal
      <div className="hidden">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add New Lead</h2>
                  <p className="text-sm text-gray-500">Enter customer details to create a new lead.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleAddLead} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{getLabel('name', 'Full Name')} *</label>
                    <input 
                      type="text" 
                      value={newLead.name}
                      onChange={(e) => { 
                        setNewLead({...newLead, name: e.target.value}); 
                        if (newLeadErrors.name) setNewLeadErrors(prev => ({...prev, name: ''}));
                      }}
                      className={`w-full p-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-brand-200 ${newLeadErrors.name ? 'border-red-300 bg-red-50/30 text-red-900' : 'border-gray-100 hover:border-gray-200'}`}
                      placeholder={`e.g. ${getLabel('name', 'Rahul Sharma')}`}
                    />
                    {newLeadErrors.name && <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {newLeadErrors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{getLabel('phone', 'Phone Number')} *</label>
                      <input 
                        type="tel" 
                        value={newLead.phone}
                        onChange={(e) => {
                          setNewLead({...newLead, phone: e.target.value});
                          if (newLeadErrors.phone) setNewLeadErrors(prev => ({...prev, phone: ''}));
                        }}
                        className={`w-full p-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-brand-200 ${newLeadErrors.phone ? 'border-red-300 bg-red-50/30 text-red-900' : 'border-gray-100 hover:border-gray-200'}`}
                        placeholder="+91 00000 00000"
                      />
                      {newLeadErrors.phone && <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {newLeadErrors.phone}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{getLabel('email', 'Email Address')} *</label>
                      <input 
                        type="email" 
                        value={newLead.email}
                        onChange={(e) => {
                          setNewLead({...newLead, email: e.target.value});
                          if (newLeadErrors.email) setNewLeadErrors(prev => ({...prev, email: ''}));
                        }}
                        className={`w-full p-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-brand-200 ${newLeadErrors.email ? 'border-red-300 bg-red-50/30 text-red-900' : 'border-gray-100 hover:border-gray-200'}`}
                        placeholder="rahul@example.com"
                      />
                      {newLeadErrors.email && <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {newLeadErrors.email}</p>}
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewLeadErrors({});
                      setNewLead({ name: '', email: '', phone: '', status: 'New', brand: 'Default' });
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-tactile"
                  >
                    {isSubmitting ? <><CallMindLoader size="xs" /> Creating...</> : 'Create Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
      </div>
      */}

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Lead Limit Reached"
        description={`You've reached your trial limit of ${profile?.lead_limit || 200} leads. Upgrade to Pro for unlimited storage and advanced features.`}
        limitType="leads"
      />

      <ErrorBoundary componentName="SmartImportModal">
        <SmartImportModal 
          isOpen={showSmartImport}
          onClose={() => setShowSmartImport(false)}
          companyId={companyId || ''}
        />
      </ErrorBoundary>

      <ErrorBoundary componentName="CustomFieldManager">
        <CustomFieldManager
          isOpen={showCustomFieldsManager}
          onClose={() => setShowCustomFieldsManager(false)}
        />
      </ErrorBoundary>

      <AnimatePresence>
        {showFieldSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFieldSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                     <Settings2 size={20} />
                   </div>
                   <div>
                     <h2 className="text-xl font-bold text-gray-900">Rename CRM Fields</h2>
                     <p className="text-xs text-gray-500 font-medium">Customize labels for your table and filters</p>
                   </div>
                </div>
                <button onClick={() => setShowFieldSettings(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Standard Fields</h3>
                    <div className="grid grid-cols-2 gap-4">
                       {Object.entries(editingSettings?.fieldLabels || {}).map(([key, label]: [string, any]) => (
                         <div key={key} className="space-y-1">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                             System: {key}
                           </label>
                           <input 
                             type="text"
                             value={label || ''}
                             onChange={(e) => {
                               const newLabels = { ...editingSettings.fieldLabels, [key]: e.target.value };
                               setEditingSettings({ ...editingSettings, fieldLabels: newLabels });
                             }}
                             className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-brand-500 outline-none transition-all"
                           />
                         </div>
                       ))}
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100">
                     <div className="flex items-center justify-between mb-4">
                       <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Custom Global Filters</h3>
                       <button 
                         onClick={() => {
                           const currentFields = editingSettings?.customFields || [];
                           setEditingSettings({
                             ...editingSettings, 
                             customFields: [...currentFields, { id: `cf_${Date.now()}`, label: 'New Custom Field' }]
                           });
                         }}
                         className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 transition-colors shadow-sm"
                       >
                         <Plus size={14} /> Add Custom Field
                       </button>
                     </div>
                     
                     <div className="space-y-3">
                       {editingSettings?.customFields?.length > 0 ? editingSettings.customFields.map((cf: any, idx: number) => (
                          <div key={cf.id} className="flex gap-2 items-end">
                              <div className="flex-1 space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Custom Field {idx + 1} Label</label>
                                <input
                                   type="text"
                                   value={cf.label || ''}
                                   placeholder="e.g. School Name"
                                   onChange={(e) => {
                                      const updated = [...editingSettings.customFields];
                                      updated[idx] = { ...updated[idx], label: e.target.value };
                                      setEditingSettings({...editingSettings, customFields: updated});
                                   }}
                                   className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-brand-500 outline-none transition-all"
                                />
                              </div>
                              <button 
                                onClick={() => {
                                   const updated = editingSettings.customFields.filter((_: any, i: number) => i !== idx);
                                   setEditingSettings({...editingSettings, customFields: updated});
                                }}
                                className="h-[42px] px-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 flex items-center justify-center transition-colors shadow-sm border border-red-100"
                              >
                                <Trash2 size={16} />
                              </button>
                          </div>
                       )) : (
                         <p className="text-xs text-gray-400 font-medium italic">No custom fields added yet. Add a custom field to filter and map data (e.g. "School Name").</p>
                       )}
                     </div>
                  </div>
               </div>

               <div className="p-6 border-t border-gray-100 flex gap-4">
                 <button 
                   onClick={() => setShowFieldSettings(false)}
                   className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={async () => {
                     if (!companyId || !editingSettings) return;
                     setIsSubmitting(true);
                     try {
                       const { error } = await supabase
                         .from('team_settings')
                         .upsert({
                           company_id: companyId,
                           field_labels: editingSettings.fieldLabels,
                           custom_fields: editingSettings.customFields,
                           hide_phone_numbers: editingSettings.hidePhoneNumbers,
                           rotting_threshold: editingSettings.rottingThreshold,
                           updated_at: new Date().toISOString()
                         });

                       if (error) throw error;
                       
                       queryClient.invalidateQueries({ queryKey: ['teamSettings', companyId] });
                       toast.success("Successfully saved settings!");
                       setShowFieldSettings(false);
                     } catch (e) {
                       console.error(e);
                       toast.error("Failed to save settings");
                     } finally {
                       setIsSubmitting(false);
                     }
                   }}
                   disabled={isSubmitting}
                   className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                 >
                   {isSubmitting ? <CallMindLoader size="xs" /> : <Check size={18} />}
                   Save Custom Fields
                 </button>
               </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFiltersPanel && (
          <LeadFiltersPanel
            filters={panelFilters}
            onChange={handlePanelFiltersChange}
            onClose={() => setShowFiltersPanel(false)}
            onClear={handleClearAllFilters}
            companyId={companyId}
            agents={agents}
            teamSettings={teamSettings}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Selected Leads"
        message={`Are you sure you want to permanently delete the ${selectedLeadIds.length} selected leads? This action cannot be undone.`}
        confirmLabel="Delete Leads"
        cancelLabel="Keep Leads"
        onConfirm={handleBulkDeleteProceed}
        onClose={() => setShowDeleteConfirm(false)}
      />

      {/* Lead Detail Inspection Drawer */}
      <AnimatePresence>
        {selectedLead && (
          <LeadDetail
            lead={selectedLead as any}
            onClose={() => setSelectedLead(null)}
            onEdit={() => {
              toast('Inline editing mode is available directly in the drawer.');
            }}
            leadsList={displayedLeads as any}
            onNavigate={(nextLead) => setSelectedLead(nextLead as any)}
          />
        )}
      </AnimatePresence>

      <ActionProgressBar
        progress={bulkActionProgress.progress}
        title={bulkActionProgress.title}
        total={bulkActionProgress.total}
        current={bulkActionProgress.current}
      />
    </div>
  );
};
