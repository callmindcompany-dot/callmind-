import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  MessageSquare,
  Video,
  Mail,
  Smartphone,
  X,
  Send,
  Bug,
  ChevronDown,
  ChevronUp,
  Search,
  HelpCircle,
  AlertCircle,
  Headphones,
  Sparkles,
  BookOpen,
  ArrowRight,
  LifeBuoy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import {
  useHelpFaqs,
  useSupportChatHistory,
  useSendSupportMessage,
  useCompanySupportSettings
} from '@/hooks/useHelpAcademy';
import { HelpFaq } from '@/types/helpAcademy';
import { toast } from 'react-hot-toast';

// ─── Skeleton Components ─────────────────────────────────────────────────────
const FaqSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="border border-gray-100 rounded-2xl p-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-200 rounded-full w-3/4" />
          <div className="h-4 w-4 bg-gray-100 rounded" />
        </div>
      </div>
    ))}
  </div>
);

const CategorySkeleton = () => (
  <div className="flex flex-wrap gap-1.5 animate-pulse">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="h-7 bg-gray-200 rounded-xl w-20" />
    ))}
  </div>
);

// ─── Category Pills config ────────────────────────────────────────────────────
const FAQ_CATEGORIES = ['All', 'Getting Started', 'Leads', 'Calls', 'Reports', 'Team', 'Billing'] as const;
type FaqCategory = typeof FAQ_CATEGORIES[number];

// ─── Main Component ───────────────────────────────────────────────────────────
export const HelpCenterPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>('All');
  const [activeFaqId, setActiveFaqId] = useState<string | null>(null);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // Queries & Mutations
  const { data: faqs = [], isLoading: isFaqsLoading, isError: isFaqsError } = useHelpFaqs(companyId);
  const { data: chatHistory = [], isLoading: isChatLoading } = useSupportChatHistory(companyId, user?.uid || null);
  const { data: settings } = useCompanySupportSettings(companyId);
  const sendMessageMutation = useSendSupportMessage();

  // Combined filters
  const filteredFaqs = useMemo<HelpFaq[]>(() => {
    return faqs.filter(faq => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [faqs, searchQuery, selectedCategory]);

  const supportEmail = settings?.support_email || 'support@callmind.company';
  // No fallback number. This defaulted to '919999999999', so a customer who
  // tapped "WhatsApp support" before the setting was configured opened a chat
  // with a stranger. The button is hidden instead.
  const supportWhatsapp = settings?.support_whatsapp || null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !user) return;

    const userMsg = chatMessage.trim();
    setChatMessage('');

    try {
      await sendMessageMutation.mutateAsync({
        companyId,
        userId: user.uid,
        role: 'user',
        message: userMsg
      });

      setTimeout(async () => {
        await sendMessageMutation.mutateAsync({
          companyId,
          userId: user.uid,
          role: 'ai',
          message: `I have received your support request: "${userMsg}". A human representative has been notified and will contact you at ${user.email || 'your email'} shortly. For immediate escalation, connect with WhatsApp support.`
        });
      }, 1000);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Failed to send message.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300 pb-20">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
            <LifeBuoy className="text-brand-600" size={28} />
            Help Center
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-1">
            Search our knowledge base or reach out to our dedicated support team.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-100">
          <ShieldCheck size={16} className="text-green-600 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">SLA Verified</span>
        </div>
      </motion.div>

      {/* ── Hero Search Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search across all help articles — e.g. 'import leads', 'billing'..."
          className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 rounded-2xl text-sm font-semibold outline-none text-gray-800 shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left: Support Channels ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-5"
        >
          <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-xs space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3">
              Priority Support Channels
            </h3>

            {/* AI Chat */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all font-bold text-gray-800 text-xs uppercase btn-tactile group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white shadow-xs rounded-lg text-brand-600 group-hover:scale-110 transition-transform">
                  <MessageSquare size={16} />
                </div>
                <span>AI Support Chat</span>
              </div>
              <span className="text-[9px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">Live</span>
            </button>

            {/* Video Academy */}
            <button
              onClick={() => navigate('/dashboard/training')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all font-bold text-gray-800 text-xs uppercase btn-tactile group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white shadow-xs rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                  <Video size={16} />
                </div>
                <span>Video Academy</span>
              </div>
              <span className="text-[9px] text-gray-400 font-bold bg-white px-2 py-0.5 rounded border">Self-Serve</span>
            </button>

            {/* Support Ticket */}
            <button
              onClick={() => navigate('/dashboard/support')}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all font-bold text-gray-800 text-xs uppercase btn-tactile group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white shadow-xs rounded-lg text-red-600 group-hover:scale-110 transition-transform">
                  <Bug size={16} />
                </div>
                <span>Raise Support Ticket</span>
              </div>
              <span className="text-[9px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">Ticket</span>
            </button>
          </div>

          {/* Direct Contact.
              The WhatsApp button is rendered only when a number is configured.
              It used to fall back to '919999999999', so before anyone set one
              it opened a chat with a stranger. */}
          <div className={`grid gap-3 ${supportWhatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {supportWhatsapp && (
              <button
                onClick={() => window.open(`https://wa.me/${supportWhatsapp}?text=Hello%20CallMind%20Support`, '_blank')}
                className="flex flex-col items-center justify-center p-5 bg-green-50/50 border border-green-100 hover:border-green-300 rounded-2xl transition-all group btn-tactile"
              >
                <Smartphone size={20} className="text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-green-900">WhatsApp</span>
                <span className="text-[9px] text-green-700 font-bold uppercase mt-0.5">Priority</span>
              </button>
            )}
            <button
              onClick={() => (window.location.href = `mailto:${supportEmail}?subject=Support%20Request`)}
              className="flex flex-col items-center justify-center p-5 bg-blue-50/50 border border-blue-100 hover:border-blue-300 rounded-2xl transition-all group btn-tactile"
            >
              <Mail size={20} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black text-blue-900">Email</span>
              <span className="text-[9px] text-blue-700 font-bold uppercase mt-0.5">&lt;2h SLA</span>
            </button>
          </div>

          {/* Stats Widget */}
          <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white p-5 rounded-2xl shadow-lg shadow-brand-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-100">Knowledge Base</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-black">{faqs.length}</p>
                <p className="text-[9px] font-bold text-brand-200 uppercase tracking-wider">Articles</p>
              </div>
              <div>
                <p className="text-2xl font-black">6</p>
                <p className="text-[9px] font-bold text-brand-200 uppercase tracking-wider">Categories</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Right: FAQ Accordion ── */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-5"
        >
          <div className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-brand-600" />
              <h3 className="text-base font-bold text-gray-900">Knowledge Base FAQ</h3>
            </div>

            {/* Category Tabs */}
            {isFaqsLoading ? (
              <CategorySkeleton />
            ) : (
              <div className="flex flex-wrap gap-1.5 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                {FAQ_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      selectedCategory === cat
                        ? 'bg-white text-brand-650 shadow-xs border border-gray-100'
                        : 'text-gray-450 hover:text-gray-650'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Accordion List */}
            {isFaqsLoading ? (
              <FaqSkeleton />
            ) : isFaqsError ? (
              <div className="text-center py-10 space-y-4">
                <AlertCircle size={28} className="text-red-500 mx-auto" />
                <p className="text-xs text-gray-400 font-bold">Failed to load FAQs. Please retry.</p>
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <BookOpen size={32} className="text-gray-300 mx-auto" />
                <p className="text-gray-400 italic text-xs font-semibold">
                  No matching articles found.{' '}
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-brand-600 underline">Clear search</button>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3 pr-1">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = activeFaqId === faq.id;
                  return (
                    <motion.div
                      key={faq.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`border rounded-2xl p-4 transition-all cursor-pointer ${
                        isOpen
                          ? 'border-brand-200 bg-brand-50/30 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <button
                        onClick={() => setActiveFaqId(isOpen ? null : faq.id)}
                        className="w-full flex items-center justify-between text-left font-bold text-gray-800 text-xs group"
                      >
                        <span className={`group-hover:text-brand-600 transition-colors ${isOpen ? 'text-brand-700' : ''}`}>
                          {faq.question}
                        </span>
                        <span className={`ml-3 shrink-0 transition-colors ${isOpen ? 'text-brand-500' : 'text-gray-300'}`}>
                          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-brand-100 text-xs text-gray-600 leading-relaxed font-semibold">
                              {faq.answer}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[9px] font-black uppercase rounded border border-brand-100">
                                {faq.category}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── "Still need help?" CTA ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-brand-600 rounded-[28px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-brand-500/10"
      >
        <div className="flex items-center gap-4 text-white">
          <div className="p-3.5 bg-white/15 rounded-2xl border border-white/20 shrink-0">
            <Headphones size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight">Still need help?</h3>
            <p className="text-brand-100 font-semibold text-xs mt-0.5 max-w-md">
              Our expert support engineers are available Mon–Sat, 10 AM – 7 PM IST. Average response time under 90 minutes.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-6 py-3 bg-white text-brand-600 text-xs font-black uppercase tracking-wider rounded-xl transition-all btn-tactile flex items-center gap-2 justify-center hover:shadow-lg"
          >
            <MessageSquare size={14} />
            Contact Support
          </button>
          <button
            onClick={() => navigate('/dashboard/support')}
            className="px-6 py-3 bg-white/15 hover:bg-white/25 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-white/20 btn-tactile flex items-center gap-2 justify-center"
          >
            Raise Ticket <ArrowRight size={12} />
          </button>
        </div>
      </motion.div>

      {/* ── AI Chat Drawer Modal ── */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[520px]"
            >
              {/* Chat Header */}
              <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">CallMind AI</h3>
                    <p className="text-[9px] text-brand-300 uppercase tracking-widest font-black">Support Assistant</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                  <X size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-gray-50 custom-scrollbar">
                {isChatLoading ? (
                  <div className="py-8 flex justify-center">
                    <div className="animate-pulse space-y-3 w-full">
                      <div className="h-12 bg-gray-200 rounded-2xl rounded-bl-none w-4/5" />
                      <div className="h-10 bg-gray-200 rounded-2xl rounded-br-none w-3/5 ml-auto" />
                      <div className="h-16 bg-gray-200 rounded-2xl rounded-bl-none w-4/5" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-white border border-gray-150 text-gray-800 rounded-2xl rounded-bl-none shadow-xs text-xs font-semibold leading-relaxed">
                      👋 Hello! I am CallMind Support AI. How can I assist you today? You can ask about setup, leads, billing, or integrations.
                    </div>
                    {chatHistory.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-brand-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-150 text-gray-800 rounded-bl-none shadow-xs'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Input Bar */}
              <div className="p-3 bg-white border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="relative text-xs">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    placeholder="Type your support request..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 focus:border-brand-500 rounded-xl outline-none font-semibold text-gray-700 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim() || sendMessageMutation.isPending}
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-brand-600 disabled:bg-gray-300 text-white flex items-center justify-center rounded-lg transition-colors btn-tactile"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
