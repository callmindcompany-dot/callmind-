import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  MessageSquare, 
  Settings, 
  Save,
  Plus,
  Trash2,
  ChevronRight,
  Info,
  Zap,
  Volume2,
  FileText,
  AlertCircle,
  Play,
  CheckCircle2,
  Upload,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { useAIConfig, useUpdateAIConfig } from '@/hooks/useAIConfig';
import { useAIFaqs, useCreateAIFaq, useUpdateAIFaq, useDeleteAIFaq } from '@/hooks/useAIFaqs';
import { AIFaq } from '@/types/aiTraining';
import CallMindLoader from './CallMindLoader';
import { toast } from 'react-hot-toast';

const Toggle = ({ enabled, onChange, label }: { enabled: boolean, onChange: (val: boolean) => void, label?: string }) => (
  <div className="flex items-center justify-between gap-4">
    {label && <span className="text-xs font-semibold text-gray-700">{label}</span>}
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none btn-tactile
        ${enabled ? 'bg-brand-600' : 'bg-gray-200'}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
          ${enabled ? 'translate-x-4.5' : 'translate-x-0.5'}
        `}
      />
    </button>
  </div>
);

export const AITrainingPage = () => {
  const { companyId } = useCompany();

  // Queries & Mutations
  const { data: config, isLoading: isConfigLoading, isError: isConfigError } = useAIConfig(companyId);
  const { data: faqs = [], isLoading: isFaqsLoading, isError: isFaqsError } = useAIFaqs(companyId);

  const updateConfigMutation = useUpdateAIConfig();
  const createFaqMutation = useCreateAIFaq();
  const updateFaqMutation = useUpdateAIFaq();
  const deleteFaqMutation = useDeleteAIFaq();

  // Core settings form state (initialized from config)
  const [autoCall, setAutoCall] = useState(true);
  const [recordCalls, setRecordCalls] = useState(true);
  const [sentimentAnalysis, setSentimentAnalysis] = useState(true);
  const [voiceType, setVoiceType] = useState('Professional Male (Indian)');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Sync config settings
  useEffect(() => {
    if (config) {
      setAutoCall(config.auto_call);
      setRecordCalls(config.record_calls);
      setSentimentAnalysis(config.sentiment_analysis);
      setVoiceType(config.voice_type);
      setSystemPrompt(config.system_prompt || '');
    }
  }, [config]);

  // Local copy of FAQs for in-line edits
  const [localFaqs, setLocalFaqs] = useState<AIFaq[]>([]);
  useEffect(() => {
    if (faqs) {
      setLocalFaqs(faqs);
    }
  }, [faqs]);

  // Test AI terminal sandbox state
  const [testPrompt, setTestPrompt] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Script file sandbox state
  const [trainingFileText, setTrainingFileText] = useState('');
  const [trainingFileName, setTrainingFileName] = useState('');

  // Sentiment analyst state
  const [sentimentInput, setSentimentInput] = useState('');
  const [sentimentOutput, setSentimentOutput] = useState<{ sentiment: 'Positive' | 'Neutral' | 'Negative', score: number } | null>(null);

  // Template Prompt Library
  const promptTemplates = [
    {
      industry: 'Real Estate Welcomer',
      prompt: 'You are CallMind\'s property sales specialist. Introduce yourself energetically, ask the prospect what configurations (1BHK/2BHK/Villa) they are searching for, and note down budget guidelines. Keep details professional and concise.'
    },
    {
      industry: 'SaaS Inbound Handler',
      prompt: 'You are a high-ticket SaaS sales consultant. Introduce yourself, ask about the caller\'s team size and calling volume, and explain how automatic CRM sync and lead retry loops save hours of manual logging. Pitch a 15-minute demo call.'
    },
    {
      industry: 'Insurance Lead Reactivator',
      prompt: 'You are a customer health policy counselor. Approach the prospect in a warm, welcoming voice. Ask if they would like to review their renewal rates to include the new coverage limits. Maintain empathy and absolute clarity.'
    }
  ];

  // Save core configuration updates
  const handleSaveConfig = () => {
    if (!companyId) return;
    updateConfigMutation.mutate({
      companyId,
      autoCall,
      recordCalls,
      sentimentAnalysis,
      voiceType,
      systemPrompt
    });
  };

  // Live browser TTS speech synthesis demo
  const handlePlayVoiceSample = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error("Browser speech synthesis not supported.");
      return;
    }
    window.speechSynthesis.cancel();
    
    const utteranceText = voiceType.includes('Female')
      ? 'Namaste! I am your warm customer assistant. I will interact with your inbound leads with standard phone guidelines.'
      : voiceType.includes('Assistant')
      ? 'Hello, I am the neutral AI model. I will automatically record, log, and transcribe active caller streams.'
      : voiceType.includes('Energetic')
      ? 'Hey! I am your custom outbound sales representative! Let\'s hook some leads and seal those high-ticket deals!'
      : 'Hello there! I am your professional sales agent. I am trained to handle your company objection scripts.';

    const utterance = new SpeechSynthesisUtterance(utteranceText);
    
    // Choose appropriate voice
    const voices = window.speechSynthesis.getVoices();
    if (voiceType.includes('Female')) {
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('en-in'));
      if (femaleVoice) utterance.voice = femaleVoice;
    } else {
      const maleVoice = voices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('en-us'));
      if (maleVoice) utterance.voice = maleVoice;
    }
    
    window.speechSynthesis.speak(utterance);
    toast.success(`Playing synthesized sample for: ${voiceType}`);
  };

  // Add a blank FAQ row in Supabase
  const handleAddFaqRow = () => {
    if (!companyId) return;
    createFaqMutation.mutate({
      companyId,
      question: '',
      answer: ''
    });
  };

  // Save an individual FAQ change
  const handleSaveIndividualFaq = (faq: AIFaq) => {
    updateFaqMutation.mutate({
      faqId: faq.id,
      question: faq.question,
      answer: faq.answer
    }, {
      onSuccess: () => {
        toast.success("FAQ updated successfully!");
      }
    });
  };

  // In-line FAQ state update
  const handleLocalFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...localFaqs];
    updated[index] = { ...updated[index], [field]: value };
    setLocalFaqs(updated);
  };

  // Simulate prompt completions
  const handleTestAI = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simple word matching response logic
      let matchedAns = '';
      const promptLower = testPrompt.toLowerCase();
      
      for (const faq of faqs) {
        if (faq.question && promptLower.includes(faq.question.toLowerCase().split(' ')[0])) {
          matchedAns = faq.answer;
          break;
        }
      }
      
      if (matchedAns) {
        setTestResponse(`[AI Agent]: According to company FAQs: "${matchedAns}"`);
      } else {
        setTestResponse(`[AI Agent]: Hello! Following prompt directives: "${systemPrompt.substring(0, 40)}...", I'm reviewing details to pitch call options.`);
      }
    } catch (err) {
      toast.error("Testing error.");
    } finally {
      setIsTesting(false);
    }
  };

  // File Upload Ingestion
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setTrainingFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setTrainingFileText(text);
      toast.success(`Ingested ${file.name} successfully! (${text.length} characters parsed)`);
    };
    reader.readAsText(file);
  };

  // Text sentiment analyst engine
  const handleAnalyzeSentiment = () => {
    if (!sentimentInput.trim()) return;
    
    const textLower = sentimentInput.toLowerCase();
    let score = 50;
    let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';

    const positiveWords = ['amazing', 'good', 'yes', 'call', 'interested', 'buy', 'great', 'love', 'nice'];
    const negativeWords = ['no', 'bad', 'expensive', 'stop', 'remove', 'dont', 'hate', 'spam', 'wrong'];

    positiveWords.forEach(w => { if (textLower.includes(w)) score += 15; });
    negativeWords.forEach(w => { if (textLower.includes(w)) score -= 15; });

    if (score > 65) {
      sentiment = 'Positive';
    } else if (score < 35) {
      sentiment = 'Negative';
    }

    setSentimentOutput({ sentiment, score: Math.max(0, Math.min(100, score)) });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">AI Training & Knowledge</h1>
          <p className="text-gray-500 text-sm mt-1">Configure voice parameters, prompting libraries, and context FAQs.</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={updateConfigMutation.isPending}
          className="flex items-center gap-1.5 bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs hover:bg-brand-700 transition-all btn-tactile btn-glow"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>

      {(isConfigLoading || isFaqsLoading) ? (
        <div className="py-24 flex justify-center">
          <CallMindLoader size="md" text="Syncing custom configurations..." />
        </div>
      ) : (isConfigError || isFaqsError) ? (
        <div className="text-center py-16 space-y-4 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
          <AlertCircle size={32} className="text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Connection Error</h3>
          <p className="text-xs text-gray-500">We couldn't retrieve your AI settings from database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Core settings column */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-6">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
                <Settings size={18} className="text-brand-600" />
                Core AI Behavior
              </div>
              
              <div className="space-y-4">
                <Toggle enabled={autoCall} onChange={setAutoCall} label="Auto-Call New Inbound Leads" />
                <Toggle enabled={recordCalls} onChange={setRecordCalls} label="Record & Transcribe Sessions" />
                <Toggle enabled={sentimentAnalysis} onChange={setSentimentAnalysis} label="Analyze Sentiment Log Metrics" />
              </div>

              <div className="pt-4 border-t border-gray-50 space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">AI Voice Model</label>
                <div className="flex gap-2">
                  <select 
                    value={voiceType}
                    onChange={(e) => setVoiceType(e.target.value)}
                    className="flex-1 p-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option>Professional Male (Indian)</option>
                    <option>Warm Female (Indian)</option>
                    <option>Neutral Assistant</option>
                    <option>Energetic Sales Rep</option>
                  </select>
                  <button 
                    onClick={handlePlayVoiceSample}
                    className="p-2.5 bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white border border-brand-100 rounded-xl transition-all btn-tactile"
                    title="Pre-listen voice synthesis sample"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
              </div>
            </section>

            {/* Document upload card */}
            <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
                <Upload size={18} className="text-brand-600" />
                Upload Training scripts
              </div>
              <p className="text-[11px] text-gray-400">Upload PDF or TXT script brochures to train agents tone.</p>
              
              <div className="relative border-2 border-dashed border-gray-200 hover:border-brand-300 rounded-2xl p-6 text-center cursor-pointer transition-all">
                <input 
                  type="file" 
                  accept=".txt,.pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                <span className="text-[11px] font-bold text-gray-500 block">
                  {trainingFileName || 'Choose script brochure (.txt/.pdf)'}
                </span>
              </div>
              {trainingFileText && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-medium">
                  Document loaded: {trainingFileText.substring(0, 100)}...
                </div>
              )}
            </section>
          </div>

          {/* Prompt configs & FAQ database column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* System prompting */}
            <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <Sparkles size={18} className="text-brand-600" />
                  System Instructions Prompt
                </div>
                
                {/* Template picker */}
                <div className="relative group">
                  <button className="flex items-center gap-1 text-[10px] font-black uppercase text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-2 py-1 rounded-lg transition-all btn-tactile">
                    <BookOpen size={12} /> Templates
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-150 rounded-xl shadow-lg p-2 hidden group-hover:block z-40 w-52 space-y-1.5 text-xs text-left">
                    {promptTemplates.map(tmpl => (
                      <button 
                        key={tmpl.industry}
                        onClick={() => {
                          setSystemPrompt(tmpl.prompt);
                          toast.success(`Loaded ${tmpl.industry} template!`);
                        }}
                        className="w-full text-left p-1.5 hover:bg-gray-50 rounded font-semibold text-gray-700"
                      >
                        {tmpl.industry}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <textarea 
                placeholder="Enter system instruction directives to custom tune agent responses..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={4}
                className="w-full p-3 bg-gray-50 border border-gray-150 focus:border-brand-500 rounded-2xl text-xs font-semibold text-gray-700 outline-none resize-none leading-relaxed"
              />
            </section>

            {/* Knowledge base FAQs */}
            <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                  <MessageSquare size={18} className="text-brand-600" />
                  Business FAQs Knowledge Base
                </div>
                <button 
                  onClick={handleAddFaqRow}
                  className="flex items-center gap-1 text-xs font-black uppercase text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-brand-100 transition-all btn-tactile"
                >
                  <Plus size={14} /> Add FAQ
                </button>
              </div>

              <div className="space-y-3.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {localFaqs.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-6">No FAQ records. Click Add FAQ to register one.</p>
                ) : (
                  localFaqs.map((faq, index) => (
                    <div 
                      key={faq.id}
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-150/60 group relative flex flex-col gap-2.5"
                    >
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Question (e.g. What is your return policy?)"
                          value={faq.question}
                          onChange={(e) => handleLocalFaqChange(index, 'question', e.target.value)}
                          className="flex-1 bg-transparent font-bold text-gray-900 outline-none text-xs"
                        />
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <button 
                            onClick={() => handleSaveIndividualFaq(faq)}
                            className="p-1 text-gray-400 hover:text-brand-600 rounded"
                            title="Save changes to this FAQ"
                          >
                            <Save size={13} />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm("Permanently delete this FAQ record?")) {
                                deleteFaqMutation.mutate(faq.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                            title="Remove FAQ"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <textarea 
                        placeholder="Answer details..."
                        value={faq.answer}
                        onChange={(e) => handleLocalFaqChange(index, 'answer', e.target.value)}
                        rows={2}
                        className="w-full bg-transparent text-xs text-gray-650 outline-none resize-none font-semibold leading-relaxed border-t border-gray-200/50 pt-2"
                      />
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Test prompt sandbox & sentiment testers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Test Sandbox */}
              <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
                  <BrainCircuit size={18} className="text-brand-600" />
                  Test Prompt Sandbox
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Ask AI e.g. What is CallMind?"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    className="flex-1 p-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-500 text-gray-700"
                  />
                  <button 
                    onClick={handleTestAI}
                    disabled={isTesting}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase rounded-xl transition-all hover:bg-slate-800 disabled:opacity-50 btn-tactile shadow-xs"
                  >
                    Test
                  </button>
                </div>
                {testResponse && (
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[10px] leading-relaxed border border-slate-800">
                    {testResponse}
                  </div>
                )}
              </section>

              {/* Sentiment tester */}
              <section className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold text-sm border-b border-gray-50 pb-3">
                  <Zap size={18} className="text-brand-600" />
                  Sentiment Analyst Test
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Enter call response text..."
                    value={sentimentInput}
                    onChange={(e) => setSentimentInput(e.target.value)}
                    className="flex-1 p-2 bg-gray-50 border border-gray-150 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-brand-500 text-gray-700"
                  />
                  <button 
                    onClick={handleAnalyzeSentiment}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded-xl transition-all hover:bg-indigo-700 btn-tactile shadow-xs"
                  >
                    Analyze
                  </button>
                </div>
                {sentimentOutput && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">Sentiment:</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        sentimentOutput.sentiment === 'Positive' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : sentimentOutput.sentiment === 'Negative'
                          ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {sentimentOutput.sentiment}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold font-mono">({sentimentOutput.score}% score)</span>
                    </div>
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
