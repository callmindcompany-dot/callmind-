import React from 'react';

interface SkeletonLoaderProps {
  type: 'table' | 'card' | 'list';
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, count = 5 }) => {
  if (type === 'table') {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-4 border-b border-slate-50">
            <div className="w-4 h-4 bg-slate-100 rounded" />
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="h-4 bg-slate-50 rounded w-1/6" />
            <div className="h-4 bg-slate-50 rounded w-1/5" />
            <div className="h-4 bg-slate-50 rounded w-1/12" />
            <div className="h-4 bg-slate-100 rounded w-1/12" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-24" />
                  <div className="h-3 bg-slate-50 rounded w-16" />
                </div>
              </div>
              <div className="w-6 h-6 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 bg-slate-50 rounded w-3/4" />
            <div className="flex gap-2 pt-3 border-t border-slate-50">
              <div className="w-12 h-6 bg-slate-100 rounded-full" />
              <div className="w-16 h-6 bg-slate-50 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List layout loader
  return (
    <div className="space-y-4 animate-pulse w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 p-6 bg-white/40 border border-white/60 rounded-[30px]">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-slate-100 rounded-full w-1/4" />
            <div className="h-4 bg-slate-50 rounded-full w-1/2" />
          </div>
          <div className="w-20 h-8 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  );
};
export default SkeletonLoader;
