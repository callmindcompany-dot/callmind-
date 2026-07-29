import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface UnsyncedCallLog {
  id: string;
  leadId: string;
  phone: string;
  duration: number; // in seconds
  outcome: string;
  interestLevel: string;
  notes: string;
  callbackDate?: string;
  timestamp: string;
}

const UNSYNCED_LOGS_KEY = '@callmind_unsynced_calls';

export const syncService = {
  /**
   * Save a call feedback log to local offline queue
   */
  async saveOfflineLog(log: Omit<UnsyncedCallLog, 'id' | 'timestamp'>): Promise<UnsyncedCallLog> {
    const newLog: UnsyncedCallLog = {
      ...log,
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };

    try {
      const existingStr = await AsyncStorage.getItem(UNSYNCED_LOGS_KEY);
      const existing: UnsyncedCallLog[] = existingStr ? JSON.parse(existingStr) : [];
      existing.push(newLog);
      await AsyncStorage.setItem(UNSYNCED_LOGS_KEY, JSON.stringify(existing));
      console.log('[SyncService] Saved call log to offline queue:', newLog.id);
    } catch (err) {
      console.error('[SyncService] Failed to save offline log:', err);
    }

    return newLog;
  },

  /**
   * Get all pending unsynced call logs count
   */
  async getPendingCount(): Promise<number> {
    try {
      const existingStr = await AsyncStorage.getItem(UNSYNCED_LOGS_KEY);
      const existing: UnsyncedCallLog[] = existingStr ? JSON.parse(existingStr) : [];
      return existing.length;
    } catch (err) {
      return 0;
    }
  },

  /**
   * Sync all pending logs to Supabase database
   */
  async syncPendingLogs(): Promise<{ successCount: number; errorCount: number }> {
    try {
      const existingStr = await AsyncStorage.getItem(UNSYNCED_LOGS_KEY);
      const existing: UnsyncedCallLog[] = existingStr ? JSON.parse(existingStr) : [];

      if (existing.length === 0) {
        return { successCount: 0, errorCount: 0 };
      }

      let successCount = 0;
      let errorCount = 0;
      const remaining: UnsyncedCallLog[] = [];

      for (const log of existing) {
        try {
          const { error } = await supabase.from('calls').insert({
            lead_id: log.leadId,
            phone: log.phone,
            duration: log.duration,
            status: log.outcome,
            ai_summary: log.notes,
            created_at: log.timestamp,
          });

          if (error) throw error;
          successCount++;
        } catch (err) {
          console.warn('[SyncService] Failed syncing single log:', log.id, err);
          errorCount++;
          remaining.push(log);
        }
      }

      // Update remaining unsynced queue
      await AsyncStorage.setItem(UNSYNCED_LOGS_KEY, JSON.stringify(remaining));

      return { successCount, errorCount };
    } catch (err) {
      console.error('[SyncService] Sync operation failed:', err);
      return { successCount: 0, errorCount: 0 };
    }
  },

  /**
   * Clear queue manually
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(UNSYNCED_LOGS_KEY);
  },
};
