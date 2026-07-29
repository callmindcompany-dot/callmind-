import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, FileText, Code, Zap, Shield, HelpCircle, Rocket } from 'lucide-react';
import { DOCS_CATEGORIES, DocArticle } from '@/website/data/DocsData';

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectArticle: (article: DocArticle) => void;
}

export const DocsSearchModal: React.FC<DocsSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectArticle
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Flatten all articles
  const allArticles: DocArticle[] = DOCS_CATEGORIES.flatMap(cat => cat.articles);

  // Filter articles based on search query
  const filteredArticles = query.trim() === ''
    ? allArticles.slice(0, 5)
    : allArticles.filter(art =>
        art.title.toLowerCase().includes(query.toLowerCase()) ||
        art.summary.toLowerCase().includes(query.toLowerCase()) ||
        art.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredArticles.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredArticles.length) % Math.max(1, filteredArticles.length));
      } else if (e.key === 'Enter' && filteredArticles[selectedIndex]) {
        e.preventDefault();
        onSelectArticle(filteredArticles[selectedIndex]);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredArticles, selectedIndex, onClose, onSelectArticle]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'getting-started': return <Rocket className="w-4 h-4 text-brand-600" />;
      case 'integrations': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'api-reference': return <Code className="w-4 h-4 text-violet-500" />;
      case 'security': return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'troubleshooting': return <HelpCircle className="w-4 h-4 text-cyan-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-slate-950/40 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white/95 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-150 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-base focus:outline-none font-medium"
            placeholder="Search docs, APIs, integrations, error codes..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[420px]">
          {filteredArticles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No results found for "<span className="font-semibold text-slate-700">{query}</span>"
            </div>
          ) : (
            filteredArticles.map((art, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={art.id}
                  onClick={() => {
                    onSelectArticle(art);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-brand-50 border border-brand-200/80 shadow-sm'
                      : 'hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-xs border border-slate-200 shrink-0 mt-0.5">
                      {getCategoryIcon(art.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{art.title}</span>
                        {art.apiSpec && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase">
                            {art.apiSpec.method}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{art.summary}</p>
                    </div>
                  </div>

                  <ArrowRight className={`w-4 h-4 mt-1 transition-transform ${isSelected ? 'text-brand-600 translate-x-0.5' : 'text-slate-300'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard shortcut footer */}
        <div className="px-4 py-2.5 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 text-[10px] font-mono shadow-xs">↑↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 text-[10px] font-mono shadow-xs">↵</kbd> to select</span>
            <span><kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 text-[10px] font-mono shadow-xs">esc</kbd> to close</span>
          </div>
          <span className="font-medium text-brand-600">CallMind Docs</span>
        </div>
      </div>
    </div>
  );
};
