import React from 'react';
import { SearchResultItem } from '@/hooks/useGlobalSearch';
import { UserCheck, PhoneCall, CreditCard, CheckSquare, ShieldAlert, FileText, Zap, ChevronRight } from 'lucide-react';

interface GlobalSearchResultItemProps {
  item: SearchResultItem;
  query: string;
  isSelected: boolean;
  onSelect: () => void;
}

export const GlobalSearchResultItem: React.FC<GlobalSearchResultItemProps> = ({
  item,
  query,
  isSelected,
  onSelect,
}) => {
  // Highlight Matching Text Utility
  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight || !highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="bg-amber-200 text-amber-900 rounded px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'leads':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'calls':
        return <PhoneCall className="w-4 h-4 text-emerald-600" />;
      case 'invoices':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'tasks':
        return <CheckSquare className="w-4 h-4 text-purple-600" />;
      case 'tickets':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-cyan-600" />;
      default:
        return <Zap className="w-4 h-4 text-brand-600" />;
    }
  };

  const getBadgeColor = (badge?: string) => {
    if (!badge) return 'bg-gray-100 text-gray-600';
    const b = badge.toLowerCase();
    if (b.includes('won') || b.includes('paid') || b.includes('completed')) return 'bg-emerald-100 text-emerald-700';
    if (b.includes('pending') || b.includes('new')) return 'bg-blue-100 text-blue-700';
    if (b.includes('overdue') || b.includes('urgent')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div
      onClick={onSelect}
      className={`px-4 py-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
        isSelected ? 'bg-brand-50 border border-brand-200 shadow-sm' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-gray-100/80 flex items-center justify-center shrink-0">
          {getModuleIcon(item.module)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 truncate">
              {renderHighlightedText(item.title, query)}
            </span>
            {item.badge && (
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${getBadgeColor(item.badge)}`}>
                {item.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {renderHighlightedText(item.subtitle, query)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 text-gray-400">
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-100 rounded-md">
          {item.module}
        </span>
        <ChevronRight size={14} className={isSelected ? 'text-brand-600' : 'text-gray-400'} />
      </div>
    </div>
  );
};
