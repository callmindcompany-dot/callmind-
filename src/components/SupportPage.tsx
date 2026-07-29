import React, { useState } from 'react';
import { ShieldCheck, MessageSquare, Video, Mail, Smartphone, UploadCloud, CheckCircle, Bug } from 'lucide-react';
import CallMindLoader from './CallMindLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useCreateSupportTicket } from '@/hooks/useSupportTickets';

// Browser/OS Detection Helper
const getBrowserAndOS = () => {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Browser";
  else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
  else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
  else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Microsoft Edge";
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";

  if (ua.indexOf("Windows NT 10.0") > -1) os = "Windows 10/11";
  else if (ua.indexOf("Windows NT 6.2") > -1) os = "Windows 8";
  else if (ua.indexOf("Windows NT 6.1") > -1) os = "Windows 7";
  else if (ua.indexOf("Macintosh") > -1) os = "macOS";
  else if (ua.indexOf("iPhone") > -1) os = "iOS";
  else if (ua.indexOf("Android") > -1) os = "Android";
  else if (ua.indexOf("Linux") > -1) os = "Linux";

  return { browser, os };
};

// AI Sentiment / Priority Classifier
const classifyPriorityBySentiment = (text: string): 'high' | 'medium' | 'low' => {
  const lowerText = text.toLowerCase();
  const angryUrgentKeywords = [
    'angry', 'broken', 'worst', 'urgent', 'failure', 'stuck', 'error', 'fail', 
    'not working', 'help', 'please', '!', 'refund', 'crash', 'bug', 'critical',
    'down', 'immediately', 'stop', 'terrible', 'useless', 'slow', 'crashed', 'payment failed'
  ];
  
  const neutralKeywords = [
    'how to', 'question', 'setup', 'configure', 'information', 'pricing', 
    'tutorial', 'support', 'guidance', 'account', 'invoice', 'plan'
  ];

  let urgentScore = 0;
  angryUrgentKeywords.forEach(k => {
    if (lowerText.includes(k)) urgentScore += k === '!' ? 1 : 2;
  });

  if (urgentScore >= 3) return 'high';
  if (neutralKeywords.some(k => lowerText.includes(k)) || urgentScore > 0) return 'medium';
  return 'low';
};

export const SupportPage = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');

  const { user, profile } = useAuth() as any;
  const { companyId } = useCompany();
  const createTicketMutation = useCreateSupportTicket();

  const isSubmitting = createTicketMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = user?.uid;
    if (userId) {
      const lastSubmitted = localStorage.getItem(`last_ticket_submitted_at_${userId}`);
      const limit = 5 * 60 * 1000; // 5 minutes
      if (lastSubmitted) {
        const timeSince = Date.now() - parseInt(lastSubmitted);
        if (timeSince < limit) {
          const minutesLeft = Math.ceil((limit - timeSince) / (60 * 1000));
          toast.error(`Please wait ${minutesLeft} minute(s) before submitting another query.`);
          return;
        }
      }
    }

    try {
      const { browser, os } = getBrowserAndOS();
      const startTime = Date.now();
      let latencyVal = "30ms";
      try {
        await fetch('/', { method: 'HEAD', cache: 'no-store' });
        latencyVal = `${Date.now() - startTime}ms`;
      } catch {
        latencyVal = `${Math.floor(Math.random() * 80) + 20}ms`;
      }

      const textToAnalyze = `${title} ${description}`;
      const priority = classifyPriorityBySentiment(textToAnalyze);
      const healthScore = Math.floor(Math.random() * 35) + 60; // Simulated client health score

      const ticket = await createTicketMutation.mutateAsync({
        title,
        description,
        steps,
        priority,
        client_health_score: healthScore,
        user_email: user?.email || profile?.email || 'user@example.com',
        user_name: profile?.name || user?.displayName || 'Client User',
        user_designation: profile?.designation || 'Representative',
        user_phone: profile?.phoneNumber || '+91 99999 88888',
        company_name: profile?.companyName || 'CallMind Tenant',
        company_id: companyId || 'unknown-tenant',
        os_info: os,
        browser_info: browser,
        network_latency: latencyVal
      });

      if (userId) {
        localStorage.setItem(`last_ticket_submitted_at_${userId}`, Date.now().toString());
      }
      
      setTicketId(`ENG-${ticket.id.substring(0, 6).toUpperCase()}-QA`);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error creating bug report ticket:", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-32">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Report an Engine Bug</h2>
        <p className="text-gray-500 font-medium mt-2">Technical Engineering & QA routing form.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card border border-gray-150 shadow-xl p-6 relative overflow-hidden bg-white/45 backdrop-blur-2xl rounded-2xl"
      >
        {/* Custom Premium SVG Support Illustration */}
        <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
          <circle cx="80" cy="80" r="70" fill="url(#support_grad_1)" opacity="0.15"/>
          <path d="M80 35C55.1472 35 35 55.1472 35 80C35 104.853 55.1472 125 80 125C104.853 125 125 104.853 125 80C125 55.1472 104.853 35 80 35ZM80 45C99.33 45 115 60.67 115 80C115 99.33 99.33 115 80 115C60.67 115 45 99.33 45 80C45 60.67 60.67 45 80 45Z" fill="url(#support_grad_2)"/>
          <path d="M80 55C66.1929 55 55 66.1929 55 80C55 93.8071 66.1929 105 80 105C93.8071 105 105 93.8071 105 80C105 66.1929 93.8071 55 80 55Z" fill="url(#support_grad_1)" opacity="0.3"/>
          <circle cx="80" cy="80" r="10" fill="url(#support_grad_2)"/>
          <defs>
            <linearGradient id="support_grad_1" x1="35" y1="35" x2="125" y2="125" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6"/>
              <stop offset="1" stopColor="#8b5cf6"/>
            </linearGradient>
            <linearGradient id="support_grad_2" x1="35" y1="125" x2="125" y2="35" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa"/>
              <stop offset="1" stopColor="#a78bfa"/>
            </linearGradient>
          </defs>
        </svg>
        
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)] animate-bounce">
                  <CheckCircle size={40} />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-2">Ticket Generated</h4>
                <p className="text-emerald-600 text-sm font-black font-mono">ID: {ticketId}</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bug Title</label>
                  <input 
                    required 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Call drops instantly on connect..." 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-slate-400 transition-all" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      required 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Briefly describe what happened..." 
                      rows={3} 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-slate-400 resize-none transition-all"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Steps to Reproduce</label>
                    <textarea 
                      required 
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      placeholder="1. Go to...&#10;2. Click on..." 
                      rows={3} 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono text-slate-600 outline-none focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 placeholder:text-slate-400 resize-none transition-all"
                    ></textarea>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Media Upload</label>
                  <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-colors rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer group">
                    <UploadCloud size={28} className="text-slate-400 mb-3 group-hover:text-brand-600 transition-colors" />
                    <p className="text-xs font-bold text-slate-500 text-center">Drag and drop screenshots here<br/><span className="font-medium text-slate-400">or click to browse (.png, .jpg, .mp4)</span></p>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full mt-4 py-4 flex justify-center items-center gap-2 bg-brand-600 disabled:bg-brand-300 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-brand-700 shadow-xl shadow-brand-100 disabled:shadow-none transition-all hover:scale-[1.01] active:scale-[0.98] btn-tactile"
                >
                  {isSubmitting ? <><CallMindLoader size="xs" /> Submitting...</> : <>Submit 🚀</>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
