import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch, SearchResultItem } from '@/hooks/useGlobalSearch';
import { GlobalSearchResultItem } from './GlobalSearchResultItem';
import { Search, X, Clock, Trash2, ArrowUp, ArrowDown, CornerDownLeft, Sparkles, Command } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    query,
    setQuery,
    debouncedQuery,
    category,
    setCategory,
    selectedIndex,
    setSelectedIndex,
    results,
    totalCount,
    executionMs,
    isLoading,
    recentSearches,
    clearRecentSearches,
  } = useGlobalSearch();

  // Focus input automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle Keyboard Arrow Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelectResult = (item: SearchResultItem) => {
    onClose();
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 p-4 animate-fade-in">
      {/* Glassmorphic Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Main Command Palette Dialog */}
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl border border-gray-200/90 shadow-2xl overflow-hidden z-10 space-y-0">
        
        {/* Input Bar Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <Search className="w-5 h-5 text-brand-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, phone numbers (+91), calls, invoices, tickets..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-slate-900 placeholder-gray-400 outline-none"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-slate-600 rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 bg-gray-200/60 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors text-xs font-bold shrink-0"
          >
            Esc
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {[
            { id: 'all', label: 'All Modules' },
            { id: 'leads', label: 'Leads' },
            { id: 'calls', label: 'Calls' },
            { id: 'financials', label: 'Financials' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'tickets', label: 'Tickets' },
            { id: 'documents', label: 'Documents' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                category === cat.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Results Body */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-3">
          {isLoading ? (
            <div className="py-12 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              Searching CRM records...
            </div>
          ) : debouncedQuery.length >= 2 ? (
            results.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <span>Found {totalCount} results</span>
                  <span>{executionMs}ms</span>
                </div>
                {results.map((item, idx) => (
                  <GlobalSearchResultItem
                    key={`${item.module}-${item.id}`}
                    item={item}
                    query={debouncedQuery}
                    isSelected={idx === selectedIndex}
                    onSelect={() => handleSelectResult(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No matching records found</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Try searching by phone number, lead name, company, or invoice number.
                </p>
              </div>
            )
          ) : (
            /* Recent Searches & Quick Suggestions when query is empty */
            <div className="p-3 space-y-4">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 6).map((rec: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(rec.query_text)}
                        className="px-3 py-1 bg-gray-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        {rec.query_text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Search Help Tips */}
              <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 text-xs space-y-2">
                <p className="font-bold text-brand-900 flex items-center gap-1.5">
                  <Command size={14} className="text-brand-600" />
                  Enterprise Smart Search Tips
                </p>
                <ul className="text-brand-700/80 space-y-1 text-[11px]">
                  <li>• Search Indian phone numbers with or without +91: <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 font-bold">9876543210</code></li>
                  <li>• Search financial invoice numbers: <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 font-bold">INV-101</code></li>
                  <li>• Search leads by company or full name.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Command Palette Keyboard Shortcuts Footer */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[9px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[9px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[9px]">↵</kbd>
              Open
            </span>
          </div>
          <span>CallMind Global Search</span>
        </div>
      </div>
    </div>
  );
};
