import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  MessageSquare, 
  Check, 
  CheckCheck, 
  Layers, 
  Phone, 
  AlertCircle,
  Loader2,
  BookOpen
} from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { useChatLeads } from '@/hooks/useChatLeads';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useMessageTemplates } from '@/hooks/useMessageTemplates';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/AuthContext';
import { ChatLead, WhatsAppMessage } from '@/types/settings';
import { toast } from 'react-hot-toast';

interface ChatInboxProps {
  companyId: string | null;
}

export const ChatInbox: React.FC<ChatInboxProps> = ({ companyId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  
  const { data: chatLeads = [], isLoading: loadingLeads, error: leadsError } = useChatLeads(companyId);
  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(companyId, selectedLeadId);
  const { mutateAsync: sendMessage, isPending: isSending } = useSendMessage(companyId);
  const { templates } = useMessageTemplates(companyId);
  const { settings } = useCompanySettings(companyId);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time Chat Subscription
  useEffect(() => {
    if (!companyId) return;

    const playLocalBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (err) {
        console.warn('AudioContext beep failed:', err);
      }
    };

    const channel = supabase
      .channel('whatsapp_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `company_id=eq.${companyId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as WhatsAppMessage;
            if (newMsg && newMsg.direction === 'incoming') {
              // 1. Process STOP reply for opt-out
              if (newMsg.content.trim().toUpperCase() === 'STOP') {
                try {
                  await supabase
                    .from('leads')
                    .update({ opted_out: true })
                    .eq('id', newMsg.lead_id);
                  toast.success('Lead replied STOP - marked as opted out.');
                } catch (err) {
                  console.error('Failed to opt out lead:', err);
                }
              }

              // 2. Fetch admin notification preferences
              const savedPrefs = localStorage.getItem(`callmind_notif_prefs_${user?.id}`);
              const prefs = savedPrefs ? JSON.parse(savedPrefs) : { sound: true, desktop: true, email: false };

              if (prefs.sound) {
                playLocalBeep();
              }

              if (prefs.desktop) {
                if (Notification.permission === 'granted') {
                  new Notification('New Chat Message Received', {
                    body: newMsg.content
                  });
                } else if (Notification.permission !== 'denied') {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      new Notification('New Chat Message Received', {
                        body: newMsg.content
                      });
                    }
                  });
                }
              }

              if (prefs.email && user?.email) {
                try {
                  await supabase.functions.invoke('send-email', {
                    body: {
                      to_email: user.email,
                      subject: 'CallMind Alert: New Message Received',
                      body_content: `You have received a new message: "${newMsg.content}"`,
                      company_id: companyId
                    }
                  });
                } catch (err) {
                  console.warn('Failed to send email alert:', err);
                }
              }
            }
          }

          // Invalidate message queries to fetch latest thread instantly
          queryClient.invalidateQueries({ queryKey: ['chatMessages', companyId] });
          queryClient.invalidateQueries({ queryKey: ['chatLeads', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient, user]);

  // Find active lead details
  const activeLead = chatLeads.find(l => l.lead_id === selectedLeadId);

  // Filter leads by search query
  const filteredLeads = chatLeads.filter(lead => 
    lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.lead_phone.includes(searchQuery)
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !activeLead || !messageInput.trim()) return;

    const content = messageInput.trim();
    setMessageInput('');

    // Check if WhatsApp Business API integration is configured
    const isApiConnected = settings?.whatsapp_config?.connected || false;
    if (!isApiConnected) {
      toast.error('WhatsApp API not configured. Message saved for reference.');
    }

    try {
      await sendMessage({
        leadId: selectedLeadId,
        leadPhone: activeLead.lead_phone,
        content,
        agentId: user?.uid || null
      });
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    }
  };

  const handleTemplateSelect = (content: string) => {
    const agentName = user?.displayName || user?.email || 'Our Representative';
    let processed = content;
    processed = processed.replace(/\{\{lead_name\}\}/g, activeLead?.lead_name || 'Valued Customer');
    processed = processed.replace(/\{\{agent_name\}\}/g, agentName);
    setMessageInput(processed);
    setShowTemplatesDropdown(false);
  };

  const getRelativeTime = (timeStr: string) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString();
  };

  return (
    <div className="flex bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm h-[680px]">
      
      {/* LEFT PANEL: Leads list */}
      <div className="w-[320px] border-r border-gray-100 flex flex-col shrink-0">
        
        {/* Search Header */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Conversations</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-gray-100 focus:bg-white focus:border-brand-500 rounded-xl text-[11px] font-bold outline-none transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Lead Rows List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-50">
          {loadingLeads ? (
            <div className="py-20 text-center">
              <Loader2 className="animate-spin text-brand-600 mx-auto" size={24} />
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-2 block">Loading chats...</span>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] space-y-2 mt-12">
              <MessageSquare className="mx-auto text-slate-200" size={28} />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredLeads.map((lead: ChatLead) => (
              <button
                key={lead.lead_id}
                onClick={() => setSelectedLeadId(lead.lead_id)}
                className={`w-full p-4 text-left flex items-start justify-between transition-colors border-l-4 ${
                  selectedLeadId === lead.lead_id
                    ? 'bg-brand-50/55 border-brand-500'
                    : 'hover:bg-slate-50/50 border-transparent'
                }`}
              >
                <div className="space-y-1 pr-2 truncate flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">{lead.lead_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate font-semibold">{lead.last_message}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold text-gray-400">{getRelativeTime(lead.last_message_time)}</span>
                  {lead.unread_count > 0 && (
                    <span className="bg-brand-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                      {lead.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Chat Conversation View */}
      <div className="flex-1 flex flex-col bg-[#F8FAFC]/55">
        {selectedLeadId && activeLead ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs border border-brand-100">
                  {activeLead.lead_name[0] || 'L'}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{activeLead.lead_name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-0.5">
                    <Phone size={10} />
                    <span>{activeLead.lead_phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-brand-600" size={24} />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest gap-2">
                  <MessageSquare size={24} />
                  <span>No message history</span>
                </div>
              ) : (
                messages.map((msg: WhatsAppMessage) => {
                  const isOutgoing = msg.direction === 'outgoing';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] p-4 rounded-2xl text-[12px] font-semibold leading-relaxed shadow-sm ${
                        isOutgoing 
                          ? 'bg-brand-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-900 border border-gray-100 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1.5 text-[9px] ${
                          isOutgoing ? 'text-blue-100' : 'text-slate-400'
                        }`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOutgoing && (
                            <span>
                              {msg.status === 'read' ? (
                                <CheckCheck size={12} className="text-cyan-300" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck size={12} />
                              ) : (
                                <Check size={12} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Action Bar */}
            <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3 relative">
              
              {/* Templates Dropdown Button */}
              {templates.filter(t => t.type === 'whatsapp').length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-gray-100 rounded-xl text-[10px] font-bold text-slate-650 hover:bg-slate-100 transition-colors"
                  >
                    <BookOpen size={12} /> Load Dynamic Template
                  </button>

                  {showTemplatesDropdown && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-150 rounded-2xl shadow-xl z-20 py-2 divide-y divide-gray-50 max-h-48 overflow-y-auto custom-scrollbar">
                      {templates.filter(t => t.type === 'whatsapp').map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTemplateSelect(t.content)}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Text Input Row */}
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-transparent focus:border-brand-500 rounded-xl text-xs font-semibold outline-none transition-all focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isSending || !messageInput.trim()}
                  className="px-5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-md shadow-brand-100"
                >
                  {isSending ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <MessageSquare size={36} className="text-slate-350 animate-pulse mb-3" />
            <h5 className="text-xs font-black uppercase tracking-widest text-slate-900">Open conversation</h5>
            <p className="text-[10px] max-w-xs mt-1 leading-relaxed font-semibold">Select a lead profile on the left inbox directory to check outgoing campaign histories or read incoming replies.</p>
          </div>
        )}
      </div>

    </div>
  );
};
