import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Shield, 
  ToggleLeft, 
  ToggleRight, 
  Save, 
  Check, 
  Plus, 
  UserMinus, 
  Mail, 
  Users, 
  CheckSquare, 
  Square,
  X,
  Send,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { 
  useFeatureFlags, 
  useUpdateFeatureFlag, 
  useCofounders, 
  useInviteCofounder, 
  useUpdateCofounderPermissions, 
  useRevokeCofounderAccess 
} from '@/hooks/useRoadmapCofounder';
import { CoFounder } from '@/types/roadmapCofounder';
import CallMindLoader from './CallMindLoader';
import { toast } from 'react-hot-toast';

export const CoFounderManagement = ({ onBack }: { onBack: () => void }) => {
  const { companyId } = useCompany();

  // Queries & Mutations
  const { data: flags = [], isLoading: isFlagsLoading } = useFeatureFlags();
  const { data: cofounders = [], isLoading: isCofoundersLoading, isError: isCofounderError } = useCofounders(companyId);

  const updateFlagMutation = useUpdateFeatureFlag();
  const inviteMutation = useInviteCofounder();
  const updatePermissionsMutation = useUpdateCofounderPermissions();
  const revokeMutation = useRevokeCofounderAccess();

  // Invite Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<CoFounder['role']>('Co-Founder');
  
  // Invited co-founder permissions checkboxes
  const [permComm, setPermComm] = useState(false);
  const [permSeq, setPermSeq] = useState(false);
  const [permSched, setPermSched] = useState(false);
  const [permInt, setPermInt] = useState(false);

  // Edit Permissions Dialog Modal State
  const [editingCofounder, setEditingCofounder] = useState<CoFounder | null>(null);
  const [editComm, setEditComm] = useState(false);
  const [editSeq, setEditSeq] = useState(false);
  const [editSched, setEditSched] = useState(false);
  const [editInt, setEditInt] = useState(false);

  const getFlagValue = (key: string): boolean => {
    const flagObj = flags.find(f => f.key === key);
    return flagObj ? flagObj.value : false;
  };

  const handleToggleFlag = async (key: string) => {
    const currentValue = getFlagValue(key);
    try {
      await updateFlagMutation.mutateAsync({ key, value: !currentValue });
      toast.success(`Toggled flag: ${key} to ${!currentValue ? 'Enabled' : 'Disabled'}`);
    } catch (err) {
      toast.error("Failed to update feature flag.");
    }
  };

  // Submit Invite
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim() || !companyId) {
      toast.error("Email and Name are required.");
      return;
    }

    try {
      await inviteMutation.mutateAsync({
        company_id: companyId,
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole,
        permissions: {
          communication: permComm,
          sequences: permSeq,
          scheduler: permSched,
          integrations: permInt
        }
      });
      toast.success("Co-founder invitation sent successfully!");
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Co-Founder');
      setPermComm(false);
      setPermSeq(false);
      setPermSched(false);
      setPermInt(false);
    } catch (err: unknown) {
      toast.error("Failed to send invite: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Trigger permissions Edit dialog modal
  const openEditPermissionsModal = (cofounder: CoFounder) => {
    setEditingCofounder(cofounder);
    setEditComm(cofounder.permissions.communication);
    setEditSeq(cofounder.permissions.sequences);
    setEditSched(cofounder.permissions.scheduler);
    setEditInt(cofounder.permissions.integrations);
  };

  // Save Permissions changes
  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCofounder) return;

    try {
      await updatePermissionsMutation.mutateAsync({
        id: editingCofounder.id,
        permissions: {
          communication: editComm,
          sequences: editSeq,
          scheduler: editSched,
          integrations: editInt
        }
      });
      toast.success("Permissions updated successfully!");
      setEditingCofounder(null);
    } catch (err: unknown) {
      toast.error("Failed to update permissions: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Revoke cofounder access
  const handleRevoke = async (id: string) => {
    if (window.confirm("Are you sure you want to revoke platform access for this co-founder?")) {
      try {
        await revokeMutation.mutateAsync(id);
        toast.success("Access privileges revoked!");
      } catch (err: unknown) {
        toast.error("Failed to revoke access: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  // Resend Invite simulator toast
  const handleResendInvite = (email: string) => {
    toast.success(`Verification invitation link resent to: ${email}`);
  };

  // Toggle Checkbox utilities
  const Checkbox = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
    >
      {checked ? (
        <CheckSquare size={16} className="text-brand-600 fill-brand-50" />
      ) : (
        <Square size={16} className="text-gray-300" />
      )}
      <span>{label}</span>
    </button>
  );

  const features = [
    { id: 'communication', name: 'WhatsApp API (Phase 2)', desc: 'Enable official WhatsApp Business API integration for all users.' },
    { id: 'sequences', name: 'VoIP Calling (Phase 3)', desc: 'Enable native browser-based VoIP calling and SIP trunking.' },
    { id: 'scheduler', name: 'Smart Callback Engine (Phase 2)', desc: 'Enable autonomous scheduling and auto-reminders for all users.' },
    { id: 'integrations', name: 'Premium CRM Sync (Phase 3)', desc: 'Enable deep bi-directional sync with Salesforce and HubSpot.' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 btn-tactile"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Feature & Co-founder Activator</h1>
          <p className="text-gray-500 font-medium text-sm mt-0.5">Toggle release feature sets or distribute secure co-founder keys.</p>
        </div>
      </div>

      {/* Main Grid: Toggle Switches & CoFounder management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Feature Toggles */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-xs space-y-5">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
              <Shield size={18} className="text-brand-650" />
              Global Switches
            </div>

            {isFlagsLoading ? (
              <div className="py-8 flex justify-center"><CallMindLoader size="sm" /></div>
            ) : (
              <div className="space-y-4 text-xs font-semibold">
                {features.map((feature) => {
                  const isEnabled = getFlagValue(feature.id);
                  return (
                    <div key={feature.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-800 text-xs truncate leading-snug">{feature.name}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{feature.desc}</p>
                      </div>
                      <button 
                        onClick={() => handleToggleFlag(feature.id)}
                        className={`transition-colors shrink-0 btn-tactile`}
                      >
                        {isEnabled ? <ToggleRight size={36} className="text-brand-600 fill-brand-600/10" /> : <ToggleLeft size={36} className="text-gray-300" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Invitation Board Panel */}
          <div className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-xs space-y-5">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
              <Plus size={18} className="text-brand-650" />
              Invite Co-founder / Team
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</label>
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. S. Kumar"
                  className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. partner@callmind.company"
                  className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl focus:border-brand-500 outline-none text-gray-700 font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Role</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CoFounder['role'])}
                  className="w-full p-2.5 bg-gray-50 border border-gray-150 rounded-xl outline-none"
                >
                  <option>Co-Founder</option>
                  <option>Operator</option>
                </select>
              </div>

              {/* Set permissions checked defaults */}
              <div className="pt-2 border-t border-gray-50 space-y-2.5">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Keys Allocations</label>
                <div className="grid grid-cols-2 gap-2">
                  <Checkbox checked={permComm} onChange={setPermComm} label="WhatsApp" />
                  <Checkbox checked={permSeq} onChange={setPermSeq} label="VoIP" />
                  <Checkbox checked={permSched} onChange={setPermSched} label="Scheduler" />
                  <Checkbox checked={permInt} onChange={setPermInt} label="CRM sync" />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={inviteMutation.isPending}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all btn-tactile shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> Send Invite
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: CoFounder list database logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-xs space-y-5">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
              <Users size={18} className="text-brand-650" />
              Manage Co-founders & Operators
            </div>

            {isCofoundersLoading ? (
              <div className="py-16 flex justify-center">
                <CallMindLoader size="md" text="Syncing co-founders list..." />
              </div>
            ) : isCofounderError ? (
              <div className="text-center py-10 space-y-4">
                <AlertCircle size={28} className="text-red-500 mx-auto" />
                <p className="text-xs text-gray-500 font-bold">Failed to load cofounders.</p>
              </div>
            ) : cofounders.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-12">No co-founders registered yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
                {cofounders.map((cf) => (
                  <div 
                    key={cf.id}
                    className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col justify-between h-48 relative"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div>
                          <h4 className="font-bold text-gray-900 font-display text-sm leading-snug">{cf.name}</h4>
                          <span className="text-[9px] text-gray-450 uppercase tracking-widest">{cf.role}</span>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                          cf.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : cf.status === 'Pending'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {cf.status}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-gray-450 truncate flex items-center gap-1"><Mail size={11} /> {cf.email}</p>
                      
                      {/* Active keys status */}
                      <div className="flex gap-1.5 flex-wrap mt-3.5">
                        {cf.permissions.communication && <span className="bg-white px-2 py-0.5 rounded border text-[9px] text-gray-500 font-bold">WA</span>}
                        {cf.permissions.sequences && <span className="bg-white px-2 py-0.5 rounded border text-[9px] text-gray-500 font-bold">VoIP</span>}
                        {cf.permissions.scheduler && <span className="bg-white px-2 py-0.5 rounded border text-[9px] text-gray-500 font-bold">Sched</span>}
                        {cf.permissions.integrations && <span className="bg-white px-2 py-0.5 rounded border text-[9px] text-gray-500 font-bold">CRM</span>}
                      </div>
                    </div>

                    {/* Actions toolbar */}
                    <div className="flex items-center justify-between pt-3.5 border-t border-gray-200/60 mt-4 text-[9px] font-black uppercase tracking-wider">
                      {cf.status === 'Pending' ? (
                        <button 
                          onClick={() => handleResendInvite(cf.email)}
                          className="text-brand-650 hover:text-brand-700 btn-tactile"
                        >
                          Resend Invite
                        </button>
                      ) : (
                        <span className="text-gray-300">Invite Claimed</span>
                      )}

                      {cf.status !== 'Revoked' ? (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => openEditPermissionsModal(cf)}
                            className="text-gray-500 hover:text-brand-650 transition-colors"
                          >
                            Edit Permissions
                          </button>
                          <button 
                            onClick={() => handleRevoke(cf.id)}
                            className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-0.5"
                          >
                            <UserMinus size={11} /> Revoke
                          </button>
                        </div>
                      ) : (
                        <span className="text-red-600 uppercase font-black tracking-widest">Revoked</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Permissions Modal */}
      <AnimatePresence>
        {editingCofounder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCofounder(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-50 pb-3.5 mb-5">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Edit Permissions</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{editingCofounder.name}</p>
                </div>
                <button onClick={() => setEditingCofounder(null)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSavePermissions} className="space-y-5 text-xs font-semibold">
                <div className="space-y-3">
                  <Checkbox checked={editComm} onChange={setEditComm} label="WhatsApp Business API" />
                  <Checkbox checked={editSeq} onChange={setEditSeq} label="VoIP Browser Calling" />
                  <Checkbox checked={editSched} onChange={setEditSched} label="Smart Callback Scheduler" />
                  <Checkbox checked={editInt} onChange={setEditInt} label="Premium CRM Integrations Sync" />
                </div>

                <button 
                  type="submit" 
                  disabled={updatePermissionsMutation.isPending}
                  className="w-full py-3 bg-gray-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all btn-tactile shadow-xs"
                >
                  Save Permissions Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
