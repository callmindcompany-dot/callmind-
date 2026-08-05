import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Search, Filter, Tag, CheckCircle2, Clock, Phone, ChevronRight } from 'lucide-react';
import { WhatsAppConversation, WhatsAppMessage } from '../../services/whatsappInbox.service';

interface WhatsAppSharedInboxProps {
  userRole?: string;
  agentId?: string;
}

export const WhatsAppSharedInbox: React.FC<WhatsAppSharedInboxProps> = ({
  userRole = 'founder',
  agentId = 'agent-1',
}) => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !selectedConv) {
          setSelectedConv(data.conversations[0]);
        }
      }
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/whatsapp/conversations/${convId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Handle error
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
    }
  }, [selectedConv]);

  const handleSendMessage = async () => {
    if (!selectedConv || !inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/whatsapp/conversations/${selectedConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: textToSend }),
      });

      if (res.ok) {
        await fetchMessages(selectedConv.id);
        await fetchConversations();
      }
    } catch {
      // Error handling
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerPhone.includes(searchQuery) ||
      c.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-80px)] bg-slate-50 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      {/* Left Column: Conversation List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900 text-lg uppercase tracking-tighter italic flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-600" /> WhatsApp Inbox
            </h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search chat or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            {['open', 'pending', 'closed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 text-xs font-extrabold capitalize rounded-lg transition-all ${
                  statusFilter === st ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedConv(conv)}
              className={`p-3.5 cursor-pointer hover:bg-slate-50 transition-all ${
                selectedConv?.id === conv.id ? 'bg-brand-50/60 border-l-4 border-brand-600' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-slate-900 text-sm">{conv.customerName}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(conv.lastMessageAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs text-slate-500 line-clamp-1 mb-1.5">{conv.lastMessageText}</div>
              <div className="flex items-center gap-1">
                {conv.tags.map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 bg-brand-50 text-brand-700 text-[9px] font-bold rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Column: Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {selectedConv ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedConv.customerName}</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedConv.customerPhone}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold capitalize">
                  Status: {selectedConv.status}
                </span>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.direction === 'outbound'
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <p className="font-medium">{msg.messageText}</p>
                    <span
                      className={`text-[9px] block text-right mt-1 font-semibold ${
                        msg.direction === 'outbound' ? 'text-brand-100' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type WhatsApp message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !inputText.trim()}
                className="px-4 py-2.5 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
            Select a conversation to start messaging
          </div>
        )}
      </div>

      {/* Right Column: Lead Context Sidebar */}
      {selectedConv && (
        <div className="w-72 bg-white border-l border-slate-200 p-4 space-y-4">
          <h4 className="font-bold text-slate-900 text-sm border-b pb-2">Lead Context</h4>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Client Name</span>
              <span className="font-bold text-slate-800">{selectedConv.customerName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Phone Number</span>
              <span className="font-bold text-slate-800">{selectedConv.customerPhone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Assigned Agent</span>
              <span className="font-bold text-brand-600">Assigned</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
