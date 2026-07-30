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
  Menu, 
  X, 
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  FileText
} from 'lucide-react';
import { DOCS_CATEGORIES, DocArticle, DocCategory } from '@/website/data/DocsData';
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
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="CallMind Documentation & API Reference"
        description="Documentation, integration guides, and REST API specification for CallMind CRM."
        path="/docs"
      />
      <Navbar />

      {/* Header Banner */}
      <header className="pt-28 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 font-sans">
              <Terminal className="w-3.5 h-3.5 text-brand-600" />
              CallMind Documentation & API Reference
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase text-slate-950 font-display tracking-tight">
              Documentation & API Hub
            </h1>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
              Official setup guides, REST API endpoint specifications, lead webhooks, and mobile app protocols.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-brand-400 text-slate-600 text-sm font-medium transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search Docs</span>
              <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-500">
                Ctrl K
              </kbd>
            </button>

            <button
              onClick={() => setIsPlaygroundOpen(true)}
              className="btn-tactile flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-sm transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              API Playground
            </button>
          </div>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-6 pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap font-sans ${
              activeCategoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            All Docs ({allArticles.length})
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 font-sans ${
                activeCategoryFilter === cat.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {getCategoryIcon(cat.iconName)}
              {cat.title} ({cat.articles.length})
            </button>
          ))}
        </div>
      </header>

      {/* Main Documentation Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden flex items-center justify-between mb-4 p-3 rounded-xl bg-white border border-slate-200">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="flex items-center gap-2 text-xs font-bold uppercase text-slate-800"
          >
            <Menu className="w-4 h-4 text-brand-600" />
            {selectedCategory.title} ➔ {selectedArticle.title}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Navigation Tree */}
          <aside className={`lg:col-span-3 lg:block ${isMobileSidebarOpen ? 'block' : 'hidden'} sticky top-24`}>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-6">
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
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer font-sans ${
                              isActive
                                ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{article.title}</span>
                            {article.apiSpec && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0 font-mono">
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

          {/* Right Article Viewer */}
          <section className="lg:col-span-9">
            <article className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xs space-y-8">
              {/* Metadata */}
              <div className="border-b border-slate-200 pb-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-slate-500">
                  <span className="px-2.5 py-0.5 rounded bg-brand-50 text-brand-700 font-bold border border-brand-200">
                    {selectedCategory.title}
                  </span>
                  <span>•</span>
                  <span>{selectedArticle.readTime}</span>
                  <span>•</span>
                  <span>Updated {selectedArticle.lastUpdated}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 font-display tracking-tight">
                  {selectedArticle.title}
                </h2>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-sans">
                  {selectedArticle.summary}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 font-sans">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* API Endpoint Inspector (If API Spec exists) */}
              {selectedArticle.apiSpec && (
                <div className="space-y-4 p-5 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 font-mono text-xs sm:text-sm">
                      <span className={`px-2 py-0.5 rounded text-white font-bold text-xs ${
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
                      className="btn-tactile flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-colors cursor-pointer font-sans"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Test in Playground
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 font-sans">{selectedArticle.apiSpec.description}</p>

                  {/* Code Snippets */}
                  {selectedArticle.apiSpec.snippets.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 overflow-x-auto">
                        <div className="flex gap-1">
                          {selectedArticle.apiSpec.snippets.map((snippet, idx) => (
                            <button
                              key={snippet.label}
                              onClick={() => setActiveCodeTab(idx)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer font-mono ${
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
                          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer mb-1 font-sans"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-slate-900 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar border border-slate-800 leading-relaxed">
                        <code>{selectedArticle.apiSpec.snippets[activeCodeTab]?.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* JSON Response Sample */}
                  {selectedArticle.apiSpec.responseBody && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">Sample Response (200 OK)</span>
                      <pre className="p-3 rounded-xl bg-slate-900 text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 max-h-48 custom-scrollbar">
                        <code>{selectedArticle.apiSpec.responseBody}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Main Content Markdown Renderer */}
              <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4 font-sans">
                {selectedArticle.content.split('\n\n').map((paragraph, index) => {
                  const trimmed = paragraph.trim();

                  if (trimmed.startsWith('###')) {
                    return (
                      <h3 key={index} className="text-lg sm:text-xl font-bold text-slate-950 font-display mt-8 mb-3 border-b border-slate-100 pb-2">
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

                  // Alert Callouts
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

                  if (trimmed.startsWith('> [!WARNING]')) {
                    return (
                      <div key={index} className="p-4 rounded-xl bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs sm:text-sm my-4 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>{trimmed.replace('> [!WARNING]', '').trim()}</div>
                      </div>
                    );
                  }

                  return (
                    <p key={index} className="text-slate-600 leading-relaxed font-sans">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="pt-8 border-t border-slate-200 flex items-center justify-between gap-4 font-sans">
                {prevArticle ? (
                  <button
                    onClick={() => navigateToArticle(prevArticle)}
                    className="p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50 text-left transition-all group flex items-center gap-3 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:-translate-x-1 transition-transform" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Previous</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-brand-600">{prevArticle.title}</span>
                    </div>
                  </button>
                ) : <div />}

                {nextArticle && (
                  <button
                    onClick={() => navigateToArticle(nextArticle)}
                    className="p-3 sm:p-4 rounded-xl border border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50 text-right transition-all group flex items-center gap-3 ml-auto cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Next</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-brand-600">{nextArticle.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </article>
          </section>
        </div>
      </main>

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
