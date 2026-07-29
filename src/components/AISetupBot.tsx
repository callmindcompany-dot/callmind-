import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Sparkles, ChevronLeft, Zap, Shield, Users } from 'lucide-react';

export const AISetupBot = ({ onBack }: { onBack: () => void }) => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    { role: 'bot', text: 'Hello Master Founder. I am your AI Setup Assistant. How can I help you configure CallMind today?' }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    setChat([...chat, { role: 'user', text: message }]);
    setMessage('');
    
    // Simulate AI response
    setTimeout(() => {
      setChat(prev => [...prev, { 
        role: 'bot', 
        text: "I've analyzed your request. I can generate the 'Lead Rule' logic for this. Would you like me to apply these changes to the production environment?",
        isAction: true
      }]);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Setup Bot</h1>
            <p className="text-gray-500 mt-1">Configure platform rules and assignments using natural language.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-600 rounded-full border border-brand-100">
          <Sparkles size={16} className="animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Phase 3 Intelligence</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass rounded-2xl flex flex-col h-[600px] overflow-hidden">
          <div className="flex-1 p-8 overflow-y-auto space-y-6 custom-scrollbar">
            {chat.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-none' 
                    : 'bg-gray-100 text-gray-900 rounded-tl-none'
                }`}>
                  <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                  {(msg as any).isAction && (
                    <div className="mt-4 flex gap-2">
                      <button className="px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-700 transition-all">
                        Apply Changes
                      </button>
                      <button className="px-4 py-2 bg-white text-gray-600 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-all">
                        Review Logic
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <div className="relative">
              <input 
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="e.g., 'Assign all Facebook leads to Rahul'..."
                className="w-full pl-6 pr-14 py-4 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:border-brand-500 transition-all shadow-sm"
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-100"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-2xl space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Suggested Commands</h3>
            <div className="space-y-3">
              {[
                { text: "Assign Pune leads to Vrushabh", icon: Users },
                { text: "Enable data masking for all agents", icon: Shield },
                { text: "Set up auto-reminder for Busy calls", icon: Zap }
              ].map((cmd, i) => (
                <button 
                  key={i}
                  onClick={() => setMessage(cmd.text)}
                  className="w-full p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-brand-200 hover:bg-white transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <cmd.icon size={16} className="text-gray-400 group-hover:text-brand-600" />
                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">{cmd.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-8 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
            <Sparkles size={32} className="mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">AI Optimization</h3>
            <p className="text-xs text-brand-100 leading-relaxed">
              The Setup Bot can also analyze your team's performance and suggest rule optimizations to maximize conversion rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
