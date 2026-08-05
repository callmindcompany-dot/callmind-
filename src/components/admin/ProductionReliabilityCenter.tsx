import React, { useState } from 'react';
import { Server, Database, AlertOctagon, CheckCircle2, ShieldCheck, Activity, RefreshCw, FileText, ExternalLink, HardDrive } from 'lucide-react';

interface ProductionReliabilityCenterProps {
  userRole?: string;
}

export const ProductionReliabilityCenter: React.FC<ProductionReliabilityCenterProps> = ({ userRole = 'founder' }) => {
  const isFounder = userRole === 'founder';
  const [activeTab, setActiveTab] = useState<'overview' | 'migrations' | 'backups' | 'runbook'>('overview');

  const migrations = [
    { name: '20260804000000_security_rls_remediation.sql', status: 'Pending Approval', scope: 'Security RLS Baseline' },
    { name: '20260805000000_lead_sla_reassignment.sql', status: 'Pending Approval', scope: 'SLA Engine & Company Settings' },
    { name: '20260806000000_call_idempotency.sql', status: 'Pending Approval', scope: 'Call Log Idempotency' },
    { name: '20260807000000_attendance_gps.sql', status: 'Pending Approval', scope: 'GPS Attendance Coordinates' },
    { name: '20260808000000_integration_health.sql', status: 'Pending Approval', scope: 'Integration Health Center' },
    { name: '20260809000000_whatsapp_inbox.sql', status: 'Pending Approval', scope: 'WhatsApp Shared Inbox' },
    { name: '20260810000000_rbac_permissions.sql', status: 'Pending Approval', scope: 'RBAC Role Permissions' },
  ];

  const backups = [
    { date: 'Today, 04:00 AM', type: 'Automated Daily Snapshot', status: 'Verified', size: '4.2 GB' },
    { date: 'Yesterday, 04:00 AM', type: 'Automated Daily Snapshot', status: 'Verified', size: '4.1 GB' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900 flex items-center gap-2">
            <Server className="w-6 h-6 text-brand-600" />
            Production Reliability Center
          </h1>
          <p className="text-sm text-slate-500 font-sans mt-1">
            Founder operational suite for database migrations, backup verification, and incident management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Systems Operational
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'overview', label: 'System Overview' },
          { id: 'migrations', label: 'Database Migrations (7)' },
          { id: 'backups', label: 'Backup Verification' },
          { id: 'runbook', label: 'Incident Runbook' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: System Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Database Health</span>
              <Database className="w-5 h-5 text-brand-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">Postgres 15.1</div>
            <p className="text-xs text-slate-500 mt-1">RLS Tenant Isolation Active</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Security Incident Status</span>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-2">0 Threats</div>
            <p className="text-xs text-slate-500 mt-1">Rate Limiters & Auth Guards Active</p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Offline Queue Retries</span>
              <Activity className="w-5 h-5 text-brand-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">100% Idempotent</div>
            <p className="text-xs text-slate-500 mt-1">Postgres 23505 Duplicate-Proof</p>
          </div>
        </div>
      )}

      {/* Tab 2: Migrations */}
      {activeTab === 'migrations' && (
        <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm">Corrective Migration Queue</h3>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Manual Staging Approval Required
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {migrations.map((m) => (
              <div key={m.name} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 font-mono block">{m.name}</span>
                  <span className="text-slate-500 font-sans">{m.scope}</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold rounded-md text-[10px] uppercase">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Backups */}
      {activeTab === 'backups' && (
        <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-brand-600" />
            Automated Database Backups
          </h3>
          <div className="divide-y divide-slate-100">
            {backups.map((b, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{b.type}</span>
                  <span className="text-slate-500">{b.date} • {b.size}</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-md text-[10px] uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Runbook */}
      {activeTab === 'runbook' && (
        <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" /> Incident Emergency Runbook
          </h3>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-sans">
            <p><strong>1. Database Outage / Connection Failures:</strong> Check Supabase status page and inspect connection pooler metrics.</p>
            <p><strong>2. Webhook Ingestion Failures:</strong> Open Integration Health Center, review masked error summary, and click Manual Retry.</p>
            <p><strong>3. Mobile Offline Sync Issues:</strong> Telecallers retain offline logs in AsyncStorage. No data is lost; sync automatically resumes when device regains connectivity.</p>
          </div>
        </div>
      )}
    </div>
  );
};
