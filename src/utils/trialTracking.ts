import { supabase } from '../supabaseClient';
import { sanitize } from '@/lib/sanitize';

export type TrialEventType = 
  | "lead_imported" 
  | "ai_draft_sent" 
  | "call_logged" 
  | "teammate_invited" 
  | "feature_viewed" 
  | "upgrade_modal_shown" 
  | "upgrade_clicked" 
  | "extension_requested" 
  | "extension_granted" 
  | "limit_reached" 
  | "day0_checklist_complete";

/**
 * Silent fire-and-forget trial event tracker using Supabase
 */
export const trackTrialEvent = async (
  companyId: string, 
  userId: string, 
  eventType: TrialEventType, 
  eventData: any = {}
) => {
  if (!companyId || !userId) return;

  try {
    await supabase.from('trial_events').insert({
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: userId,
      event_type: eventType,
      event_data: sanitize(eventData),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`[TrialTracking] Failed to track ${eventType}:`, error);
  }
};

/**
 * Aggregates trial stats for a company using Supabase
 */
export const getTrialStats = async (companyId: string) => {
  const { data: allData, error } = await supabase
    .from('trial_events')
    .select('*')
    .eq('company_id', companyId);

  const stats = {
    totalLeadsImported: 0,
    totalAIDrafts: 0,
    totalCallsLogged: 0,
    totalTeammatesInvited: 0,
    checklistCompleted: 0,
    upgradeModalShown: 0,
    upgradeClicked: 0,
    extensionRequested: 0
  };

  if (error || !allData) return stats;

  allData.forEach(row => {
    const data = (row.event_data as any) || {};
    switch (row.event_type) {
      case 'lead_imported':
        stats.totalLeadsImported += (data.leadsCount || 0);
        break;
      case 'ai_draft_sent':
        stats.totalAIDrafts += 1;
        break;
      case 'call_logged':
        stats.totalCallsLogged += 1;
        break;
      case 'teammate_invited':
        stats.totalTeammatesInvited += 1;
        break;
      case 'day0_checklist_complete':
        stats.checklistCompleted += 1;
        break;
      case 'upgrade_modal_shown':
        stats.upgradeModalShown += 1;
        break;
      case 'upgrade_clicked':
        stats.upgradeClicked += 1;
        break;
      case 'extension_requested':
        stats.extensionRequested += 1;
        break;
    }
  });

  return stats;
};

/**
 * Checks if Day 0 Checklist is complete: 10+ leads AND 1+ AI draft
 */
export const hasCompletedDay0Checklist = async (companyId: string) => {
  const stats = await getTrialStats(companyId);
  return stats.totalLeadsImported >= 10 && stats.totalAIDrafts >= 1;
};
