import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface UnsyncedCallLog {
  id: string;
  companyId: string;
  agentId: string;
  leadId?: string;
  leadName?: string;
  phone: string;
  duration: string;
  outcome: string;
  interest: string;
  notes: string;
  callbackDate?: string;
  timestamp: string;
}

const UNSYNCED_LOGS_KEY = '@callmind_unsynced_calls';

export const syncService = {
  /**
   * Queue a call log locally in AsyncStorage when offline or when network request fails
   */
  async queueCallLog(log: Omit<UnsyncedCallLog, 'id' | 'timestamp'>): Promise<UnsyncedCallLog> {
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
      console.log('[SyncService] Queued call log to local offline queue:', newLog.id);
    } catch (err) {
      console.error('[SyncService] Failed to queue offline log:', err);
    }

    return newLog;
  },

  /**
   * Get total count of unsynced call logs currently in queue
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
   * Sync all pending logs from AsyncStorage to Supabase `calls` table
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
          if (!log.companyId) {
            console.error('[SyncService] Cannot sync log missing companyId:', log);
            errorCount++;
            continue;
          }

          const { error } = await supabase.from('calls').insert({
            company_id: log.companyId,
            agent_id: log.agentId,
            created_by: log.agentId,
            lead_id: log.leadId || null,
            lead_name: log.leadName || null,
            phone: log.phone,
            duration: log.duration,
            notes: log.notes || null,
            status: 'completed',
            type: 'outgoing',
            outcome: log.outcome,
            interest: log.interest,
            idempotency_key: log.id,
            created_at: log.timestamp,
            timestamp: log.timestamp,
          });

          if (error) {
            // Postgres 23505 = unique_violation (idempotency key already inserted on server)
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
              console.log('[SyncService] Record already synced to server (idempotent duplicate):', log.id);
              successCount++;
              continue;
            }
            console.error('[SyncService] Supabase insert error:', error);
            throw error;
          }

          successCount++;
          console.log('[SyncService] Successfully synced log:', log.id);
        } catch (err) {
          console.warn('[SyncService] Failed syncing single log:', log.id, err);
          errorCount++;
          remaining.push(log);
        }
      }

      // Save remaining unsynced items back to storage
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
