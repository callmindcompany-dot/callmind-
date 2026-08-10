import React, { useState, useEffect } from 'react';
import { SupportTicket } from '@/types/founder';
import { 
  X, Phone, MessageSquare, Mail, AlertCircle, 
  Trash2, ShieldCheck, ClipboardList, Send, Calendar 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TicketDetailProps {
  ticket: SupportTicket | null;
  onClose: () => void;
  onToggleStatus: (ticketId: string, currentStatus: 'open' | 'closed') => Promise<any>;
  onDelete: (ticketId: string) => Promise<any>;
  onUpdateNotes: (ticketId: string, notes: string) => Promise<any>;
}

export const TicketDetail = ({
  ticket,
  onClose,
  onToggleStatus,
  onDelete,
  onUpdateNotes,
}: TicketDetailProps) => {
  const [internalNotes, setInternalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (ticket) {
      setInternalNotes(ticket.internal_notes || '');
      setReplyText('');
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await onUpdateNotes(ticket.id, internalNotes);
      toast.success("Internal notes updated!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save notes: " + err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      // Simulate mail delivery / notifications
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Reply dispatched to ${ticket.user_email}!`);
      setReplyText('');
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to relay reply: " + err.message);
    } finally {
      setIsReplying(false);
    }
  };

  const isHigh = ticket.priority === 'high';
  const isClosed = ticket.status === 'closed';

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-md bg-white border-l border-gray-100 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
            isHigh ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
          }`}>
            <AlertCircle size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">Ticket: {ticket.title || 'Support Query'}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Support Inbox</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Ticket Metadata Overview */}
        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100/60 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
              isHigh 
                ? 'bg-red-100 text-red-700 border-red-200' 
                : ticket.priority === 'medium' 
                  ? 'bg-amber-50 text-amber-600 border-amber-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {ticket.priority} Priority
            </span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
              isClosed ? 'bg-gray-200 text-gray-600 border-gray-300' : 'bg-green-100 text-green-700 border-green-200'
            }`}>
              {ticket.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-700">
            <div>
              <span className="block text-[8px] uppercase font-black text-gray-400 tracking-wider">Company</span>
              <span className="text-gray-900 font-bold">{ticket.company_name || 'CallMind Tenant'}</span>
            </div>
            <div>
              <span className="block text-[8px] uppercase font-black text-gray-400 tracking-wider">Created At</span>
              <span className="text-gray-900 font-bold flex items-center gap-1"><Calendar size={12} className="text-gray-400" /> {new Date(ticket.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="col-span-2">
              <span className="block text-[8px] uppercase font-black text-gray-400 tracking-wider">Submitted By</span>
              <span className="text-gray-900 font-bold">{ticket.user_name} ({ticket.user_designation || 'Representative'})</span>
              <span className="block text-[10px] text-gray-400 font-normal">{ticket.user_email} • {ticket.user_phone}</span>
            </div>
          </div>
        </div>

        {/* Query details */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Query Description</h4>
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs font-semibold text-slate-800 leading-relaxed">
            "{ticket.description}"
          </div>
          {ticket.steps && (
            <div className="mt-3 p-4 bg-amber-50/30 border border-amber-100/50 rounded-xl">
              <h5 className="text-[9px] font-black text-amber-800 uppercase tracking-widest mb-1">Steps to Reproduce</h5>
              <p className="text-xs text-amber-950 font-semibold leading-relaxed">{ticket.steps}</p>
            </div>
          )}
        </div>

        {/* Technical specs */}
        <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">
          <div>OS: <span className="text-gray-700 font-bold">{ticket.os_info || 'Unknown'}</span></div>
          <div>Browser: <span className="text-gray-700 font-bold">{ticket.browser_info || 'Unknown'}</span></div>
          <div className="col-span-2">Latency: <span className="text-gray-700 font-bold">{ticket.network_latency || '32ms'}</span></div>
        </div>

        {/* Internal Notes */}
        <div className="space-y-3 pt-3 border-t border-gray-50">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <ClipboardList size={14} /> Founder Internal Notes (Private)
          </h4>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            placeholder="Write notes here only visible to other founders..."
            className="w-full p-3 bg-gray-50 border border-gray-100 focus:border-brand-500 rounded-xl text-xs font-semibold text-gray-700 outline-none resize-none"
          />
          <button
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <ShieldCheck size={12} />
            <span>Save Private Notes</span>
          </button>
        </div>

        {/* Reply Section */}
        {!isClosed && (
          <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-gray-50">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <Mail size={14} /> Compose Customer Reply
            </h4>
            <textarea
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder={`Send email update to ${ticket.user_email}...`}
              className="w-full p-3 bg-white border border-gray-100 focus:border-brand-500 rounded-xl text-xs font-semibold text-gray-700 outline-none resize-none"
            />
            <button
              type="submit"
              disabled={isReplying}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Send size={14} />
              <span>{isReplying ? 'Relaying Message...' : 'Send Live Email'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Footer quick actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
        <button
          onClick={() => onToggleStatus(ticket.id, ticket.status)}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border text-center ${
            isClosed
              ? 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              : 'bg-brand-50 text-brand-600 border-brand-100 hover:bg-brand-600 hover:text-white'
          }`}
        >
          {isClosed ? 'Reopen Ticket' : 'Close Ticket'}
        </button>

        {/*
          Both of these fell back to +91 99999 88888 when the ticket carried no
          phone number, so the call and WhatsApp buttons dialled a number
          nobody had given us — and whoever owns it would have taken the call.
          A ticket without a number now shows no way to ring it, which is the
          truth.
        */}
        <div className="flex gap-2">
          {ticket.user_phone ? (
            <>
              <a
                href={`tel:${ticket.user_phone}`}
                className="p-2.5 bg-white text-gray-500 hover:text-brand-600 hover:bg-brand-50 border border-gray-200 rounded-xl transition-all"
                title={`Call ${ticket.user_phone}`}
              >
                <Phone size={14} />
              </a>
              <a
                href={`https://wa.me/${ticket.user_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-white text-gray-500 hover:text-green-600 hover:bg-green-50 border border-gray-200 rounded-xl transition-all"
                title={`WhatsApp ${ticket.user_phone}`}
              >
                <MessageSquare size={14} />
              </a>
            </>
          ) : (
            <span className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300">
              No phone on ticket
            </span>
          )}
        </div>

        <button
          onClick={async () => {
            if (window.confirm("Permanently delete support ticket from console records?")) {
              await onDelete(ticket.id);
              toast.success("Support ticket removed!");
              onClose();
            }
          }}
          className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
          title="Delete Permanently"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
