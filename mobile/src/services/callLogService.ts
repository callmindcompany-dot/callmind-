import { supabase } from './supabase';
import { CallLogItem } from '../screens/54_CallLogScreen';
import { CallbackItem } from '../screens/CallbacksScreen';

/**
 * Format initials from name
 */
function getInitials(name: string): string {
  if (!name) return 'LD';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Format timestamp into readable time string
 */
function formatTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

/**
 * Format timestamp into date label
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Today';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Today';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return 'Today';
  }
}

export const callLogService = {
  /**
   * Fetch historical call logs from `calls` table
   */
  async fetchCallLogs(companyId: string, userId: string): Promise<CallLogItem[]> {
    if (!companyId || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .eq('agent_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[callLogService] Error fetching calls:', error);
        return [];
      }

      if (!data) return [];

      return data.map((row: any) => {
        const isConnected = row.outcome === 'Connected' || row.status === 'completed';
        const tag = row.outcome || row.interest || 'Completed';
        const tagColor = isConnected ? '#16a34a' : '#d97706';
        const tagBg = isConnected ? '#f0fdf4' : '#fffbeb';

        return {
          id: row.id,
          name: row.lead_name || 'Call Log',
          phone: row.phone || '',
          time: `${formatDate(row.created_at)}, ${formatTime(row.created_at)}`,
          duration: row.duration || '00:00',
          tag,
          tagColor,
          tagBg,
          direction: row.type === 'incoming' ? 'incoming' : 'outgoing',
          initials: getInitials(row.lead_name || 'Call Log'),
          avatarBg: '#eff6ff',
          avatarColor: '#2563eb',
        };
      });
    } catch (err) {
      console.error('[callLogService] Exception in fetchCallLogs:', err);
      return [];
    }
  },

  /**
   * Fetch scheduled callbacks from `calls` and `scheduled_messages`
   */
  async fetchCallbacks(companyId: string, userId: string): Promise<CallbackItem[]> {
    if (!companyId || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .eq('agent_id', userId)
        .or('interest.eq.Call Back Later,outcome.eq.Call Back')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[callLogService] Error fetching callbacks:', error);
        return [];
      }

      if (!data) return [];

      return data.map((row: any) => {
        return {
          id: row.id,
          name: row.lead_name || 'Callback Lead',
          phone: row.phone || '',
          time: `${formatDate(row.created_at)}, ${formatTime(row.created_at)}`,
          note: row.notes || 'Requested follow-up callback.',
          initials: getInitials(row.lead_name || 'Callback Lead'),
          avatarBg: '#fef3c7',
          avatarColor: '#d97706',
          isToday: formatDate(row.created_at) === 'Today',
        };
      });
    } catch (err) {
      console.error('[callLogService] Exception in fetchCallbacks:', err);
      return [];
    }
  },
};
