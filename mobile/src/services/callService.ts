import { supabase } from './supabase';
import { syncService, UnsyncedCallLog } from './sync';
import { leadService } from './leadService';
import NetInfo from '@react-native-community/netinfo';

export interface LogCallPayload {
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
}

export const ALLOWED_CALL_OUTCOMES = [
  'Connected',
  'No Answer',
  'Busy',
  'Invalid Number',
  'Wrong Number',
  'Call Back',
];

/**
 * Sanitize and validate phone numbers for native tel: dialing
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // Keep leading +, remove all other non-digits
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null; // Invalid length for phone dialer
  }

  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

export const callService = {
  /**
   * Log a call outcome. Directly inserts into Supabase if online, or queues in AsyncStorage if offline.
   */
  async logCallOutcome(payload: LogCallPayload): Promise<{ success: boolean; queued: boolean; error?: any }> {
    const {
      companyId,
      agentId,
      leadId,
      leadName,
      phone,
      duration,
      outcome,
      interest,
      notes,
    } = payload;

    if (!companyId || !agentId) {
      console.error('[callService] Missing mandatory companyId or agentId:', payload);
      return { success: false, queued: false, error: 'Missing companyId or agentId' };
    }

    // 1. Check network status
    let isConnected = true;
    try {
      const netState = await NetInfo.fetch();
      isConnected = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    } catch {
      // Default to attempting network if NetInfo fails
    }

    const now = new Date().toISOString();

    // 2. If offline, queue immediately
    if (!isConnected) {
      console.log('[callService] Device is offline. Queuing call log.');
      await syncService.queueCallLog({
        companyId,
        agentId,
        leadId,
        leadName,
        phone,
        duration,
        outcome,
        interest,
        notes,
      });
      return { success: true, queued: true };
    }

    // 3. Online attempt: direct Supabase insert
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          company_id: companyId,
          agent_id: agentId,
          created_by: agentId,
          lead_id: leadId || null,
          lead_name: leadName || null,
          phone,
          duration: duration || '00:00',
          notes: notes || null,
          status: 'completed',
          type: 'outgoing',
          outcome,
          interest,
          created_at: now,
          timestamp: now,
        })
        .select()
        .single();

      if (error) {
        console.warn('[callService] Direct Supabase insert failed. Queuing log locally:', error);
        await syncService.queueCallLog({
          companyId,
          agentId,
          leadId,
          leadName,
          phone,
          duration,
          outcome,
          interest,
          notes,
        });
        return { success: true, queued: true };
      }

      console.log('[callService] Call logged successfully to Supabase:', data?.id);

      // The lead's stage is deliberately not written here.
      //
      // It used to be, from four names in this file -- Interested, Call Back,
      // Not Interested, Contacted -- while App.tsx wrote it a second time on
      // the same submit from resolveOutcome's own separate list. Two mappings,
      // two writes, last one wins, and the two did not agree: a Wrong Number
      // was 'Not Interested' here and 'Invalid' there.
      //
      // App.tsx now owns the decision, once, via resolveOutcome + decideStage
      // against the company's own stages.

      return { success: true, queued: false };
    } catch (err) {
      console.error('[callService] Exception logging call. Queuing log locally:', err);
      await syncService.queueCallLog({
        companyId,
        agentId,
        leadId,
        leadName,
        phone,
        duration,
        outcome,
        interest,
        notes,
      });
      return { success: true, queued: true };
    }
  },
};
