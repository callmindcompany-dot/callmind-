import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import toast from 'react-hot-toast';

export type NotificationType =
  | 'lead_assigned'
  | 'lead_updated'
  | 'followup_reminder'
  | 'meeting_reminder'
  | 'task_reminder'
  | 'approval_required'
  | 'approval_completed'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'payment_received'
  | 'invoice_generated'
  | 'ticket_assigned'
  | 'ticket_escalated'
  | 'renewal_reminder'
  | 'mention'
  | 'system_alert';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationItem {
  id: string;
  company_id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  action_url?: string;
  metadata?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  is_archived: boolean;
  archived_at?: string;
  is_pinned: boolean;
  pinned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UseNotificationsParams {
  category?: 'all' | 'unread' | 'leads' | 'calls' | 'payments' | 'tasks' | 'system';
  priority?: NotificationPriority;
  search?: string;
  isArchived?: boolean;
  limit?: number;
}

export function useNotifications(params: UseNotificationsParams = {}) {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const limit = params.limit || 20;

  const currentUserId = user?.id || user?.uid;

  // 1. Fetch Notifications Query
  const notificationsQuery = useQuery({
    queryKey: ['notifications', companyId, currentUserId, params.category, params.priority, params.search, params.isArchived, page, limit],
    queryFn: async () => {
      if (!currentUserId || !companyId) return { notifications: [], totalCount: 0, hasMore: false };

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const searchParams = new URLSearchParams();
      if (params.category) searchParams.set('category', params.category);
      if (params.priority) searchParams.set('priority', params.priority);
      if (params.search) searchParams.set('search', params.search);
      if (params.isArchived !== undefined) searchParams.set('isArchived', String(params.isArchived));
      searchParams.set('limit', String(limit));
      searchParams.set('offset', String(page * limit));

      const res = await fetch(`/api/notifications?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to fetch notifications.');
      }

      const json = await res.json();
      return {
        notifications: (json.notifications || []) as NotificationItem[],
        totalCount: json.totalCount || 0,
        hasMore: json.hasMore || false
      };
    },
    enabled: !!currentUserId && !!companyId,
    staleTime: 10000,
  });

  // 2. Fetch Unread Count Query (for Header Badge)
  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread_count', companyId, currentUserId],
    queryFn: async () => {
      if (!currentUserId || !companyId) return 0;
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) return 0;
      const json = await res.json();
      return json.unreadCount || 0;
    },
    enabled: !!currentUserId && !!companyId,
    refetchInterval: 30000, // Periodic backup refetch
  });

  // 3. Supabase Realtime Subscription for Instant Live Notifications
  useEffect(() => {
    if (!currentUserId || !companyId) return;

    const channel = supabase
      .channel(`notifications:user:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`
        },
        (payload) => {
          logger_client('Realtime Notification Event received:', payload);

          // Toast alert for newly inserted notifications
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as NotificationItem;
            if (newNotif.priority === 'urgent' || newNotif.priority === 'high') {
              toast(`🔔 ${newNotif.title}: ${newNotif.body}`, { duration: 5000 });
            }
          }

          // Invalidate React Query cache for instant UI re-render
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, companyId, queryClient]);

  // Helper log for client
  function logger_client(msg: string, data: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(msg, data);
    }
  }

  // 4. Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!res.ok) throw new Error('Failed to mark read.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to mark all read.');
      return res.json();
    },
    onSuccess: () => {
      toast.success('All notifications marked as read.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const togglePinMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`/api/notifications/${notificationId}/pin`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Failed to toggle pin.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/notifications/archive', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!res.ok) throw new Error('Failed to archive.');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Notification archived.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!res.ok) throw new Error('Failed to delete.');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Notification deleted.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return {
    notifications: notificationsQuery.data?.notifications || [],
    totalCount: notificationsQuery.data?.totalCount || 0,
    unreadCount: unreadCountQuery.data || 0,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    hasMore: notificationsQuery.data?.hasMore || false,
    page,
    setPage,
    loadNextPage: () => setPage(p => p + 1),
    loadPrevPage: () => setPage(p => Math.max(0, p - 1)),
    markAsRead: (ids: string[]) => markAsReadMutation.mutate(ids),
    markAllAsRead: () => markAllAsReadMutation.mutate(),
    togglePin: (id: string) => togglePinMutation.mutate(id),
    archive: (ids: string[]) => archiveMutation.mutate(ids),
    deleteNotifications: (ids: string[]) => deleteMutation.mutate(ids),
    refetch: () => notificationsQuery.refetch()
  };
}
