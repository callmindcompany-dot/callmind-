import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Rocket, 
  Smartphone, 
  Zap, 
  Code, 
  Shield, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft,
  Copy, 
  Check, 
  Play, 
  ExternalLink, 
  Menu, 
  X, 
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DOCS_CATEGORIES, DocArticle, DocCategory, CodeSnippet } from '@/website/data/DocsData';
import { DocsHero3D } from '@/components/docs/DocsHero3D';
import { DocsSearchModal } from '@/components/docs/DocsSearchModal';
import { ApiPlaygroundModal } from '@/components/docs/ApiPlaygroundModal';
import { Navbar } from '@/website/components/Navbar';
import { Footer } from '@/website/components/Footer';
import { SEOHead } from '@/website/components/SEOHead';

export const DocsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>(DOCS_CATEGORIES[0]);
  const [selectedArticle, setSelectedArticle] = useState<DocArticle>(DOCS_CATEGORIES[0].articles[0]);
  const [activeCodeTab, setActiveCodeTab] = useState<number>(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Rocket': return <Rocket className="w-4 h-4 text-brand-600" />;
      case 'Smartphone': return <Smartphone className="w-4 h-4 text-cyan-600" />;
      case 'Zap': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'Code': return <Code className="w-4 h-4 text-violet-500" />;
      case 'Shield': return <Shield className="w-4 h-4 text-emerald-500" />;
      case 'HelpCircle': return <HelpCircle className="w-4 h-4 text-rose-500" />;
      default: return <BookOpen className="w-4 h-4 text-slate-500" />;
    }
  };

  // Flattened articles list for Next/Previous navigation
  const allArticles: DocArticle[] = DOCS_CATEGORIES.flatMap(cat => cat.articles);
  const currentArticleIndex = allArticles.findIndex(a => a.id === selectedArticle.id);
  const prevArticle = currentArticleIndex > 0 ? allArticles[currentArticleIndex - 1] : null;
  const nextArticle = currentArticleIndex < allArticles.length - 1 ? allArticles[currentArticleIndex + 1] : null;

  const navigateToArticle = (article: DocArticle) => {
    setSelectedArticle(article);
    const cat = DOCS_CATEGORIES.find(c => c.articles.some(a => a.id === article.id));
    if (cat) setSelectedCategory(cat);
    setActiveCodeTab(0);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-brand-100 selection:text-brand-700">
      <SEOHead
        title="CallMind Documentation — Setup, Webhooks & API Reference"
        description="Developer and admin documentation for CallMind CRM: IndiaMART, TradeIndia, Meta webhooks, mobile app setup, and REST API reference."
        path="/docs"
      />
      <Navbar />

      {/* Docs Hero Section */}
      <section className="relative pt-28 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200/80 text-xs font-bold text-brand-700 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              CallMind Developer Hub & API Reference
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-950 font-display leading-tight">
              Build & Scale with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-violet-600">CallMind Docs</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
              Step-by-step setup guides, B2B lead webhooks, REST API endpoints, and mobile app protocols designed for business owners and developers.
            </p>

            {/* Quick Search Trigger Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex-1 glass-card flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200/90 shadow-xs hover:border-brand-400 transition-all text-slate-400 hover:text-slate-600 cursor-pointer bg-white"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-brand-600" />
                  <span className="text-sm font-medium text-slate-500">Search guides, APIs, webhooks, error matrix...</span>
                </div>
                <kbd className="hidden sm:inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-300 rounded-md text-[11px] font-mono font-bold text-slate-600 shadow-2xs">
                  Ctrl K
                </kbd>
              </button>

              <button
                onClick={() => setIsPlaygroundOpen(true)}
                className="btn-tactile btn-glow inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                API Playground
              </button>
            </div>
          </div>

          {/* 3D Ecosystem Node Canvas */}
          <div className="lg:col-span-6">
            <DocsHero3D />
          </div>
        </div>
      </section>

      {/* Category Filter Chips Bar */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar border-b border-slate-200/80">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            All Categories ({allArticles.length})
          </button>
          {DOCS_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategoryFilter(cat.id);
                setSelectedCategory(cat);
                setSelectedArticle(cat.articles[0]);
                setActiveCodeTab(0);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategoryFilter === cat.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {getCategoryIcon(cat.iconName)}
              {cat.title} ({cat.articles.length})
            </button>
          ))}
        </div>
      </section>

      {/* Main Documentation Portal Body */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-20">
        {/* Mobile Navigation Toggle Bar */}
        <div className="lg:hidden flex items-center justify-between mb-4 p-3.5 rounded-xl glass-card border border-slate-200 bg-white">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="flex items-center gap-2 text-xs font-bold uppercase text-slate-800"
          >
            <Menu className="w-4 h-4 text-brand-600" />
            {selectedCategory.title} ➔ {selectedArticle.title}
          </button>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-lg bg-slate-100 text-slate-600"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Navigation */}
          <aside className={`lg:col-span-3 lg:block ${isMobileSidebarOpen ? 'block' : 'hidden'} space-y-6 sticky top-24`}>
            <div className="glass-card p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-6 bg-white">
              {DOCS_CATEGORIES
                .filter(cat => activeCategoryFilter === 'all' || activeCategoryFilter === cat.id)
                .map(category => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                      {getCategoryIcon(category.iconName)}
                      {category.title}
                    </div>

                    <div className="space-y-1 pl-2 border-l-2 border-slate-200">
                      {category.articles.map(article => {
                        const isActive = selectedArticle.id === article.id;
                        return (
                          <button
                            key={article.id}
                            onClick={() => {
                              setSelectedCategory(category);
                              setSelectedArticle(article);
                              setActiveCodeTab(0);
                              setIsMobileSidebarOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between cursor-pointer ${
                              isActive
                                ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                            }`}
                          >
                            <span className="truncate">{article.title}</span>
                            {article.apiSpec && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">
                                {article.apiSpec.method}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </aside>

          {/* Main Article Content Viewer */}
          <main className="lg:col-span-9 space-y-6">
            <div className="glass-card p-6 sm:p-10 rounded-2xl border border-slate-200/90 shadow-sm space-y-8 bg-white">
              {/* Article Header Metadata */}
              <div className="border-b border-slate-200 pb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 font-bold border border-brand-200/70">
                    {selectedCategory.title}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">{selectedArticle.readTime}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-medium">Updated {selectedArticle.lastUpdated}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display tracking-tight">
                  {selectedArticle.title}
                </h2>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedArticle.summary}
                </p>

                {/* Article Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* API Endpoint Spec & Multi-Language Code Switcher */}
              {selectedArticle.apiSpec && (
                <div className="space-y-4 p-5 rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-semibold">
                      <span className={`px-2 py-0.5 rounded text-white font-bold text-xs uppercase ${
                        selectedArticle.apiSpec.method === 'POST' ? 'bg-violet-600' :
                        selectedArticle.apiSpec.method === 'GET' ? 'bg-emerald-600' :
                        selectedArticle.apiSpec.method === 'DELETE' ? 'bg-rose-600' : 'bg-amber-600'
                      }`}>
                        {selectedArticle.apiSpec.method}
                      </span>
                      <span className="text-slate-100 font-bold">{selectedArticle.apiSpec.path}</span>
                    </div>

                    <button
                      onClick={() => setIsPlaygroundOpen(true)}
                      className="btn-tactile flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Test in Playground
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 font-sans">{selectedArticle.apiSpec.description}</p>

                  {/* Code Tabs */}
                  {selectedArticle.apiSpec.snippets.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 overflow-x-auto">
                        <div className="flex gap-1">
                          {selectedArticle.apiSpec.snippets.map((snippet, idx) => (
                            <button
                              key={snippet.label}
                              onClick={() => setActiveCodeTab(idx)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                                activeCodeTab === idx
                                  ? 'bg-slate-800 text-brand-400 border-brand-500 font-bold'
                                  : 'text-slate-400 hover:text-slate-200 border-transparent'
                              }`}
                            >
                              {snippet.label}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleCopyCode(selectedArticle.apiSpec!.snippets[activeCodeTab]?.code || '')}
                          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer mb-1"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? 'Copied!' : 'Copy Code'}
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-slate-950 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar border border-slate-800/80 leading-relaxed">
                        <code>{selectedArticle.apiSpec.snippets[activeCodeTab]?.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Sample JSON Response Preview */}
                  {selectedArticle.apiSpec.responseBody && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sample JSON Response (200 OK)</span>
                      <pre className="p-3.5 rounded-xl bg-slate-950 text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 max-h-48 custom-scrollbar">
                        <code>{selectedArticle.apiSpec.responseBody}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Main Markdown Article Content */}
              <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
                {selectedArticle.content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();

                  if (trimmed.startsWith('###')) {
                    return (
                      <h3 key={index} className="text-lg sm:text-xl font-black text-slate-950 font-display mt-8 mb-3 border-b border-slate-100 pb-2">
                        {trimmed.replace('###', '').trim()}
                      </h3>
                    );
                  }

                  if (trimmed.startsWith('####')) {
                    return (
                      <h4 key={index} className="text-base font-bold text-slate-900 font-display mt-6 mb-2">
                        {trimmed.replace('####', '').trim()}
                      </h4>
                    );
                  }

                  // Styled GitHub Alert Callout Boxes
                  if (trimmed.startsWith('> [!NOTE]')) {
                    return (
                      <div key={index} className="p-4 rounded-xl bg-blue-50 border-l-4 border-brand-600 text-brand-900 text-xs sm:text-sm my-4 flex items-start gap-3">
                        <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <div>{trimmed.replace('> [!NOTE]', '').trim()}</div>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('> [!TIP]')) {
                    return (
                      <div key={index} className="p-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs sm:text-sm my-4 flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>{trimmed.replace('> [!TIP]', '').trim()}</div>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('> [!WARNING]') || trimmed.startsWith('> [!IMPORTANT]')) {
                    return (
                      <div key={index} className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs sm:text-sm my-4 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>{trimmed.replace('> [!WARNING]', '').replace('> [!IMPORTANT]', '').trim()}</div>
                      </div>
                    );
                  }

                  return (
                    <p key={index} className="text-slate-600 leading-relaxed">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Next / Previous Article Footer Navigation */}
              <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                {prevArticle ? (
                  <button
                    onClick={() => navigateToArticle(prevArticle)}
                    className="w-full sm:w-auto p-4 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-brand-50/40 text-left transition-all group flex items-center gap-3 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-brand-600 group-hover:-translate-x-1 transition-transform" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Previous Guide</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-brand-700">{prevArticle.title}</span>
                    </div>
                  </button>
                ) : <div />}

                {nextArticle && (
                  <button
                    onClick={() => navigateToArticle(nextArticle)}
                    className="w-full sm:w-auto p-4 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-brand-50/40 text-right transition-all group flex items-center gap-3 ml-auto cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Next Guide</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-brand-700">{nextArticle.title}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </section>

      {/* Modals */}
      <DocsSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={article => navigateToArticle(article)}
      />

      <ApiPlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        apiSpec={selectedArticle.apiSpec || DOCS_CATEGORIES[3].articles[1].apiSpec}
      />

      <Footer />
    </div>
  );
};
