import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Announcement, AnnouncementRead } from '@/types/announcements';

// 1. Fetch Company Announcements
export function useAnnouncements(companyId: string | null) {
  return useQuery<Announcement[]>({
    queryKey: ['announcements', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('company_id', companyId)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed default announcements
        const defaultPosts = [
          {
            company_id: companyId,
            title: 'New AI Voice Features Released!',
            content: 'We have successfully launched our new low-latency neural speech voice models in standard regional accents. Train them now in Founders Lab.',
            category: 'Product',
            target_role: 'all',
            is_pinned: true,
            is_published: true,
            scheduled_at: null as string | null
          },
          {
            company_id: companyId,
            title: 'Scheduled System Database Migration',
            content: 'The platform servers will undergo structural database optimizations this Sunday at 2:00 AM. Expect temporary latency spikes for up to 15 minutes.',
            category: 'Maintenance',
            target_role: 'all',
            is_pinned: false,
            is_published: true,
            scheduled_at: null
          },
          {
            company_id: companyId,
            title: 'Sales Team Targets Reached!',
            content: 'Inbound CRM lead conversion rates are up 20% compared to last quarter! Excellent work team, let\'s keep this momentum going.',
            category: 'Team',
            target_role: 'all',
            is_pinned: false,
            is_published: true,
            scheduled_at: null
          }
        ];

        const { error: seedError } = await supabase.from('announcements').insert(defaultPosts);
        if (seedError) throw seedError;

        const { data: refetched } = await supabase
          .from('announcements')
          .select('*')
          .eq('company_id', companyId)
          .order('is_pinned', { ascending: false })
          .order('published_at', { ascending: false });

        return (refetched || []) as Announcement[];
      }

      return data as Announcement[];
    },
    enabled: !!companyId
  });
}

// 2. Fetch User Read logs
export function useUserReadAnnouncements(userId: string | null) {
  return useQuery<string[]>({
    queryKey: ['announcement_reads_user', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map(r => r.announcement_id);
    },
    enabled: !!userId
  });
}

// 3. Mark Announcement as Read
export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ announcementId, userId }: { announcementId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('announcement_reads')
        .upsert({ announcement_id: announcementId, user_id: userId, read_at: new Date().toISOString() }, {
          onConflict: 'announcement_id,user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcement_reads_user', data.user_id] });
      queryClient.invalidateQueries({ queryKey: ['announcement_reads_stats'] });
    }
  });
}

// 4. Fetch Seen counts metrics (seen stats aggregated)
export function useAnnouncementSeenStats() {
  return useQuery<Record<string, number>>({
    queryKey: ['announcement_reads_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('announcement_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(r => {
        counts[r.announcement_id] = (counts[r.announcement_id] || 0) + 1;
      });
      return counts;
    }
  });
}

// 5. CRUD Mutations
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', data.company_id] });
    }
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcement: Partial<Announcement> & { id: string }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(announcement)
        .eq('id', announcement.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', data.company_id] });
    }
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, companyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements', data.companyId] });
    }
  });
}
