import React from 'react';
import { motion } from 'framer-motion';

interface ActionProgressBarProps {
  progress: number; // 0 to 100
  title: string;
  total: number;
  current: number;
}

export const ActionProgressBar: React.FC<ActionProgressBarProps> = ({
  progress,
  title,
  total,
  current
}) => {
  if (progress <= 0 || progress >= 100) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[130] bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-slate-800 w-80 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</span>
        <span className="text-xs font-bold text-brand-400">
          {current} / {total}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-brand-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
    </div>
  );
};
