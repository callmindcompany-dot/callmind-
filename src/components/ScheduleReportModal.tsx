import React, { useState } from 'react';
import { X, Calendar, Mail, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useReportSchedules } from '@/hooks/useReportSchedules';
import { toast } from 'react-hot-toast';

interface ScheduleReportModalProps {
  companyId: string | null;
  onClose: () => void;
}

export const ScheduleReportModal = React.memo(({ companyId, onClose }: ScheduleReportModalProps) => {
  const { createSchedule, isCreating } = useReportSchedules(companyId);
  const [reportType, setReportType] = useState('Executive Summary');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [emailInput, setEmailInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);

  const handleAddEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!trimmed.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (recipients.includes(trimmed)) {
      toast.error('Email already added');
      return;
    }
    setRecipients([...recipients, trimmed]);
    setEmailInput('');
  };

  const handleRemoveEmail = (email: string) => {
    setRecipients(recipients.filter(e => e !== email));
  };

  const handleSaveSchedule = async () => {
    if (!companyId) return;
    if (recipients.length === 0) {
      toast.error('Please add at least one recipient email address');
      return;
    }

    try {
      await createSchedule({
        company_id: companyId,
        frequency,
        recipients,
        metrics: [reportType]
      });
      toast.success('Report delivery schedule created successfully!');
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save schedule configuration');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog container */}
      <div className="relative w-full max-w-md bg-white p-6 rounded-3xl border border-gray-150 shadow-2xl z-10 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-black text-slate-955 uppercase tracking-tight">Schedule Report Dispatch</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Set up automated email report delivery</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-50 border border-transparent hover:border-gray-200 rounded-lg text-gray-400 hover:text-slate-950"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs font-bold text-slate-700">
          {/* Report Category */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Select Analytics Module</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-gray-150 rounded-xl outline-none focus:border-brand-500"
            >
              <option value="Executive Summary">Executive Summary</option>
              <option value="Sales Performance">Sales Performance</option>
              <option value="Calling Performance">Calling Performance</option>
              <option value="Agent Performance">Agent Performance</option>
              <option value="Lead Source Quality">Lead Source Quality</option>
              <option value="Cohort Analysis">Cohort Analysis</option>
            </select>
          </div>

          {/* Dispatch Frequency */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Dispatch Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-gray-150 rounded-xl outline-none focus:border-brand-500"
            >
              <option value="daily">Daily Dispatch</option>
              <option value="weekly">Weekly Summary Dispatch</option>
              <option value="monthly">Monthly Audit Dispatch</option>
            </select>
          </div>

          {/* Email Recipients Config */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-gray-400 uppercase">Recipients Emails list</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                className="flex-1 px-3 py-2 bg-slate-50 border border-gray-150 rounded-xl outline-none focus:bg-white focus:border-brand-500"
              />
              <button
                onClick={handleAddEmail}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Add
              </button>
            </div>

            {/* Recipients Emails Badges list */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipients.map(email => (
                <div 
                  key={email}
                  className="flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-100 text-brand-700 text-[10px] font-black rounded-lg"
                >
                  <Mail size={10} />
                  <span>{email}</span>
                  <button 
                    onClick={() => handleRemoveEmail(email)}
                    className="p-0.5 hover:bg-brand-100 rounded text-brand-500 ml-1"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {recipients.length === 0 && (
                <p className="text-[9px] text-slate-400 font-bold uppercase py-2">No recipients configured yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveSchedule}
            disabled={isCreating}
            className="flex-1 py-3 bg-brand-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-100 flex items-center justify-center gap-1.5"
          >
            {isCreating ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
});
ScheduleReportModal.displayName = 'ScheduleReportModal';
