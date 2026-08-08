import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  MessageSquare, 
  Mic, 
  Zap, 
  BarChart3, 
  Clock,
  ArrowRight,
  ShieldAlert,
  Lock,
  Bot,
  TrendingUp,
  Layout,
  Users,
  Settings,
  AlertTriangle,
  Activity,
  Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { usePlan } from '../hooks/usePlan';
import { useCompany } from '@/CompanyContext';
import { UpgradeModal } from './UpgradeModal';
import CallMindLoader from './CallMindLoader';
import { supabase } from '@/supabaseClient';
import { incrementAIUsage, AIFeatureType } from '@/lib/aiUsage';
import { toast } from 'react-hot-toast';
import { trackTrialEvent } from '@/utils/trialTracking';

export const CallMind3DTextLoader = ({ text = "CALLMIND" }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center space-y-4 py-8">
    <div className="callmind-3d-text-loader">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="slice">
          <span>{text}</span>
        </div>
      ))}
      <div className="line" />
    </div>
    <span className="text-xs font-black uppercase tracking-widest text-brand-600 animate-pulse font-sans">
      AI Insights Synthesizing...
    </span>
  </div>
);

const AIFeatureCard = ({ title, description, icon: Icon, color, stats, onClick, phase = 1, currentPhase = 1, isGodMode }: any) => {
  const isLocked = phase > currentPhase && !isGodMode;

  return (
    <motion.div
      whileHover={isLocked ? {} : { y: -5 }}
      className={`glass p-8 rounded-2xl transition-all group flex flex-col h-full relative overflow-hidden ${isLocked ? 'opacity-75 grayscale-[0.5]' : 'hover:shadow-xl'}`}
    >
      {/* Large Background Icon */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity rotate-12 group-hover:rotate-0 transition-transform duration-500">
        <Icon size={160} className={color.replace('bg-', 'text-')} />
      </div>

      <div className={`w-14 h-14 rounded-2xl ${color} bg-opacity-10 flex items-center justify-center mb-6 ${!isLocked && 'group-hover:scale-110'} transition-transform relative z-10`}>
        <Icon className={color.replace('bg-', 'text-')} size={28} />
        {/* Decorative background SVG element */}
        <svg className="absolute -right-2 -bottom-2 w-8 h-8 opacity-20 text-current animate-pulse" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      </div>
      
      {isLocked && (
        <div className="absolute top-8 right-8 bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
          <Lock size={10} /> Phase {phase}
        </div>
      )}

      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">{description}</p>
      <div className="pt-6 border-t border-gray-50 flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {phase > 1 ? 'Status' : 'Usage Today'}
          </span>
          <span className="text-sm font-bold text-gray-900">
            {isLocked ? 'Locked' : (stats || '0')}
          </span>
        </div>
        <button 
          onClick={isLocked ? undefined : onClick}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isLocked ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-400 group-hover:bg-brand-600 group-hover:text-white'}`}
        >
          {isLocked ? <Lock size={18} /> : <ArrowRight size={18} />}
        </button>
      </div>
    </motion.div>
  );
};

export const AIInsightsHub = () => {
  const { isGodMode, profile, isFounder, user } = useAuth();
  const { companyId } = useCompany();
  const plan = usePlan();
  const aiPlanLimit = plan.limit('aiCredits');
  const currentPhase = 1;
  const [isConfirmingKillSwitch, setIsConfirmingKillSwitch] = useState(false);

  // The kill switch, reading the column it actually writes to.
  //
  // This was `featureFlags.AI_ENABLED`, where featureFlags came from
  // profile.featureFlags -- a column no migration creates -- and the setter was
  // an empty function declared two lines above it. So the switch always
  // rendered off, and flipping it changed nothing. companies.ai_enabled is now
  // real (20260817000000_company_ai_toggle.sql) and src/routes/ai.ts refuses the request when it is
  // false, which is the half that matters: the browser is not what spends the
  // tokens.
  const [aiEnabled, setAiEnabled] = useState(true);
  const [savingKillSwitch, setSavingKillSwitch] = useState(false);

  const canToggleAi =
    isGodMode || ['admin', 'sub_admin', 'founder'].includes(String(profile?.role || '').toLowerCase());

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('ai_enabled')
        .eq('id', companyId)
        .maybeSingle();
      if (error) {
        console.error('Failed to read the company AI setting:', error);
        return;
      }
      if (!cancelled && data) setAiEnabled(data.ai_enabled !== false);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const setAiEnabledOnServer = async (next: boolean) => {
    if (!companyId) return;
    setSavingKillSwitch(true);
    const previous = aiEnabled;
    setAiEnabled(next);
    const { error } = await supabase
      .from('companies')
      .update({ ai_enabled: next })
      .eq('id', companyId);
    setSavingKillSwitch(false);
    if (error) {
      // Put the switch back. Leaving it where the user dropped it would say the
      // change had taken effect.
      setAiEnabled(previous);
      toast.error(error.message || 'Could not change the AI setting.');
      return;
    }
    toast.success(next ? 'AI turned on for your company.' : 'AI turned off for your company.');
  };
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [todayUsage, setTodayUsage] = useState<any>(null);
  const [upgradeReason, setUpgradeReason] = useState<{title: string, description: string}>({
    title: 'AI Limit Reached',
    description: 'You have reached your trial limit for AI calls. Upgrade to Pro for unlimited AI power.'
  });

  // Fetch today's AI usage
  useEffect(() => {
    if (!companyId) return;
    const today = new Date().toISOString().split('T')[0];

    const fetchUsage = async () => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('company_id', companyId)
        .eq('date', today)
        .maybeSingle();

      if (error) {
        console.error('Error fetching AI usage:', error);
        return;
      }

      if (data) {
        setTodayUsage({
          total: data.total || 0,
          waDrafts: data.wa_drafts || 0,
          voiceToCrm: data.voice_to_crm || 0,
          reportQueries: data.report_queries || 0,
          columnMappings: data.column_mappings || 0
        });
      } else {
        setTodayUsage({ total: 0, waDrafts: 0, voiceToCrm: 0, reportQueries: 0, columnMappings: 0 });
      }
    };

    fetchUsage();

    const channel = supabase
      .channel('ai_usage_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_usage',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          fetchUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  useEffect(() => {
    if (companyId && user?.id) {
      trackTrialEvent(companyId, user.id, 'feature_viewed', { feature: 'AI Insights Hub' });
    }
  }, [companyId, user]);

  // Advisory only. The binding limit is applied server-side by
  // consume_ai_credit() before the request reaches Gemini; this just keeps the
  // counter on screen honest. It used to check for 'enterprise' and 'team',
  // neither of which is a real plan id.
  const getAILimit = () => {
    if (isGodMode) return Infinity;
    return aiPlanLimit;
  };

  const checkAILimit = () => {
    // `isFounder` used to bypass this, but it is true for the founder of every
    // customer company -- so the limit never applied to the one person most
    // likely to hit it. Only CallMind staff (isGodMode) are exempt.
    if (isGodMode) return true;

    const limit = getAILimit();
    if (limit === Infinity) return true;

    const currentCount = todayUsage?.total || 0;

    if (currentCount >= limit) {
      setUpgradeReason({
        title: 'AI Limit Reached',
        description: `You have used all ${limit} AI credits included in your ${plan.plan.name} plan this month. Upgrade for a higher allowance.`
      });
      setShowUpgradeModal(true);
      return false;
    }

    return true;
  };

  const handleAICall = async (featureType: AIFeatureType, prompt: string = "Analyze this lead for follow-up priority") => {
    if (!checkAILimit()) return;

    setIsGenerating(true);
    setAiResponse(null);

    try {
      const idToken = (await supabase.auth.getSession()).data.session?.access_token ?? null;
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, idToken, task: 'sentiment', featureType })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setUpgradeReason({
            title: result.error || 'AI Limit Reached',
            description: `You've reached your plan's AI limit. Upgrade to Pro for unlimited access.`
          });
          setShowUpgradeModal(true);
        } else {
          throw new Error(result.error || 'AI Generation failed');
        }
        return;
      }

      // Track usage in Firestore
      await incrementAIUsage(companyId, featureType);
      
      setAiResponse(result.response);
      toast.success('AI Draft Generated');
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      toast.error('AI failed to generate response');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKillSwitchToggle = () => {
    if (!canToggleAi) {
      toast.error('Only an administrator can turn AI on or off.');
      return;
    }
    if (aiEnabled) {
      setIsConfirmingKillSwitch(true);
    } else {
      void setAiEnabledOnServer(true);
    }
  };

  const confirmKillSwitch = () => {
    setIsConfirmingKillSwitch(false);
    void setAiEnabledOnServer(false);
  };

  const renderFeatureDetail = () => {
    switch (activeFeature) {
      case 'voice':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveFeature(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">Voice to CRM Intelligence</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-8 rounded-[40px] space-y-6">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                  <Mic size={40} className="text-blue-600" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Record Call Summary</h3>
                  <p className="text-sm text-gray-500">Speak naturally about the call outcome.</p>
                </div>
                <button 
                  onClick={() => handleAICall('voiceToCrm', "Voice summary extraction for lead")}
                  disabled={isGenerating}
                  className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-100 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <CallMindLoader size="xs" />
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                      Start Recording
                    </>
                  )}
                </button>
              </div>
              <div className="glass p-8 rounded-[40px] space-y-4">
                <h3 className="font-bold">AI Extraction Preview</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Lead Name', value: '---', icon: Users },
                    { label: 'Sentiment', value: '---', icon: Sparkles },
                    { label: 'Follow-up', value: '---', icon: Clock },
                  ].map((item, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <item.icon size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'wa':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveFeature(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">WhatsApp AI Draft Generator</h2>
            </div>
            <div className="glass p-8 rounded-[40px] max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Context / Prompt</label>
                <textarea 
                  placeholder="e.g. Follow up with Rahul about the 3BHK flat in Mumbai. Keep it professional but friendly in Hinglish."
                  className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-200 min-h-[120px] transition-all"
                />
              </div>
              <button 
                onClick={() => handleAICall('waDrafts', "Generate WhatsApp draft for lead")}
                disabled={isGenerating}
                className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? <CallMindLoader size="xs" /> : <><Zap size={20} /> Generate AI Draft</>}
              </button>
              <div className="p-6 bg-brand-50 rounded-3xl border border-brand-100 relative min-h-[100px] flex items-center justify-center">
                {aiResponse ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-brand-900 italic">
                    "{aiResponse}"
                  </motion.p>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    {isGenerating ? "AI is thinking..." : "Your AI draft will appear here..."}
                  </p>
                )}
                {aiResponse && <button className="absolute top-4 right-4 text-brand-600 font-bold text-xs">Copy</button>}
              </div>
            </div>
          </motion.div>
        );
      case 'query':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveFeature(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">AI Reports Query</h2>
            </div>
            <div className="glass p-8 rounded-[40px] max-w-3xl mx-auto flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-2xl max-w-[80%]">
                  <p className="text-sm text-gray-600">Ask me anything about your sales data. For example: "Who is my top performing agent this month?"</p>
                </div>
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Type your query here..."
                  className="flex-1 p-4 bg-gray-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-brand-200 transition-all"
                />
                <button 
                  onClick={() => handleAICall('reportQueries', "Querying sales data")}
                  disabled={isGenerating}
                  className="p-4 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-100 flex items-center justify-center disabled:opacity-50"
                >
                  {isGenerating ? <CallMindLoader size="xs" /> : <ArrowRight size={20} />}
                </button>
              </div>
            </div>
          </motion.div>
        );
      case 'mapper':
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveFeature(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <ArrowRight size={20} className="rotate-180" />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">AI Column Mapper</h2>
            </div>
            <div className="glass p-12 rounded-[40px] border-2 border-dashed border-brand-200 text-center space-y-6">
              <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto">
                <Zap size={40} className="text-brand-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Upload CSV to Auto-Map</h3>
                <p className="text-gray-500">Our AI will automatically detect headers and map them to CRM fields.</p>
              </div>
              <button className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-100">
                Select File
              </button>
            </div>
          </motion.div>
        );
      case 'kartik':
      case 'bot':
      case 'forecast':
      case 'builder':
        const feature = [
          { id: 'kartik', title: 'AI KARTIK Auto-Caller', icon: BrainCircuit, color: 'bg-purple-600' },
          { id: 'bot', title: 'WhatsApp 24/7 Bot', icon: Bot, color: 'bg-green-600' },
          { id: 'forecast', title: 'Revenue Forecasting AI', icon: TrendingUp, color: 'bg-blue-600' },
          { id: 'builder', title: 'Custom Reports Builder', icon: Layout, color: 'bg-indigo-600' }
        ].find(f => f.id === activeFeature);

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-20 rounded-[40px] flex flex-col items-center justify-center text-center">
            <div className={`w-24 h-24 ${feature?.color} bg-opacity-10 rounded-3xl flex items-center justify-center mb-8 relative`}>
              {feature && <feature.icon size={48} className={feature.color.replace('bg-', 'text-')} />}
              <div className="absolute -top-2 -right-2 bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Phase 2</div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{feature?.title}</h3>
            <p className="text-gray-500 mt-4 max-w-md text-lg">
              This advanced AI module is currently in development for **Phase 2**. 
              We are training models to handle complex {feature?.title.toLowerCase()} logic.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <button className="px-8 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all">
                Join Waitlist
              </button>
              <button onClick={() => setActiveFeature(null)} className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all">
                Go Back
              </button>
            </div>
          </motion.div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AIFeatureCard 
              title="Voice to CRM"
              description="Record your call summary and let AI automatically fill the lead form, extract sentiment, and set follow-ups."
              icon={Mic}
              color="bg-blue-600"
              stats={`${todayUsage?.voiceToCrm || 0} Sums Used`}
              phase={2}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('voice')}
            />
            <AIFeatureCard 
              title="WhatsApp AI Draft"
              description="Generate personalized WhatsApp messages in Hinglish based on call context. One-tap send via wa.me."
              icon={MessageSquare}
              color="bg-green-600"
              stats={`${todayUsage?.waDrafts || 0} Drafts Used`}
              phase={1}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('wa')}
            />
            <AIFeatureCard 
              title="Reports AI Query"
              description="Ask questions about your sales data in natural language. 'Who is my top performing agent this week?'"
              icon={BarChart3}
              color="bg-purple-600"
              stats={`${todayUsage?.reportQueries || 0} Queries Used`}
              phase={2}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('query')}
            />
            <AIFeatureCard 
              title="Import Column Mapper"
              description="AI automatically detects and maps your CSV/Excel headers to CRM fields. Handles 100+ variations."
              icon={Zap}
              color="bg-orange-600"
              stats={`${todayUsage?.columnMappings || 0} Sets Used`}
              phase={3}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('mapper')}
            />
            <AIFeatureCard 
              title="AI KARTIK Auto-Caller"
              description="Revolutionary AI agent that calls leads, qualifies them, and transfers to human agents if interested."
              icon={BrainCircuit}
              color="bg-purple-600"
              stats="Coming Soon"
              phase={2}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('kartik')}
            />
            <AIFeatureCard 
              title="WhatsApp 24/7 Bot"
              description="Qualify leads and answer queries automatically without human intervention."
              icon={Bot}
              color="bg-green-600"
              stats="Coming Soon"
              phase={2}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('bot')}
            />
            <AIFeatureCard 
              title="Revenue Forecasting AI"
              description="Predict next month's revenue based on your current pipeline health and historical conversion rates."
              icon={TrendingUp}
              color="bg-blue-600"
              stats="Coming Soon"
              phase={2}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('forecast')}
            />
            <AIFeatureCard 
              title="Custom Reports Builder"
              description="Drag-and-drop interface to create any metric or report you need for your business."
              icon={Layout}
              color="bg-indigo-600"
              stats="Coming Soon"
              phase={2}
              currentPhase={currentPhase}
              isGodMode={isGodMode}
              onClick={() => setActiveFeature('builder')}
            />
            <div className="lg:col-span-2 bg-gray-900 rounded-2xl p-10 text-white relative overflow-hidden flex items-center justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600 opacity-20 blur-[100px]" />
              <div className="relative z-10 space-y-4 max-w-md">
                <div className="flex items-center gap-2 text-brand-400">
                  <ShieldAlert size={20} />
                  <span className="font-bold uppercase tracking-widest text-xs">Privacy First AI</span>
                </div>
                <h3 className="text-2xl font-bold">AI Without Call Recording</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Our AI processes summaries and notes only. We never record or store your private voice conversations, ensuring 100% compliance.</p>
              </div>
              <div className="relative z-10 hidden md:block">
                <BrainCircuit size={120} className="text-white/10" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Insights Hub</h1>
          <p className="text-gray-500 mt-1">Drafting, summaries and lead scoring, powered by Google Gemini Flash.</p>
        </div>
        {!activeFeature && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl">
              <div className={`w-2 h-2 rounded-full ${aiEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-bold text-gray-600">AI Status: {aiEnabled ? 'Active' : 'Offline'}</span>
            </div>
            <button 
              onClick={handleKillSwitchToggle}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${aiEnabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
            >
              {aiEnabled ? 'Kill Switch' : 'Enable AI'}
            </button>
          </div>
        )}
      </div>

      {/* AI Rule Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full py-4 px-6 glass border-2 border-brand-600 rounded-2xl flex items-center justify-center gap-3 bg-brand-50/50 shadow-lg shadow-brand-100/20"
      >
        <ShieldAlert className="text-brand-600" size={20} />
        <p className="text-sm font-bold text-gray-900 tracking-tight">
          <span className="text-brand-600 uppercase font-black">AI RULE:</span> AI fires ONLY when user taps button — <span className="text-brand-600 font-black">NEVER automatic.</span>
        </p>
      </motion.div>

      {/* AI Governance & Controls */}
      {!activeFeature && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Master Kill Switch Card */}
          <div className="lg:col-span-2 glass p-8 rounded-[40px] border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 opacity-[0.03] blur-[100px]" />
            
            <div className="space-y-4 relative z-10 flex-1">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${aiEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} transition-colors`}>
                  <Power size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Master AI Kill Switch</h2>
                  <p className="text-sm text-gray-500">Instantly disable all AI processing across the platform.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl border border-gray-50">
                  <div className={`w-1.5 h-1.5 rounded-full ${aiEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Engine:</span>
                  <span className={`text-[10px] font-bold ${aiEnabled ? 'text-green-600' : 'text-red-600'} uppercase`}>{aiEnabled ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <button 
                onClick={handleKillSwitchToggle}
                className={`
                  relative w-20 h-10 rounded-full transition-all duration-300 outline-none
                  ${aiEnabled ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-gray-200'}
                `}
              >
                <motion.div 
                  animate={{ x: aiEnabled ? 44 : 4 }}
                  className="absolute top-1 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${aiEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                </motion.div>
              </button>
            </div>
          </div>

          {/* The "Engine Controls" panel stood here with two toggles: "Groq
              LLaMA 70B" and "Whisper API". Neither provider is integrated --
              there is no Groq SDK, no Whisper, no LLaMA anywhere in the
              codebase, and AGENTS.md says plainly that the provider is Gemini
              Flash and not to add a second. Both switches called the same empty
              function as the kill switch, so they did nothing either.

              Replaced with what is actually running. */}
          <div className="glass p-8 rounded-[40px] border border-gray-100 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Model</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
                  <Zap size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700">Google Gemini Flash</p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Every AI feature in CallMind runs on this one model.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingKillSwitch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmingKillSwitch(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass p-10 rounded-[40px] shadow-2xl border border-red-100 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Confirm AI Shutdown?</h3>
                <p className="text-gray-500 text-sm">This will immediately disable all AI-powered features including Voice-to-CRM, WA Drafts, and Auto-Mapping for all users.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmKillSwitch}
                  className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                >
                  Yes, Disable All AI
                </button>
                <button 
                  onClick={() => setIsConfirmingKillSwitch(false)}
                  className="w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Intelligence Summary Row */}
      {!activeFeature && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* AI Usage Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">AI Usage</p>
              <Zap size={18} className="text-brand-600" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h4 className="text-3xl font-bold text-gray-900">{todayUsage?.total || 0}</h4>
                <span className="text-sm font-bold text-gray-400">/ {getAILimit() === Infinity ? '∞' : getAILimit()}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">AI Calls Today</p>
            </div>
            <div className="space-y-2">
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((todayUsage?.total || 0) / (getAILimit() === Infinity ? (todayUsage?.total || 1) : getAILimit())) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-brand-600 shadow-[0_0_10px_rgba(0,82,204,0.3)]" 
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                <span>Daily Limit</span>
                <span className="text-brand-600">{Math.round(((todayUsage?.total || 0) / (getAILimit() === Infinity ? (todayUsage?.total || 1) : getAILimit())) * 100)}% Used</span>
              </div>
            </div>
          </motion.div>

          {/* WA Drafts Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">WA Drafts</p>
              <MessageSquare size={18} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-3xl font-bold text-gray-900">{todayUsage?.waDrafts || 0}</h4>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">AI-Generated Messages</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-lg">
              <TrendingUp size={12} />
              98% Acceptance
            </div>
          </motion.div>

          {/* Time Saved Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-6 rounded-[32px] border border-brand-100 shadow-lg shadow-brand-100/20 space-y-4 relative overflow-hidden group bg-gradient-to-br from-white to-brand-50/30"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5 text-brand-600">
              <Clock size={120} />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">Time Saved</p>
              <div className="p-2 bg-brand-600 rounded-xl shadow-lg shadow-brand-200">
                <Clock size={18} className="text-white" />
              </div>
            </div>
            <div className="relative z-10">
              <h4 className="text-3xl font-bold text-gray-900">
                {(() => {
                  const minutes = (todayUsage?.waDrafts || 0) * 2 + (todayUsage?.voiceToCrm || 0) * 3 + (todayUsage?.reportQueries || 0) * 5;
                  if (minutes < 60) return `${minutes} Mins`;
                  return `${(minutes / 60).toFixed(1)} Hrs`;
                })()}
              </h4>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">Hours Saved Today</p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-[10px] font-bold text-brand-600">
              <Sparkles size={12} />
              {todayUsage?.total > 10 ? 'Equivalent to 1 Agent' : 'Efficiency Booster'}
            </div>
          </motion.div>

          {/* Plan Limit Status Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4 relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Plan Status</p>
              <ShieldAlert size={18} className="text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-bold text-gray-900 uppercase">{profile?.plan || 'Trial'} Plan</h4>
                <span className="px-2 py-0.5 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-md">Active</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">Daily Quota: {getAILimit() === Infinity ? 'Unlimited' : `${getAILimit()} AI Calls`}</p>
            </div>
            <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase">
              <span>Next Reset</span>
              <span className="text-brand-600">
                {(() => {
                  const now = new Date();
                  const reset = new Date();
                  reset.setHours(24, 0, 0, 0);
                  const diff = reset.getTime() - now.getTime();
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  return `${hours}h ${mins}m`;
                })()}
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Active AI Features Monitoring */}
      {!activeFeature && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* WhatsApp AI Draft Monitor */}
          <div className="glass p-8 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-xl">
                  <MessageSquare size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">WhatsApp AI Draft</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Groq LLaMA 70B</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-green-600 uppercase">Active</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500">Language Style</span>
                  <span className="text-xs font-bold text-brand-600">Hinglish</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Tone</span>
                  <span className="text-xs font-bold text-brand-600">Professional</span>
                </div>
              </div>
              <button className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <Settings size={14} /> Quick Settings
              </button>
            </div>
          </div>

          {/* Import Column Mapping Monitor */}
          <div className="glass p-8 rounded-[40px] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Layout size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Import Mapping</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Groq LLaMA 8B</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-blue-600">94%</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase">Success Rate</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Imports</p>
              {[
                { name: 'RealEstate_Leads.csv', status: 'Success' },
                { name: 'SaaS_Prospects.xlsx', status: 'Success' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-medium text-gray-700">{item.name}</span>
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reports AI Query Monitor */}
          <div className="glass p-8 rounded-[40px] space-y-6 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
              PRO
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-xl">
                <BarChart3 size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Reports AI Query</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Natural Language</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-purple-600" />
                </div>
                <div className="bg-white p-2 rounded-xl rounded-tl-none shadow-sm border border-purple-50">
                  <p className="text-[10px] text-gray-600">"Who is my top performing agent this month?"</p>
                </div>
              </div>
              <div className="flex items-start gap-2 justify-end">
                <div className="bg-purple-600 p-2 rounded-xl rounded-tr-none shadow-md">
                  <p className="text-[10px] text-white font-medium">"Rahul S. has the highest conversion rate (19.3%)"</p>
                </div>
              </div>
            </div>
            
            <button className="w-full py-3 bg-brand-600 text-white font-bold text-xs rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-100">
              Open AI Chat
            </button>
          </div>
        </div>
      )}

      {/* Features Grid or Detail View */}
      {renderFeatureDetail()}

      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={upgradeReason.title}
        description={upgradeReason.description}
        limitType="ai"
      />
    </div>
  );
};
