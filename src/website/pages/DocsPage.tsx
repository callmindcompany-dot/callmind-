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
  Copy, 
  Check, 
  Play, 
  ExternalLink, 
  Menu, 
  X, 
  ArrowLeft,
  Sparkles,
  BookOpen
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-brand-100 selection:text-brand-700">
      <SEOHead
        title="CallMind Documentation — Setup, Webhooks & API Reference"
        description="Developer and admin docs for CallMind CRM: IndiaMART & Meta webhook setup, mobile app pairing, and API reference."
        path="/docs"
      />
      <Navbar />

      {/* Docs Hero Section */}
      <section className="relative pt-28 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-xs font-bold text-brand-700">
              <Sparkles className="w-3.5 h-3.5" />
              CallMind Developer Hub & API Reference
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-950 font-display leading-tight">
              Build Faster with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-violet-600">CallMind Docs</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
              Complete guides, REST API specifications, B2B lead webhooks, and mobile app protocols designed for business owners and developers.
            </p>

            {/* Quick Search Trigger Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex-1 glass-card flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 shadow-sm hover:border-brand-300 transition-all text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium">Search docs, APIs, error codes...</span>
                </div>
                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[11px] font-mono font-semibold text-slate-500">
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

      {/* Main Documentation Portal Body */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-20">
        {/* Mobile Navigation Toggle Bar */}
        <div className="lg:hidden flex items-center justify-between mb-4 p-3 rounded-xl glass-card border border-slate-200">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="flex items-center gap-2 text-xs font-bold uppercase text-slate-700"
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
            <div className="glass-card p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              {DOCS_CATEGORIES.map(category => (
                <div key={category.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-display">
                    {getCategoryIcon(category.iconName)}
                    {category.title}
                  </div>

                  <div className="space-y-1 pl-2 border-l-2 border-slate-200/60">
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
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-brand-50 text-brand-700 font-semibold border-l-2 border-brand-600 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                          }`}
                        >
                          <span className="truncate">{article.title}</span>
                          {article.apiSpec && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                              API
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
            <div className="glass-card p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-8 bg-white/80">
              {/* Article Header Metadata */}
              <div className="border-b border-slate-200 pb-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 font-bold border border-brand-200/60">
                    {selectedCategory.title}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-medium">{selectedArticle.readTime}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-medium">Updated {selectedArticle.lastUpdated}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display tracking-tight">
                  {selectedArticle.title}
                </h2>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {selectedArticle.summary}
                </p>

                {/* Article Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* API Endpoint Spec & Multi-Language Code Switcher */}
              {selectedArticle.apiSpec && (
                <div className="space-y-4 p-5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-semibold">
                      <span className="px-2 py-0.5 rounded bg-violet-600 text-white font-bold text-xs uppercase">
                        {selectedArticle.apiSpec.method}
                      </span>
                      <span className="text-slate-200">{selectedArticle.apiSpec.path}</span>
                    </div>

                    <button
                      onClick={() => setIsPlaygroundOpen(true)}
                      className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Test in Playground
                    </button>
                  </div>

                  {/* Code Tabs */}
                  {selectedArticle.apiSpec.snippets.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 overflow-x-auto">
                        <div className="flex gap-1">
                          {selectedArticle.apiSpec.snippets.map((snippet, idx) => (
                            <button
                              key={snippet.label}
                              onClick={() => setActiveCodeTab(idx)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                                activeCodeTab === idx
                                  ? 'bg-slate-800 text-brand-400 border-brand-500'
                                  : 'text-slate-400 hover:text-slate-200 border-transparent'
                              }`}
                            >
                              {snippet.label}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => handleCopyCode(selectedArticle.apiSpec!.snippets[activeCodeTab]?.code || '')}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-slate-950 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar border border-slate-800/80">
                        <code>{selectedArticle.apiSpec.snippets[activeCodeTab]?.code}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Main Markdown Article Content */}
              <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
                {selectedArticle.content.split('\n\n').map((paragraph, index) => {
                  if (paragraph.startsWith('###')) {
                    return (
                      <h3 key={index} className="text-lg sm:text-xl font-bold text-slate-950 font-display mt-6 mb-2">
                        {paragraph.replace('###', '').trim()}
                      </h3>
                    );
                  }
                  return (
                    <p key={index} className="text-slate-600 leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      </section>

      {/* Modals */}
      <DocsSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={article => {
          setSelectedArticle(article);
          const cat = DOCS_CATEGORIES.find(c => c.articles.some(a => a.id === article.id));
          if (cat) setSelectedCategory(cat);
        }}
      />

      <ApiPlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        apiSpec={selectedArticle.apiSpec || DOCS_CATEGORIES[3].articles[0].apiSpec}
      />

      <Footer />
    </div>
  );
};
