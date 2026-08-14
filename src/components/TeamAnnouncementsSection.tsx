import React, { useState } from 'react';
import { useCompany } from '@/CompanyContext';
import { useAuth } from '@/AuthContext';
import { Megaphone, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';
import CallMindLoader from './CallMindLoader';

type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];

/**
 * TeamAnnouncementsSection Component
 * 
 * Manages company announcements using Supabase and React Query.
 */
export const TeamAnnouncementsSection = () => {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery<AnnouncementRow[]>({
    queryKey: ['announcements', companyId],
    queryFn: async (): Promise<AnnouncementRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 15000,
  });

  // Create announcement
  const createMutation = useMutation({
    mutationFn: async (status: 'sent' | 'scheduled') => {
      if (!companyId || !user) throw new Error('Missing companyId or user');
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          company_id: companyId,
          title: title.trim(),
          body: body.trim(),
          created_at: new Date().toISOString(),
          created_by: user.uid,
          status: status
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['announcements', companyId] });
      toast.success(variables === 'sent' ? 'Announcement broadcasted!' : 'Announcement scheduled!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create announcement');
    }
  });

  // Delete announcement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', companyId] });
      toast.success('Announcement deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete announcement');
    }
  });

  const handleBroadcast = (status: 'sent' | 'scheduled') => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please enter both title and body.');
      return;
    }
    createMutation.mutate(status);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Announcements</h2>
          <p className="text-gray-500 text-sm">Broadcast updates directly to agent mobile screens.</p>
        </div>
      </div>
      
      <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Header</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Important Team Update" 
              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-brand-500 outline-none font-bold text-gray-900" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Announcement Body</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..." 
              className="w-full px-6 py-4 bg-gray-50 rounded-3xl border-2 border-transparent focus:border-brand-500 outline-none font-medium text-gray-900 h-32 resize-none" 
            />
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => handleBroadcast('sent')}
              disabled={createMutation.isPending || !title.trim() || !body.trim()}
              className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-100 hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Megaphone size={18} /> Broadcast Now
            </button>
            <button 
              onClick={() => handleBroadcast('scheduled')}
              disabled={createMutation.isPending || !title.trim() || !body.trim()}
              className="px-8 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-100 disabled:opacity-50 transition-all"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><CallMindLoader size="md" /></div>
        ) : announcements.length === 0 ? (
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm text-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="text-gray-400" size={24} />
             </div>
             <h3 className="font-bold text-gray-900 mb-1">No announcements yet</h3>
             <p className="text-sm text-gray-500">Broadcast your first message to the team.</p>
          </div>
        ) : (
          announcements.slice(0, 10).map((a) => (
            <div key={a.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-start gap-4 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 justify-between mb-2">
                  <h3 className="font-bold text-gray-900 truncate">{a.title}</h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 ${a.is_published ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                      {a.is_published ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {a.is_published ? 'Published' : 'Draft'}
                    </span>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                      {a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{a.content}</p>
              </div>
              <button 
                onClick={() => handleDelete(a.id)}
                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
