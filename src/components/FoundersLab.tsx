import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Zap, 
  ShieldCheck, 
  Play,
  Settings,
  Search,
  Plus,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Mic,
  Video,
  PhoneCall,
  X,
  RefreshCw,
  Youtube,
  Trash2,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle as AlertIcon,
  Activity,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { supabase } from '@/supabaseClient';
import toast from 'react-hot-toast';
import {
  useFounderTests,
  useFounderTestLogs,
  useRunTestMutation,
  useUpdateConfigMutation,
  useResourcesQuery,
  useManageResourceMutation,
  useLeadsQuery,
  useWhatsAppMessagesQuery,
  useFounderTestStats,
  TestLog,
  Resource,
  Lead
} from '@/hooks/useFounderLab';
import CallMindLoader from './CallMindLoader';

const TestLogSection = ({ logs, title }: { logs: TestLog[], title: string }) => (
  <div className="mt-6 pt-6 border-t border-gray-100">
    <div className="flex items-center gap-2 mb-4">
      <Activity size={16} className="text-brand-600" />
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
    </div>
    <div className="space-y-3">
      {logs.length > 0 ? logs.map((log) => (
        <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${log.status === 'Success' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-gray-700">{log.message}</span>
          </div>
          <span className="text-[10px] text-gray-400">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )) : (
        <p className="text-xs text-gray-400 italic">No recent test logs found.</p>
      )}
    </div>
  </div>
);

export const FoundersLab = () => {
  const { profile } = useAuth();
  const { companyId } = useCompany();
  
  const [activeTool, setActiveTool] = useState<'voip' | 'whatsapp' | 'email' | 'resources'>('voip');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Dynamic status and history stats query
  const { data: tests = [], isLoading: isTestsLoading } = useFounderTests();
  const { data: stats } = useFounderTestStats();
  
  const activeTestData = activeTool !== 'resources' ? tests.find(t => t.service === activeTool) : undefined;
  const activeStatus = activeTestData?.status || 'Disconnected';

  // Config fields per tool
  const [voipAppId, setVoipAppId] = useState('');
  const [voipApiKey, setVoipApiKey] = useState('');
  const [voipSubdomain, setVoipSubdomain] = useState('');
  const [showVoipKey, setShowVoipKey] = useState(false);

  const [waBusinessId, setWaBusinessId] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [showWaToken, setShowWaToken] = useState(false);

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // Sync state values with dynamic Supabase configuration data
  useEffect(() => {
    if (activeTestData?.config) {
      if (activeTool === 'voip') {
        setVoipAppId(activeTestData.config.appId || '');
        setVoipApiKey(activeTestData.config.apiKey || '');
        setVoipSubdomain(activeTestData.config.subdomain || '');
      } else if (activeTool === 'whatsapp') {
        setWaBusinessId(activeTestData.config.businessId || '');
        setWaPhoneId(activeTestData.config.phoneId || '');
        setWaToken(activeTestData.config.token || '');
      } else if (activeTool === 'email') {
        setSmtpHost(activeTestData.config.host || '');
        setSmtpPort(activeTestData.config.port || 587);
        setSmtpUsername(activeTestData.config.username || '');
        setSmtpPassword(activeTestData.config.password || '');
      }
    }
  }, [activeTestData, activeTool]);

  // Mutations
  const updateConfigMutation = useUpdateConfigMutation();
  const runTestMutation = useRunTestMutation();

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTool === 'resources') return;
    let config = {};
    if (activeTool === 'voip') {
      config = { appId: voipAppId, apiKey: voipApiKey, subdomain: voipSubdomain };
    } else if (activeTool === 'whatsapp') {
      config = { businessId: waBusinessId, phoneId: waPhoneId, token: waToken };
    } else if (activeTool === 'email') {
      config = { host: smtpHost, port: Number(smtpPort), username: smtpUsername, password: smtpPassword };
    }

    try {
      await updateConfigMutation.mutateAsync({ service: activeTool, config });
      toast.success("Credentials saved to database!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error("Failed to save: " + errorMessage);
    }
  };

  const handleExecuteTest = async () => {
    if (activeTool === 'resources') return;
    let config = {};
    if (activeTool === 'voip') {
      config = { appId: voipAppId, apiKey: voipApiKey, subdomain: voipSubdomain };
    } else if (activeTool === 'whatsapp') {
      config = { businessId: waBusinessId, phoneId: waPhoneId, token: waToken };
    } else if (activeTool === 'email') {
      config = { host: smtpHost, port: Number(smtpPort), username: smtpUsername, password: smtpPassword };
    }

    const toastId = toast.loading(`Triggering live ${activeTool.toUpperCase()} test gateway...`);
    try {
      const res = await runTestMutation.mutateAsync({ service: activeTool, config });
      if (res.success) {
        toast.success(`Success! Status: ${res.status}. Latency: ${res.latency}ms`, { id: toastId });
      } else {
        toast.error(`Verification failed: ${res.message}`, { id: toastId });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Execution failure: ${errorMessage}`, { id: toastId });
    }
  };

  if (isTestsLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <CallMindLoader size="lg" text="Loading Lab Console..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Founder's Lab</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Core integration sandbox, gateway validators, and CMS contents.</p>
        </div>
        
        {/* Navigation Toolbar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 border border-gray-150 rounded-2xl shrink-0 text-xs font-bold">
          <button 
            onClick={() => setActiveTool('voip')}
            className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 btn-tactile ${activeTool === 'voip' ? 'bg-white text-brand-650 shadow-xs border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Phone size={14} /> VoIP Calling
          </button>
          <button 
            onClick={() => setActiveTool('whatsapp')}
            className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 btn-tactile ${activeTool === 'whatsapp' ? 'bg-white text-brand-650 shadow-xs border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <MessageSquare size={14} /> WhatsApp
          </button>
          <button 
            onClick={() => setActiveTool('email')}
            className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 btn-tactile ${activeTool === 'email' ? 'bg-white text-brand-650 shadow-xs border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Mail size={14} /> SMTP Mailer
          </button>
          <button 
            onClick={() => setActiveTool('resources')}
            className={`px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 btn-tactile ${activeTool === 'resources' ? 'bg-white text-brand-650 shadow-xs border border-gray-100' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Play size={14} /> CMS Studio
          </button>
        </div>
      </div>

      {/* Aggregate Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 border border-gray-150 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total Tests Executed</span>
            <span className="text-3xl font-black text-gray-900 font-display mt-2">{stats.total}</span>
          </div>
          <div className="glass-card p-5 border border-gray-150 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-green-500 uppercase tracking-wider">Verification Passes</span>
            <span className="text-3xl font-black text-green-600 font-display mt-2">{stats.success}</span>
          </div>
          <div className="glass-card p-5 border border-gray-150 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Verification Failures</span>
            <span className="text-3xl font-black text-red-600 font-display mt-2">{stats.failure}</span>
          </div>
          <div className="glass-card p-5 border border-gray-150 rounded-2xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-brand-500 uppercase tracking-wider">Overall Success Ratio</span>
            <span className="text-3xl font-black text-brand-600 font-display mt-2">{stats.rate}%</span>
          </div>
        </div>
      )}

      {/* Simulated Live Integrations Viewport */}
      <div className="min-h-[600px] h-[650px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTool === 'voip' && (
              <VoIPPanel 
                companyId={companyId}
                activeStatus={activeStatus} 
                runTestPending={runTestMutation.isPending}
                onExecuteTest={handleExecuteTest}
                onSubmitConfig={handleSaveConfig}
                appId={voipAppId} setAppId={setVoipAppId}
                apiKey={voipApiKey} setApiKey={setVoipApiKey}
                subdomain={voipSubdomain} setSubdomain={setVoipSubdomain}
                showKey={showVoipKey} setShowKey={setShowVoipKey}
                selectedLead={selectedLead} setSelectedLead={setSelectedLead}
              />
            )}
            {activeTool === 'whatsapp' && (
              <WhatsAppPanel 
                companyId={companyId}
                activeStatus={activeStatus}
                runTestPending={runTestMutation.isPending}
                onExecuteTest={handleExecuteTest}
                onSubmitConfig={handleSaveConfig}
                businessId={waBusinessId} setBusinessId={setWaBusinessId}
                phoneId={waPhoneId} setPhoneId={setWaPhoneId}
                token={waToken} setToken={setWaToken}
                showToken={showWaToken} setShowToken={setShowWaToken}
                selectedLead={selectedLead} setSelectedLead={setSelectedLead}
              />
            )}
            {activeTool === 'email' && (
              <EmailPanel 
                activeStatus={activeStatus}
                runTestPending={runTestMutation.isPending}
                onExecuteTest={handleExecuteTest}
                onSubmitConfig={handleSaveConfig}
                host={smtpHost} setHost={setSmtpHost}
                port={smtpPort} setPort={setSmtpPort}
                username={smtpUsername} setUsername={setSmtpUsername}
                password={smtpPassword} setPassword={setSmtpPassword}
                showPassword={showSmtpPassword} setShowPassword={setShowSmtpPassword}
              />
            )}
            {activeTool === 'resources' && (
              <ResourcesCMS />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ============================================================================
   VoIP CONTROLLER PANEL
============================================================================ */
interface VoIPProps {
  companyId: string | null;
  activeStatus: string;
  runTestPending: boolean;
  onExecuteTest: () => void;
  onSubmitConfig: (e: React.FormEvent) => void;
  appId: string; setAppId: (val: string) => void;
  apiKey: string; setApiKey: (val: string) => void;
  subdomain: string; setSubdomain: (val: string) => void;
  showKey: boolean; setShowKey: (val: boolean) => void;
  selectedLead: Lead | null; setSelectedLead: (lead: Lead) => void;
}

const VoIPPanel = ({
  companyId, activeStatus, runTestPending, onExecuteTest, onSubmitConfig,
  appId, setAppId, apiKey, setApiKey, subdomain, setSubdomain, showKey, setShowKey,
  selectedLead, setSelectedLead
}: VoIPProps) => {
  const { data: logs = [] } = useFounderTestLogs('voip');
  const { data: leads = [], isLoading: isLeadsLoading } = useLeadsQuery(companyId);

  // Sync default selection
  useEffect(() => {
    if (leads.length > 0 && !selectedLead) {
      setSelectedLead(leads[0]);
    }
  }, [leads, selectedLead, setSelectedLead]);

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Top Bar Status */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50 text-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200">
            <Phone size={18} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-black text-sm">VoIP Exotel Gateway</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Dynamic Sandbox</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onExecuteTest}
            disabled={runTestPending}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-all shadow-xs disabled:opacity-50 btn-tactile"
          >
            {runTestPending ? <RefreshCw size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
            Trigger Verification
          </button>
          <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider ${activeStatus === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : activeStatus === 'Testing' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {activeStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Credentials Editor */}
        <div className="w-1/3 border-r border-gray-100 p-6 bg-gray-50/30 overflow-y-auto space-y-6">
          <form onSubmit={onSubmitConfig} className="space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Gateway Configuration</h4>
            
            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Exotel App ID</label>
              <input required type="text" value={appId} onChange={e => setAppId(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="e.g. callmind123" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Exotel Subdomain</label>
              <input required type="text" value={subdomain} onChange={e => setSubdomain(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="e.g. api.in" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">API Key / Token</label>
              <div className="relative">
                <input required type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="••••••••••••••••" />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition btn-tactile">Save Credentials</button>
          </form>
          <TestLogSection logs={logs} title="Connection Logs" />
        </div>

        {/* Lead Dial Simulator Workspace */}
        <div className="w-1/4 border-r border-gray-100 p-4 space-y-3 overflow-y-auto">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Active Call Targets</h4>
          {isLeadsLoading ? (
            <div className="py-12 flex justify-center"><RefreshCw size={16} className="animate-spin text-gray-400" /></div>
          ) : leads.length > 0 ? (
            leads.map(lead => (
              <button 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${selectedLead?.id === lead.id ? 'bg-brand-50/50 border-brand-200 text-brand-900' : 'bg-white hover:bg-gray-50 border-gray-150'}`}
              >
                <p className="text-xs font-bold truncate">{lead.name}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{lead.phone}</p>
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic px-2">No leads enrolled in company.</p>
          )}
        </div>

        {/* Console Dialer Window */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-6 bg-gray-50/30 overflow-y-auto">
          {selectedLead ? (
            <>
              <div className="w-28 h-28 rounded-full bg-blue-50/70 border border-blue-100 flex items-center justify-center relative">
                {activeStatus === 'Connected' && (
                  <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-15" />
                )}
                <div className={`w-20 h-20 rounded-full ${activeStatus === 'Connected' ? 'bg-blue-600' : 'bg-gray-400'} flex items-center justify-center text-white shadow-md relative z-10 transition-colors`}>
                  {activeStatus === 'Testing' ? <RefreshCw size={30} className="animate-spin" /> : <PhoneCall size={30} />}
                </div>
              </div>
              <div className="text-center">
                <h4 className="text-lg font-bold text-gray-900">
                  Dialing: {selectedLead.name}
                </h4>
                <p className="text-xs text-gray-400 font-bold mt-1 tracking-wider uppercase">{selectedLead.phone}</p>
                <p className="text-xs text-gray-500 font-semibold max-w-xs mx-auto mt-2">
                  {activeStatus === 'Connected' ? 'Trunk channel established. VoIP Phase 2 live routing active.' : 'Carrier Gateway is disconnected. Verify settings.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button disabled={activeStatus !== 'Connected'} className="w-12 h-12 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all border border-red-100 disabled:opacity-40 btn-tactile">
                  <X size={20} />
                </button>
                <button disabled={activeStatus !== 'Connected'} className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 text-gray-400 flex items-center justify-center transition-all border border-gray-200 disabled:opacity-40 btn-tactile">
                  <Mic size={20} />
                </button>
                <button disabled={activeStatus !== 'Connected'} className="w-12 h-12 rounded-full bg-white hover:bg-gray-50 text-gray-400 flex items-center justify-center transition-all border border-gray-200 disabled:opacity-40 btn-tactile">
                  <Video size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-2">
              <PhoneCall size={40} className="mx-auto text-gray-300" />
              <p className="text-xs text-gray-400 italic">Select an active call target to test dialer console.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   WhatsApp BUSINESS API PANEL
============================================================================ */
interface WhatsAppProps {
  companyId: string | null;
  activeStatus: string;
  runTestPending: boolean;
  onExecuteTest: () => void;
  onSubmitConfig: (e: React.FormEvent) => void;
  businessId: string; setBusinessId: (val: string) => void;
  phoneId: string; setPhoneId: (val: string) => void;
  token: string; setToken: (val: string) => void;
  showToken: boolean; setShowToken: (val: boolean) => void;
  selectedLead: Lead | null; setSelectedLead: (lead: Lead) => void;
}

const WhatsAppPanel = ({
  companyId, activeStatus, runTestPending, onExecuteTest, onSubmitConfig,
  businessId, setBusinessId, phoneId, setPhoneId, token, setToken, showToken, setShowToken,
  selectedLead, setSelectedLead
}: WhatsAppProps) => {
  const { data: logs = [] } = useFounderTestLogs('whatsapp');
  const { data: leads = [], isLoading: isLeadsLoading } = useLeadsQuery(companyId);
  const { data: messages = [], isLoading: isMsgsLoading } = useWhatsAppMessagesQuery(companyId, selectedLead?.id || null);

  const [chatInput, setChatInput] = useState('');

  // Sync default selection
  useEffect(() => {
    if (leads.length > 0 && !selectedLead) {
      setSelectedLead(leads[0]);
    }
  }, [leads, selectedLead, setSelectedLead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !companyId || !selectedLead) return;

    try {
      const { error } = await supabase.from('whatsapp_messages').insert({
        company_id: companyId,
        lead_id: selectedLead.id,
        sender: 'You',
        message_text: chatInput.trim(),
        direction: 'outbound'
      });

      if (error) throw error;
      setChatInput('');
    } catch (err: unknown) {
      toast.error("Failed to transmit test message.");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Top Bar Status */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50/50 text-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center border border-green-200">
            <MessageSquare size={18} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-sm">WhatsApp Business Webhook</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Meta API challenge</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onExecuteTest}
            disabled={runTestPending}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-green-600 hover:bg-green-50 transition-all shadow-xs disabled:opacity-50 btn-tactile"
          >
            {runTestPending ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Verify Webhook Challenge
          </button>
          <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider ${activeStatus === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : activeStatus === 'Testing' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {activeStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Credentials Editor */}
        <div className="w-1/3 border-r border-gray-100 p-6 bg-gray-50/30 overflow-y-auto space-y-6">
          <form onSubmit={onSubmitConfig} className="space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Webhook Credentials</h4>
            
            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Business Account ID</label>
              <input required type="text" value={businessId} onChange={e => setBusinessId(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="e.g. 8928477209" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Phone ID</label>
              <input required type="text" value={phoneId} onChange={e => setPhoneId(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="e.g. 102928373" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">System Access Token</label>
              <div className="relative">
                <input required type={showToken ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)} className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="••••••••••••••••" />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition btn-tactile">Save Settings</button>
          </form>
          <TestLogSection logs={logs} title="Webhook challenge Logs" />
        </div>

        {/* Lead Chat Selection */}
        <div className="w-1/4 border-r border-gray-100 p-4 space-y-3 overflow-y-auto">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Conversations</h4>
          {isLeadsLoading ? (
            <div className="py-12 flex justify-center"><RefreshCw size={16} className="animate-spin text-gray-400" /></div>
          ) : leads.length > 0 ? (
            leads.map(lead => (
              <button 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${selectedLead?.id === lead.id ? 'bg-brand-50/50 border-brand-200 text-brand-900' : 'bg-white hover:bg-gray-50 border-gray-150'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                    {lead.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{lead.name}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5 truncate">{lead.phone}</p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic px-2">No target leads available.</p>
          )}
        </div>

        {/* Chat Window Viewport */}
        <div className="flex-1 flex flex-col relative bg-gray-50/30">
          {selectedLead ? (
            <>
              {/* Message History */}
              <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {isMsgsLoading ? (
                  <div className="py-12 flex justify-center"><RefreshCw size={18} className="animate-spin text-gray-400" /></div>
                ) : messages.length > 0 ? (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[75%] border text-xs leading-relaxed ${msg.direction === 'outbound' ? 'bg-brand-50 border-brand-100 text-brand-955 rounded-tr-none' : 'bg-white border-gray-155 text-gray-900 rounded-tl-none'}`}>
                        <p>{msg.message_text}</p>
                        <span className="text-[8px] text-gray-400 block mt-1 text-right">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-400 italic space-y-2">
                    <MessageSquare size={24} className="mx-auto opacity-40 text-gray-505" />
                    <p className="text-xs">No message logs. Send a test message to start the channel.</p>
                  </div>
                )}
              </div>

              {/* Message Input bar */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white flex items-center gap-3 border-t border-gray-150">
                <Smile className="text-gray-400 cursor-pointer hover:text-gray-600" size={20} />
                <Paperclip className="text-gray-400 cursor-pointer hover:text-gray-600" size={20} />
                <input 
                  type="text" 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder="Type message to transmit..." 
                  className="flex-1 py-2 px-3.5 bg-gray-50 border border-gray-150 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold"
                />
                <button type="submit" className="w-9 h-9 bg-brand-650 hover:bg-brand-700 text-white rounded-full flex items-center justify-center shadow-xs transition-colors btn-tactile shrink-0">
                  <Send size={14} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <MessageSquare size={36} className="text-gray-300" />
              <p className="text-xs italic">Select a contact conversation from the sidebar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   SMTP MAILER CONTROL PANEL
============================================================================ */
interface EmailProps {
  activeStatus: string;
  runTestPending: boolean;
  onExecuteTest: () => void;
  onSubmitConfig: (e: React.FormEvent) => void;
  host: string; setHost: (val: string) => void;
  port: number; setPort: (val: number) => void;
  username: string; setUsername: (val: string) => void;
  password: string; setPassword: (val: string) => void;
  showPassword: boolean; setShowPassword: (val: boolean) => void;
}

const EmailPanel = ({
  activeStatus, runTestPending, onExecuteTest, onSubmitConfig,
  host, setHost, port, setPort, username, setUsername, password, setPassword, showPassword, setShowPassword
}: EmailProps) => {
  const { data: logs = [] } = useFounderTestLogs('email');

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Top Bar Status */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50 text-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center border border-red-200">
            <Mail size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-black text-sm">SMTP Gateway Sync</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Mailer Verification</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onExecuteTest}
            disabled={runTestPending}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all shadow-xs disabled:opacity-50 btn-tactile"
          >
            {runTestPending ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            Test SMTP Handshake
          </button>
          <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider ${activeStatus === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : activeStatus === 'Testing' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {activeStatus === 'Connected' ? 'GMAIL ACTIVE' : activeStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Credentials Editor */}
        <div className="w-1/3 border-r border-gray-100 p-6 bg-gray-50/30 overflow-y-auto space-y-6">
          <form onSubmit={onSubmitConfig} className="space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">SMTP Parameters</h4>
            
            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">SMTP Host Server</label>
              <input required type="text" value={host} onChange={e => setHost(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="e.g. smtp.gmail.com" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">SMTP Port</label>
              <input required type="number" value={port} onChange={e => setPort(Number(e.target.value))} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="587" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">SMTP Username</label>
              <input required type="email" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="sender@gmail.com" />
            </div>

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">SMTP Password</label>
              <div className="relative">
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full pr-10 pl-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-500 font-semibold" placeholder="••••••••••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition btn-tactile">Save SMTP</button>
          </form>
          <TestLogSection logs={logs} title="SMTP Sync History" />
        </div>

        {/* Mail Queue Preview */}
        <div className="w-52 border-r border-gray-100 p-4 space-y-2">
          <button className="w-full flex items-center gap-3 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl font-black text-xs uppercase tracking-wider">
            <Mail size={15} /> Sync Queue
          </button>
        </div>

        {/* Sync logs viewport */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-gray-400 space-y-2 bg-gray-50/30">
          <Activity size={32} className="text-gray-300" />
          <p className="text-xs italic">Sync verification triggers logs. SMTP handshake verified reactively.</p>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   CMS STUDIO PANEL (RESOURCES)
============================================================================ */
const ResourcesCMS = () => {
  const { data: resources = [], isLoading } = useResourcesQuery();
  const manageResource = useManageResourceMutation();

  const [activeTab, setActiveTab] = useState<'video' | 'pdf'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Uploading PDF to Supabase Storage...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `resources/${fileName}`;

      // Upload file directly to Supabase storage resources bucket
      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      setUrl(publicUrl);
      toast.success("PDF uploaded successfully!", { id: toastId });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error("Upload failed: " + errorMessage, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeedDemos = async () => {
    const seedVideos: Omit<Resource, 'id' | 'created_at'>[] = [
      { type: 'video', title: 'Why do we fall? - Motivational Video', description: 'When life hits you hard, you hit back harder.', url: 'https://youtube.com/watch?v=mgmVOuLgLF0', youtube_id: 'mgmVOuLgLF0', duration: '05:54' },
      { type: 'video', title: 'Steve Jobs 2005 Stanford Commencement Address', description: 'Stay Hungry. Stay Foolish.', url: 'https://youtube.com/watch?v=UF8uR6Z6KLc', youtube_id: 'UF8uR6Z6KLc', duration: '15:04' },
      { type: 'video', title: 'Dream - Motivational Video', description: 'What is your dream?', url: 'https://youtube.com/watch?v=g-jwWYX7Jlo', youtube_id: 'g-jwWYX7Jlo', duration: '06:20' }
    ];

    try {
      await manageResource.mutateAsync({ type: 'seed', videos: seedVideos });
      toast.success("Demo content seeded!");
    } catch (err: unknown) {
      toast.error("Failed to seed demo content.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    
    let youtubeId: string | null = null;
    if (activeTab === 'video') {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      youtubeId = (match && match[2].length === 11) ? match[2] : null;
      if (!youtubeId) {
        toast.error("Invalid YouTube URL. Please verify the link.");
        return;
      }
    }

    try {
      const resource: Omit<Resource, 'id' | 'created_at'> = {
        type: activeTab,
        title,
        description: description || null,
        url,
        duration: activeTab === 'video' ? (duration || '00:00') : null,
        youtube_id: youtubeId
      };

      await manageResource.mutateAsync({ type: 'add', resource });
      toast.success(`${activeTab === 'video' ? 'Video' : 'PDF'} added successfully!`);
      setTitle('');
      setDescription('');
      setUrl('');
      setDuration('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      toast.error("Failed to save content.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await manageResource.mutateAsync({ type: 'delete', id });
      toast.success("Resource deleted successfully");
    } catch (err: unknown) {
      toast.error("Failed to delete.");
    }
  };

  const filteredResources = resources.filter(r => r.type === activeTab);

  return (
    <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50/50 text-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center border border-purple-200">
            <Play size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-black text-sm">Resource CMS Studio</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Dynamic content assets</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-[9px] font-black rounded-lg border border-purple-200">LIVE SYNC</span>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* ADD PANEL */}
        <div className="w-1/3 border-r border-gray-100 p-6 bg-gray-50/30 overflow-y-auto space-y-6">
          <h4 className="font-black text-xs text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Plus size={16} /> Publish New Asset
          </h4>
          
          <div className="flex items-center gap-1.5 p-1 bg-gray-200/40 rounded-xl text-xs font-bold">
             <button onClick={() => { setActiveTab('video'); setUrl(''); }} className={`flex-1 py-1.5 rounded-lg transition-all btn-tactile ${activeTab === 'video' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'}`}>Video</button>
             <button onClick={() => { setActiveTab('pdf'); setUrl(''); }} className={`flex-1 py-1.5 rounded-lg transition-all btn-tactile ${activeTab === 'pdf' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500'}`}>PDF Document</button>
          </div>

          <form onSubmit={handleAdd} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Resource Title</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-500" placeholder="e.g. Master Class Module" />
            </div>

            {activeTab === 'video' ? (
              <>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Duration (MM:SS)</label>
                  <div className="relative">
                    <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-500" placeholder="05:30" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">YouTube URL</label>
                  <input required type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-500" placeholder="https://youtube.com/watch?v=..." />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Upload PDF File</label>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileUpload} 
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Document PDF URL</label>
                  <input required type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-500" placeholder="https://..." />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">Asset Notes / Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-brand-500 resize-none" placeholder="Details..."></textarea>
            </div>

            <button type="submit" disabled={isUploading} className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold uppercase tracking-wider transition btn-tactile disabled:bg-gray-300">Publish Live</button>
          </form>
        </div>
        
        {/* LIST PANEL */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/10">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-black text-xs text-gray-900 uppercase tracking-widest">
              Active Studio {activeTab === 'video' ? 'Videos' : 'PDF documents'}
            </h4>
            {resources.length === 0 && !isLoading && (
              <button onClick={handleSeedDemos} className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors btn-tactile flex items-center gap-1">
                <Sparkles size={11} /> Seed Templates
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><RefreshCw size={24} className="animate-spin text-gray-300" /></div>
          ) : (
            <div className="space-y-4">
              {filteredResources.map(res => (
                <div key={res.id} className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm flex items-start gap-4 hover:border-purple-200 transition-all">
                  <div className="shrink-0 w-24 h-16 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative flex items-center justify-center">
                    {res.type === 'video' && res.youtube_id ? (
                      <img src={`https://img.youtube.com/vi/${res.youtube_id}/0.jpg`} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <FileText size={24} className="text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h5 className="font-bold text-xs text-gray-900 truncate">{res.title}</h5>
                      <button onClick={() => handleDelete(res.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                    </div>
                    {res.type === 'video' && <p className="text-[9px] font-black text-gray-400 mt-0.5">{res.duration} • ID: {res.youtube_id}</p>}
                    <p className="text-[11px] text-gray-500 mt-1 truncate">{res.description || 'No descriptions added.'}</p>
                  </div>
                </div>
              ))}
              {filteredResources.length === 0 && (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl italic text-xs">
                  No {activeTab} assets published yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
