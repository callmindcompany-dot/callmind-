import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'react-hot-toast';
import { 
  X, Send, User, Phone, Mail, Globe, 
  MapPin, FileText, Star,
  ShieldCheck, Info
} from 'lucide-react';
import CallMindLoader from '@components/CallMindLoader';
import { LeadStatus, LeadSource, LeadFormData, Lead } from '../../types/lead';
import { useCreateLead, useUpdateLead } from '../../hooks/useLeads';
import { useCustomFields } from '../../hooks/useCustomFields';
import { useDeduplication } from '../../hooks/useDeduplication';
import { DynamicFieldRenderer } from '../../components/DynamicFieldRenderer';
import { DuplicateResolutionModal } from '../../components/DuplicateResolutionModal';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

const phoneRegex = /^[6-9]\d{9}$/;

const leadSchema = z.object({
  name: z.string().min(2, 'Full name is required (min 2 chars)'),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email format').or(z.string().length(0)),
  source: z.nativeEnum(LeadSource),
  status: z.nativeEnum(LeadStatus),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  custom_fields: z.record(z.string(), z.any()).optional(),
});

type LeadFormValues = z.infer<typeof leadSchema>;

interface LeadFormProps {
  lead?: Lead;
  onClose: () => void;
}

/**
 * LeadForm Component
 * A multi-modal form for adding or editing leads with deep validation
 */
export const LeadForm: React.FC<LeadFormProps> = ({ lead, onClose }) => {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isEditing = !!lead;

  // Custom Fields and Deduplication Hooks
  const { fields: customFieldDefinitions } = useCustomFields();
  const { 
    duplicateLead, 
    checkDuplicate, 
    clearDuplicate, 
    mergeLeads, 
    overwriteLead,
    isMerging,
    isOverwriting 
  } = useDeduplication();

  const [pendingLeadData, setPendingLeadData] = useState<any | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead ? {
      name: lead.name,
      phone: lead.phone,
      email: lead.email || '',
      source: lead.source,
      status: lead.status,
      city: lead.city || '',
      state: lead.state || '',
      notes: lead.notes || '',
      custom_fields: lead.custom_fields || {},
    } : {
      name: '',
      phone: '',
      email: '',
      source: LeadSource.OTHER,
      status: LeadStatus.NEW,
      city: '',
      state: '',
      notes: '',
      custom_fields: {},
    }
  });

  const onSubmit = async (data: LeadFormValues) => {
    try {
      if (isEditing) {
        await updateLead.mutateAsync({ 
          id: lead.id, 
          data: {
            ...data,
            custom_fields: data.custom_fields || {}
          } as Partial<Lead>
        });
        onClose();
      } else {
        // Run deduplication check
        const dup = await checkDuplicate(data.phone);
        if (dup) {
          setPendingLeadData(data);
          return;
        }

        await createLead.mutateAsync({
          ...data,
          custom_fields: data.custom_fields || {}
        } as LeadFormData);
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save lead");
    }
  };

  const handleResolveDuplicate = async (action: 'skip' | 'overwrite' | 'merge') => {
    if (!duplicateLead || !pendingLeadData) return;

    try {
      if (action === 'overwrite') {
        await overwriteLead({
          existingLeadId: duplicateLead.id,
          newFields: {
            ...pendingLeadData,
            custom_fields: pendingLeadData.custom_fields || {}
          }
        });
        onClose();
      } else if (action === 'merge') {
        await mergeLeads({
          existingLead: duplicateLead,
          newFields: {
            ...pendingLeadData,
            custom_fields: pendingLeadData.custom_fields || {}
          }
        });
        onClose();
      } else {
        clearDuplicate();
        setPendingLeadData(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve duplicate lead");
    }
  };


  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modern Form Header */}
        <div className="p-10 pb-6 border-b border-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                <Star className="w-4 h-4 fill-brand-600" />
              </span>
              <h2 className="text-2xl font-black font-display text-slate-900">
                {isEditing ? 'Edit Lead Details' : 'Add New Lead'}
              </h2>
            </div>
            <p className="text-slate-400 text-sm font-medium">Please enter the contact details below</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-10 overflow-y-auto custom-scrollbar">
          <div className="space-y-8">
            {/* Essential Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('name')}
                    placeholder="e.g. Rahul Sharma"
                    className={clsx(
                      "w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300",
                      errors.name && "border-rose-300 bg-rose-50/50"
                    )}
                  />
                  {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1.5 pl-1 uppercase tracking-wider">{errors.name.message as string}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('phone')}
                    placeholder="98XXXXXXXX"
                    className={clsx(
                      "w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300",
                      errors.phone && "border-rose-300 bg-rose-50/50"
                    )}
                  />
                  {errors.phone && <p className="text-[10px] font-bold text-rose-500 mt-1.5 pl-1 uppercase tracking-wider">{errors.phone.message as string}</p>}
                </div>
              </div>
            </div>

            {/* Source & Communications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Source</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select 
                    {...register('source')}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold appearance-none cursor-pointer"
                  >
                    {Object.values(LeadSource).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('email')}
                    placeholder="name@domain.com"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Geographical Context */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">City</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('city')}
                    placeholder="e.g. Pune"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">State/Region</label>
                <input 
                  {...register('state')}
                  placeholder="e.g. MH"
                  className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Rich Context */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Notes</label>
              <div className="relative">
                <FileText className="absolute left-4 top-5 w-4 h-4 text-slate-400" />
                <textarea 
                  {...register('notes')}
                  rows={4}
                  placeholder="Notes about the lead..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-[30px] focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-bold placeholder:text-slate-300 resize-none"
                />
              </div>
            </div>

            {/* Dynamic Custom Fields Renderer */}
            <DynamicFieldRenderer
              fields={customFieldDefinitions}
              register={register}
              errors={errors}
            />
          </div>
        </form>

        {/* Action Bar */}
        <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-5 bg-white border border-slate-200 text-slate-600 rounded-[25px] font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit(onSubmit)}
            disabled={isMerging || isOverwriting}
            className="flex-[2] py-5 bg-brand-600 text-white rounded-[25px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-brand-600/30 hover:bg-brand-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isMerging || isOverwriting ? <CallMindLoader size="xs" /> : <ShieldCheck className="w-5 h-5" />}
            <span>{isEditing ? 'Save Changes' : 'Add Lead'}</span>
          </button>
        </div>
      </motion.div>

      {/* Duplicate Resolution Modal Overlay */}
      <AnimatePresence>
        {duplicateLead && pendingLeadData && (
          <DuplicateResolutionModal
            existingLead={duplicateLead}
            newLeadData={pendingLeadData}
            onResolve={handleResolveDuplicate}
            onClose={clearDuplicate}
            isProcessing={isMerging || isOverwriting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
