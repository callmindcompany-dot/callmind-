import { motion } from 'framer-motion';
import { Lock, Building2, Settings } from 'lucide-react';
import type { ProviderCardProps } from '@/types/integrations';

export function ProviderCard({
  title, description, icon, iconBg, iconColor,
  status, statusDetail, actionLabel, onClick, isLocked = false,
}: ProviderCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      className="bg-white text-left border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col h-full hover:border-brand-200 transition-all relative overflow-hidden group w-full"
    >
      <div className="flex items-start justify-between mb-4 gap-4 w-full">
        <div className="flex flex-col gap-2">
          <div className={`p-3 rounded-2xl self-start ${iconBg} ${iconColor} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <h3 className="font-bold text-gray-950 text-md">{title}</h3>
        </div>
        <div className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border ${
          status === 'Enterprise' ? 'bg-slate-900 text-white border-slate-800' :
          status === 'Enterprise Template' ? 'bg-slate-900 text-white border-slate-800' :
          'bg-gray-100 text-gray-500 border-gray-150'
        }`}>
          {status === 'Enterprise' || status === 'Enterprise Template' ? <Building2 size={12} /> : <Lock size={12} />}
          {status}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 mb-6 font-semibold leading-relaxed relative z-10">
        {description}
      </p>
      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold relative z-10 w-full">
        <span className="text-gray-400 font-semibold">{statusDetail || 'External Provider'}</span>
        <span className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-2 bg-brand-50 px-4 py-1.5 rounded-xl transition-colors">
          <Settings size={12} /> {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}
