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
  Menu, 
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Info,
  Terminal,
  ChevronDown
} from 'lucide-react';
import { DOCS_CATEGORIES, DocArticle, DocCategory } from '@/website/data/DocsData';
import { DocsSearchModal } from '@/components/docs/DocsSearchModal';
import { Navbar } from '@/website/components/Navbar';
import { Footer } from '@/website/components/Footer';
import { SEOHead } from '@/website/components/SEOHead';

export const DocsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>(DOCS_CATEGORIES[0]);
  const [selectedArticle, setSelectedArticle] = useState<DocArticle>(DOCS_CATEGORIES[0].articles[0]);
  const [activeCodeTab, setActiveCodeTab] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<boolean>(false);

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

  const handleCopyPath = (pathText: string) => {
    navigator.clipboard.writeText(`https://callmind.app${pathText}`);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <SEOHead
        title="Documentation & API Guide — Quickstart & Webhooks | CallMind CRM"
        description="Official technical documentation for CallMind CRM. Step-by-step guides for webhook integration, role configurations, custom fields, and mobile app deployment."
        path="/docs"
        keywords={[
          'CallMind documentation',
          'telecalling API docs',
          'lead webhook setup guide',
          'CRM admin tutorial',
          'sales executive onboarding guide',
          'IndiaMART webhook API tutorial',
        ]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Documentation', path: '/docs' },
        ]}
        jsonLd={[
          {
            '@type': 'TechArticle',
            '@id': 'https://callmind.app/docs#techarticle',
            headline: 'CallMind CRM Developer & User Documentation',
            description:
              'Official guides, webhook endpoints, and setup documentation for CallMind CRM.',
            articleSection: selectedCategory.title,
          },
        ]}
      />
      <Navbar />

      {/* Top Header & Search Bar */}
      <div className="pt-24 pb-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <span>Documentation</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 font-bold">{selectedCategory.title}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-950 tracking-tight">
                Developer & User Documentation
              </h1>
            </div>

            {/* Quick Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full md:w-80 flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-500 text-sm transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium">Search docs & APIs...</span>
              </div>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-semibold text-slate-400">
                Ctrl K
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Main Documentation Portal */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Navigation Toggle Bar */}
        <div className="lg:hidden flex items-center justify-between mb-4 p-3 rounded-lg bg-white border border-slate-200">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="flex items-center gap-2 text-xs font-bold text-slate-800"
          >
            <Menu className="w-4 h-4 text-brand-600" />
            <span>{selectedCategory.title}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-brand-600 truncate max-w-[180px]">{selectedArticle.title}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Navigation Sidebar */}
          <aside className={`lg:col-span-3 ${isMobileSidebarOpen ? 'block' : 'hidden'} lg:block sticky top-24`}>
            <nav className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {DOCS_CATEGORIES.map(category => (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 font-display pb-1 border-b border-slate-100">
                    {getCategoryIcon(category.iconName)}
                    <span>{category.title}</span>
                  </div>

                  <div className="space-y-0.5 pt-1">
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
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{article.title}</span>
                          {article.apiSpec && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {article.apiSpec.method}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Article Document Viewer */}
          <main className="lg:col-span-9 space-y-6">
            <article className="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-2xs space-y-8">
              {/* Header Info */}
              <div className="border-b border-slate-200 pb-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    {selectedCategory.title}
                  </span>
                  <span>•</span>
                  <span>{selectedArticle.readTime}</span>
                  <span>•</span>
                  <span>Updated {selectedArticle.lastUpdated}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-950 tracking-tight">
                  {selectedArticle.title}
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  {selectedArticle.summary}
                </p>

                {/* Article Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedArticle.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* API Endpoint Inspector (If API Spec exists) */}
              {selectedArticle.apiSpec && (
                <div className="space-y-4 p-5 rounded-xl bg-slate-950 text-slate-100 border border-slate-800">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
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
                      onClick={() => handleCopyPath(selectedArticle.apiSpec!.path)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                    >
                      {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPath ? 'URL Copied' : 'Copy Endpoint'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-400">{selectedArticle.apiSpec.description}</p>

                  {/* Request Headers */}
                  {selectedArticle.apiSpec.headers && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Request Headers</span>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                        {Object.entries(selectedArticle.apiSpec.headers).map(([key, val]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-slate-400">{key}:</span>
                            <span className="text-slate-200">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code Snippets */}
                  {selectedArticle.apiSpec.snippets.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-800 overflow-x-auto">
                        <div className="flex gap-1">
                          {selectedArticle.apiSpec.snippets.map((snippet, idx) => (
                            <button
                              key={snippet.label}
                              onClick={() => setActiveCodeTab(idx)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors border-b-2 cursor-pointer font-mono ${
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
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer mb-1"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                        </button>
                      </div>

                      <pre className="p-4 rounded-lg bg-slate-900 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar border border-slate-800 leading-relaxed">
                        <code>{selectedArticle.apiSpec.snippets[activeCodeTab]?.code}</code>
                      </pre>
                    </div>
                  )}

                  {/* Sample JSON Response */}
                  {selectedArticle.apiSpec.responseBody && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response Sample (200 OK)</span>
                      <pre className="p-3 rounded-lg bg-slate-900 text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800 max-h-48 custom-scrollbar">
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
                      <h3 key={index} className="text-lg font-bold text-slate-900 font-display mt-8 mb-3 border-b border-slate-100 pb-2">
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
                      <div key={index} className="p-4 rounded-lg bg-blue-50 border-l-4 border-brand-600 text-brand-900 text-xs sm:text-sm my-4 flex items-start gap-3">
                        <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                        <div>{trimmed.replace('> [!NOTE]', '').trim()}</div>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('> [!TIP]')) {
                    return (
                      <div key={index} className="p-4 rounded-lg bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs sm:text-sm my-4 flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>{trimmed.replace('> [!TIP]', '').trim()}</div>
                      </div>
                    );
                  }

                  if (trimmed.startsWith('> [!WARNING]')) {
                    return (
                      <div key={index} className="p-4 rounded-lg bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-xs sm:text-sm my-4 flex items-start gap-3">
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
                    className="p-3 sm:p-4 rounded-lg border border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50 text-left transition-all group flex items-center gap-3 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:-translate-x-1 transition-transform" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Previous</span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-brand-600">{prevArticle.title}</span>
                    </div>
                  </button>
                ) : <div />}

                {nextArticle && (
                  <button
                    onClick={() => navigateToArticle(nextArticle)}
                    className="p-3 sm:p-4 rounded-lg border border-slate-200 hover:border-brand-400 bg-white hover:bg-slate-50 text-right transition-all group flex items-center gap-3 ml-auto cursor-pointer"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Next</span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-brand-600">{nextArticle.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </article>
          </main>
        </div>
      </div>

      {/* Search Modal */}
      <DocsSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectArticle={article => navigateToArticle(article)}
      />

      <Footer />
    </div>
  );
};
