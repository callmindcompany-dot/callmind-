import { motion } from 'framer-motion';
import { Lock, Settings, ArrowRight } from 'lucide-react';
import type { IntegrationCardProps } from '@/types/integrations';

const TONE_CLASS: Record<NonNullable<IntegrationCardProps['tone']>, string> = {
  ok: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  warn: 'bg-amber-50 text-amber-700 border-amber-100',
  bad: 'bg-red-50 text-red-600 border-red-100',
  idle: 'bg-gray-100 text-gray-500 border-gray-200',
};

export function IntegrationCard({
  title, description, icon, iconBg, iconColor,
  status, statusDetail, actionLabel, onClick, isLocked = false, tone,
}: IntegrationCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      className="bg-white border text-left border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col h-full hover:border-brand-200 transition-all relative overflow-hidden group w-full"
    >
      <div className="flex items-center justify-between mb-4 w-full">
        <div className={`p-3 rounded-2xl ${iconBg} ${iconColor} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border ${
          tone ? TONE_CLASS[tone] :
          status === 'Live' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          status === 'Setup Ready' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
          'bg-gray-100 text-gray-500 border-gray-200'
        }`}>
          {isLocked ? <Lock size={12} /> : <Settings size={12} />}
          {status}
        </div>
      </div>
      <h3 className="font-bold text-gray-900 text-md relative z-10">{title}</h3>
      <p className="text-xs text-gray-400 mt-1.5 mb-6 font-semibold leading-relaxed relative z-10">
        {description}
      </p>
      <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-[11px] font-bold text-gray-700 relative z-10 w-full">
        <span className="text-gray-400 font-semibold">{statusDetail || 'Ingestion Source'}</span>
        <span className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1">
          {actionLabel} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </motion.button>
  );
}
