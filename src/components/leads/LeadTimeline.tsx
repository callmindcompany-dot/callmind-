import React, { useState } from 'react';
import {
  PhoneCall,
  PhoneForwarded,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Sparkles,
  Plus,
  Send,
  Calendar,
  User,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TimelineEvent {
  id: string;
  type: 'call' | 'status_change' | 'note' | 'creation' | 'whatsapp';
  title: string;
  description?: string;
  timestamp: string;
  actorName?: string;
  metadata?: {
    outcome?: string;
    interest?: string;
    duration?: string;
    oldStatus?: string;
    newStatus?: string;
  };
}

interface LeadTimelineProps {
  leadId: string;
  leadName: string;
  leadCreatedAt?: string | null;
  leadSource?: string | null;
  calls?: Array<{
    id: string;
    duration?: string | number;
    outcome?: string | null;
    interest?: string | null;
    notes?: string | null;
    created_at?: string | null;
    created_by?: string | null;
    agent_name?: string | null;
  }>;
  onAddNote?: (noteText: string) => Promise<void>;
}

export const LeadTimeline: React.FC<LeadTimelineProps> = ({
  leadId,
  leadName,
  leadCreatedAt,
  leadSource,
  calls = [],
  onAddNote,
}) => {
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState<Array<{ id: string; text: string; timestamp: string; author: string }>>([]);

  // Compile all chronological events
  const events: TimelineEvent[] = [];

  // 1. Lead Creation Event
  if (leadCreatedAt) {
    events.push({
      id: `create-${leadId}`,
      type: 'creation',
      title: 'Lead Captured',
      description: `Lead created via ${leadSource || 'Direct Entry'}.`,
      timestamp: leadCreatedAt,
      actorName: 'System',
    });
  }

  // 2. Call Logs Events
  calls.forEach((c) => {
    const outcome = c.outcome || 'Call Attempted';
    const duration = typeof c.duration === 'number' ? `${c.duration}s` : c.duration || '00:00';
    events.push({
      id: `call-${c.id}`,
      type: 'call',
      title: `Call: ${outcome}`,
      description: c.notes || undefined,
      timestamp: c.created_at || new Date().toISOString(),
      actorName: c.agent_name || 'Telecaller',
      metadata: {
        outcome: c.outcome || undefined,
        interest: c.interest || undefined,
        duration,
      },
    });
  });

  // 3. Local Notes Events
  localNotes.forEach((n) => {
    events.push({
      id: `note-${n.id}`,
      type: 'note',
      title: 'Note Added',
      description: n.text,
      timestamp: n.timestamp,
      actorName: n.author,
    });
  });

  // Sort descending (newest on top)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNote.trim();
    if (!trimmed || isSubmittingNote) return;

    try {
      setIsSubmittingNote(true);
      if (onAddNote) {
        await onAddNote(trimmed);
      }
      setLocalNotes((prev) => [
        {
          id: String(Date.now()),
          text: trimmed,
          timestamp: new Date().toISOString(),
          author: 'You',
        },
        ...prev,
      ]);
      setNewNote('');
    } catch (err) {
      console.error('[LeadTimeline] Note submission error:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const formatEventDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'call':
        if (event.metadata?.outcome === 'Connected' || event.metadata?.interest === 'Interested') {
          return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
        }
        if (event.metadata?.outcome === 'Busy' || event.metadata?.outcome === 'Rejected') {
          return <XCircle className="w-4 h-4 text-rose-600" />;
        }
        return <PhoneCall className="w-4 h-4 text-brand-600" />;
      case 'creation':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'note':
        return <MessageSquare className="w-4 h-4 text-violet-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getEventBadgeClass = (event: TimelineEvent) => {
    switch (event.type) {
      case 'call':
        return 'bg-brand-50 border-brand-200 text-brand-700';
      case 'creation':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'note':
        return 'bg-violet-50 border-violet-200 text-violet-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Lead Journey Timeline</h4>
            <p className="text-xs text-slate-500">{events.length} chronological activities</p>
          </div>
        </div>
      </div>

      {/* Quick Add Note Bar */}
      <form onSubmit={handleCreateNote} className="p-3 border-b border-slate-100 bg-white flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal call note or observation..."
          className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-medium text-slate-800"
          disabled={isSubmittingNote}
        />
        <button
          type="submit"
          disabled={!newNote.trim() || isSubmittingNote}
          className="px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs btn-tactile cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
      </form>

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {events.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold">No activity logged yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Calls, notes and stage updates will appear here.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
            {events.map((event) => (
              <div key={event.id} className="relative group">
                {/* Node Icon */}
                <div className="absolute -left-6 top-0 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-xs group-hover:border-brand-500 transition-colors">
                  {getEventIcon(event)}
                </div>

                {/* Content Card */}
                <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-150 rounded-xl p-3 transition-all shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getEventBadgeClass(event)}`}>
                      {event.title}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatEventDate(event.timestamp)}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-700 font-normal mt-1.5 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100">
                      {event.description}
                    </p>
                  )}

                  {event.metadata && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100/80 text-[11px]">
                      {event.metadata.duration && (
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {event.metadata.duration}
                        </span>
                      )}
                      {event.metadata.interest && (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold text-[10px]">
                          {event.metadata.interest}
                        </span>
                      )}
                    </div>
                  )}

                  {event.actorName && (
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>by {event.actorName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
