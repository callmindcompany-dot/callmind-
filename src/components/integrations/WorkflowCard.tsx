import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { WorkflowCardProps } from '@/types/integrations';

export function WorkflowCard({
  title, description, icon, iconBg, iconColor,
  status, actionLabel, onClick,
}: WorkflowCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white border text-left border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col h-full hover:border-brand-200 transition-all w-full group cursor-pointer"
    >
      <div className="flex items-center justify-between mb-4 w-full">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl ${iconBg} ${iconColor} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <h3 className="font-bold text-sm text-gray-900">{title}</h3>
        </div>
        <div className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
          <CheckCircle2 size={12} /> {status}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-6 font-semibold leading-relaxed ms-1">
        {description}
      </p>
      <div className="mt-auto pt-4 border-t border-gray-50 flex justify-end w-full">
        <span className="text-brand-600 hover:text-brand-700 font-bold text-[11px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actionLabel} <ArrowRight size={12} className="group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  );
}
