import { supabase } from './supabase';

/**
 * What has actually happened to a lead.
 *
 * LeadDetailScreen used to draw three timeline entries written into the file:
 * a call at 10:30 lasting 02:34 where the lead was "interested", a note at
 * 10:31 reading "Interested in Honda City V model", and a status change at
 * 10:32. Those three appeared under every lead, at those times, for ever --
 * including a lead nobody had called yet.
 *
 * lead_activity_log has been there the whole time. leadService.recordCallOutcome
 * writes to it after every call, and src/routes/leads.ts writes an assignment
 * line, so from now on there is something real to show.
 */

export interface ActivityEntry {
  id: string;
  /** 'status_change' | 'assignment' | 'lead_ingested' | anything a writer uses. */
  type: string;
  description: string;
  at: string;
  fromStatus: string | null;
  toStatus: string | null;
}

export const activityService = {
  /**
   * Newest first.
   *
   * Throws. An empty timeline after a failed query says "nothing has ever
   * happened to this lead", which is a thing an agent would act on -- they
   * would call somebody a colleague spoke to an hour ago.
   */
  async forLead(companyId: string, leadId: string, limit = 20): Promise<ActivityEntry[]> {
    if (!companyId || !leadId) return [];

    const { data, error } = await supabase
      .from('lead_activity_log')
      .select('id, activity_type, description, created_at, from_status, to_status')
      .eq('company_id', companyId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((r) => ({
      id: r.id,
      type: r.activity_type,
      description: r.description,
      at: r.created_at,
      fromStatus: r.from_status,
      toStatus: r.to_status,
    }));
  },
};
