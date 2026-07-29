import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { CompanyStats } from '@/types/founder';
import { X, Send, Megaphone, CheckCircle2, ListFilter } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyStats[];
}

export const AnnouncementModal = ({ isOpen, onClose, companies }: AnnouncementModalProps) => {
  const [targetType, setTargetType] = useState<'all' | 'plan' | 'company'>('all');
  const [targetPlan, setTargetPlan] = useState('Basic');
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (companies.length > 0 && !targetCompanyId) {
      setTargetCompanyId(companies[0].id);
    }
  }, [companies, targetCompanyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setIsSubmitting(true);
    toast.loading("Relaying announcement to database...", { id: 'announcement' });

    try {
      // Setup targets list based on select type
      let targetedCompanyIds: string[] = [];
      if (targetType === 'all') {
        targetedCompanyIds = companies.map(c => c.id);
      } else if (targetType === 'plan') {
        targetedCompanyIds = companies.filter(c => c.plan === targetPlan).map(c => c.id);
      } else {
        targetedCompanyIds = [targetCompanyId];
      }

      if (targetedCompanyIds.length === 0) {
        throw new Error("No targeted company profiles found matching criteria.");
      }

      // We can insert an announcement record for each target company or insert a single row per company
      const payloads = targetedCompanyIds.map(companyId => ({
        id: `ann-${Math.random().toString(36).substring(2, 9)}`,
        company_id: companyId,
        title: title.trim(),
        body: body.trim(),
        status: 'sent',
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('announcements')
        .insert(payloads);

      if (error) throw error;

      toast.success(`Announcement broadcasted to ${targetedCompanyIds.length} tenants!`, { id: 'announcement' });
      setTitle('');
      setBody('');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to broadcast announcement: " + err.message, { id: 'announcement' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col animate-in scale-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center border border-brand-100 shadow-xs">
              <Megaphone size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">Broadcast Center</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Send Global Announcements</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {/* Target Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Broadcast Target Scope</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl">
              {[
                { id: 'all', label: 'All Clients' },
                { id: 'plan', label: 'By Plan' },
                { id: 'company', label: 'Single Client' }
              ].map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setTargetType(scope.id as any)}
                  className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    targetType === scope.id 
                      ? 'bg-white text-gray-950 shadow-xs' 
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Target Options */}
          {targetType === 'plan' && (
            <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Select Plan Tier</label>
              <select
                value={targetPlan}
                onChange={e => setTargetPlan(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl text-xs font-bold text-gray-700 outline-none"
              >
                <option value="Basic">Basic Plan</option>
                <option value="Professional">Professional Plan</option>
                <option value="Enterprise">Enterprise Plan</option>
              </select>
            </div>
          )}

          {targetType === 'company' && (
            <div className="space-y-1.5 animate-in slide-in-from-top duration-200">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Select Tenant Company</label>
              <select
                value={targetCompanyId}
                onChange={e => setTargetCompanyId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl text-xs font-bold text-gray-700 outline-none"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">Announcement Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Platform Maintenance - Dec 15"
              className="w-full p-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl text-xs font-semibold text-gray-700 outline-none"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400">Broadcast Message Body</label>
            <textarea
              required
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="Enter message details here. This will display on target tenant dashboards."
              className="w-full p-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl text-xs font-semibold text-gray-700 outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl text-xs font-bold uppercase transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Sending...' : 'Broadcast Msg'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
