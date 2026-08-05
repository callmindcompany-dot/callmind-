import React, { useState } from 'react';
import { Shield, Lock, CheckCircle, Save, AlertCircle, UserCheck, RefreshCw } from 'lucide-react';

interface RolePermissionsManagerProps {
  userRole?: string;
}

const MODULES = [
  { id: 'leads', label: 'Lead Management' },
  { id: 'calls', label: 'Call Log & Dialer' },
  { id: 'users', label: 'Team & User Management' },
  { id: 'whatsapp', label: 'WhatsApp Inbox' },
  { id: 'integrations', label: 'Integration Health' },
  { id: 'billing', label: 'Billing & Subscriptions' },
  { id: 'settings', label: 'Company Settings' },
];

const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'manager', label: 'Sales Manager' },
  { id: 'team_lead', label: 'Team Lead' },
  { id: 'telecaller', label: 'Telecaller' },
];

const ACTIONS = ['view', 'create', 'update', 'delete', 'export', 'assign', 'approve'];

export const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({ userRole = 'founder' }) => {
  const isFounder = userRole === 'founder';
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [matrix, setMatrix] = useState<Record<string, Record<string, string[]>>>({
    admin: {
      leads: ['view', 'create', 'update', 'delete', 'export', 'assign', 'approve'],
      calls: ['view', 'create', 'update', 'export'],
      users: ['view', 'create', 'update', 'assign'],
      billing: ['view'],
      integrations: ['view', 'update'],
      settings: ['view'],
      whatsapp: ['view', 'create', 'update', 'assign'],
    },
    manager: {
      leads: ['view', 'create', 'update', 'export', 'assign'],
      calls: ['view', 'create', 'export'],
      users: ['view'],
      billing: [],
      integrations: ['view'],
      settings: [],
      whatsapp: ['view', 'create', 'assign'],
    },
    team_lead: {
      leads: ['view', 'create', 'update', 'assign'],
      calls: ['view', 'create'],
      users: ['view'],
      billing: [],
      integrations: [],
      settings: [],
      whatsapp: ['view', 'create'],
    },
    telecaller: {
      leads: ['view', 'update'],
      calls: ['view', 'create'],
      users: [],
      billing: [],
      integrations: [],
      settings: [],
      whatsapp: ['view', 'create'],
    },
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleAction = (moduleId: string, action: string) => {
    if (!isFounder) return;

    setMatrix((prev) => {
      const roleMatrix = { ...(prev[selectedRole] || {}) };
      const currentActions = roleMatrix[moduleId] || [];
      const updatedActions = currentActions.includes(action)
        ? currentActions.filter((a) => a !== action)
        : [...currentActions, action];

      return {
        ...prev,
        [selectedRole]: {
          ...roleMatrix,
          [moduleId]: updatedActions,
        },
      };
    });
  };

  const handleSave = () => {
    if (!isFounder) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMessage('Role permissions updated successfully!');
      setTimeout(() => setMessage(null), 3000);
    }, 600);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-600" />
            Configurable Role Permissions (RBAC)
          </h1>
          <p className="text-sm text-slate-500 font-sans mt-1">
            Founder-only control panel for fine-grained module access and security boundaries.
          </p>
        </div>

        {isFounder ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Matrix'}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-bold">
            <Lock className="w-4 h-4 text-amber-600" /> Read-Only Mode (Founder Required)
          </div>
        )}
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedRole(r.id)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              selectedRole === r.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            {r.label}
          </button>
        ))}
      </div>

      {/* Permission Table */}
      <div className="glass-card rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
            <tr>
              <th className="p-4">Module Name</th>
              {ACTIONS.map((action) => (
                <th key={action} className="p-4 text-center capitalize">{action}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {MODULES.map((mod) => {
              const activeActions = matrix[selectedRole]?.[mod.id] || [];
              return (
                <tr key={mod.id} className="hover:bg-slate-50/60 transition-all">
                  <td className="p-4 font-bold text-slate-900 text-sm">{mod.label}</td>
                  {ACTIONS.map((action) => {
                    const isChecked = activeActions.includes(action);
                    return (
                      <td key={action} className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAction(mod.id, action)}
                          disabled={!isFounder}
                          className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
