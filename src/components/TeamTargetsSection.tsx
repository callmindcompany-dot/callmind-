import React, { useState } from 'react';
import { useCompany } from '@/CompanyContext';
import { Plus, Target, Phone, Users, TrendingUp, Edit2, Trash2, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { startOfWeek, endOfWeek } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';
import CallMindLoader from './CallMindLoader';

type TargetType = 'calls' | 'leads' | 'conversions' | 'custom';
type TargetRow = Database['public']['Tables']['targets']['Row'];

interface TargetFormData {
  label: string;
  targetValue: string;
  currentValue: string;
  type: TargetType;
}

/**
 * TeamTargetsSection Component
 * 
 * Manages company performance targets using Supabase and React Query.
 */
export const TeamTargetsSection = () => {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TargetFormData>({
    label: '',
    targetValue: '',
    currentValue: '',
    type: 'custom'
  });

  // 1. Fetch Targets
  const { data: targets = [], isLoading: isLoadingTargets } = useQuery<TargetRow[]>({
    queryKey: ['targets', companyId],
    queryFn: async (): Promise<TargetRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // 2. Fetch Leads Count & Conversions Count (Scoped by Company)
  const { data: leadMetrics = { totalLeads: 0, conversions: 0 } } = useQuery({
    queryKey: ['targetLeadMetrics', companyId],
    queryFn: async () => {
      if (!companyId) return { totalLeads: 0, conversions: 0 };
      
      const { data, error } = await supabase
        .from('leads')
        .select('status')
        .eq('company_id', companyId);

      if (error) throw error;

      const totalLeads = data?.length || 0;
      const conversions = data?.filter(lead => lead.status === 'Converted').length || 0;

      return { totalLeads, conversions };
    },
    enabled: !!companyId,
  });

  // 3. Fetch Calls Count in the current week (ISO strings)
  const { data: weeklyCallsCount = 0 } = useQuery({
    queryKey: ['targetWeeklyCallsMetrics', companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      
      const start = startOfWeek(new Date()).toISOString();
      const end = endOfWeek(new Date()).toISOString();

      const { count, error } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId,
  });

  // Save Target Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !formData.label || !formData.targetValue) return;

      const targetData = {
        label: formData.label,
        target_value: Number(formData.targetValue),
        current_value: Number(formData.currentValue) || 0,
        type: formData.type,
        updated_at: new Date().toISOString()
      };

      if (editingTargetId) {
        const { error } = await supabase
          .from('targets')
          .update(targetData)
          .eq('id', editingTargetId);

        if (error) throw error;
        toast.success("Target updated successfully");
      } else {
        const { error } = await supabase
          .from('targets')
          .insert({
            ...targetData,
            company_id: companyId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success("Target created successfully");
      }
    },
    onSuccess: () => {
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['targets', companyId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save target");
    }
  });

  // Delete Target Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('targets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets', companyId] });
      toast.success("Target deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete target");
    }
  });

  const handleOpenModal = (target?: TargetRow) => {
    if (target) {
      setEditingTargetId(target.id);
      setFormData({
        label: target.label,
        targetValue: target.target_value.toString(),
        currentValue: target.current_value?.toString() || '0',
        type: (target.type as TargetType) || 'custom'
      });
    } else {
      setEditingTargetId(null);
      setFormData({
        label: '',
        targetValue: '',
        currentValue: '0',
        type: 'calls'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this target?")) return;
    deleteMutation.mutate(id);
  };

  const getTargetIcon = (type: TargetType) => {
    switch (type) {
      case 'calls': return <Phone size={20} className="text-blue-500" />;
      case 'leads': return <Users size={20} className="text-emerald-500" />;
      case 'conversions': return <TrendingUp size={20} className="text-purple-500" />;
      default: return <Target size={20} className="text-brand-500" />;
    }
  };

  const getComputedCurrentValue = (target: TargetRow) => {
    switch (target.type) {
      case 'calls': return weeklyCallsCount;
      case 'leads': return leadMetrics.totalLeads;
      case 'conversions': return leadMetrics.conversions;
      default: return target.current_value || 0;
    }
  };

  const renderTargetCard = (target: TargetRow) => {
    const current = getComputedCurrentValue(target);
    const progress = Math.min(100, Math.round((current / (target.target_value || 1)) * 100));
    const isOnTrack = progress >= 50;

    return (
      <div key={target.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm relative group transition-all hover:shadow-md">
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
          <button onClick={() => handleOpenModal(target)} className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => handleDelete(target.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-colors">
            <Trash2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shadow-sm">
            {getTargetIcon(target.type as TargetType)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{target.label}</h3>
            <div className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mt-1 ${isOnTrack ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isOnTrack ? 'On Track' : 'Needs Attention'}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black text-gray-900">{current.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Goal: {target.target_value.toLocaleString()}</p>
            </div>
            <p className={`text-lg font-black ${isOnTrack ? 'text-emerald-600' : 'text-amber-600'}`}>
              {progress}%
            </p>
          </div>
          <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full ${isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Targets</h2>
          <p className="text-gray-500 text-sm">Define and monitor team KPI benchmarks.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 transition-colors text-white rounded-xl font-bold flex items-center gap-2 shadow-[0_4px_12px_rgba(var(--brand-600),0.2)]">
          <Plus size={18} /> Set New Target
        </button>
      </div>

      {isLoadingTargets ? (
        <div className="flex justify-center py-10"><CallMindLoader size="md" /></div>
      ) : targets.length === 0 ? (
        <div className="bg-white/50 border border-gray-100 border-dashed rounded-[40px] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Target size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No targets set</h3>
          <p className="text-gray-500 max-w-sm mb-8">Define KPIs to track team performance. Whether it's calls, leads, or custom metrics.</p>
          <button onClick={() => handleOpenModal()} className="px-6 py-3 bg-white border-2 border-gray-100 hover:border-brand-500 hover:text-brand-600 transition-all text-gray-900 rounded-xl font-bold flex items-center gap-2 shadow-sm">
            <Plus size={18} /> Set Your First Target
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {targets.map(renderTargetCard)}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Activity size={20} className="text-brand-600" />
                  {editingTargetId ? 'Edit Target' : 'Set New Target'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Target Label</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-900"
                    placeholder="e.g. Weekly Outbound Calls"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Target Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TargetType }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-900 appearance-none"
                  >
                    <option value="calls">Weekly Calls (Auto)</option>
                    <option value="leads">Total Leads (Auto)</option>
                    <option value="conversions">Total Conversions (Auto)</option>
                    <option value="custom">Custom (Manual Update)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Target Value</label>
                    <input
                      type="number"
                      value={formData.targetValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-900"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  {formData.type === 'custom' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Current Value</label>
                      <input
                        type="number"
                        value={formData.currentValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium text-gray-900"
                        placeholder="e.g. 100"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-gray-500 font-bold hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !formData.label || !formData.targetValue}
                  className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {saveMutation.isPending ? <span className="animate-pulse">Saving...</span> : 'Save Target'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
