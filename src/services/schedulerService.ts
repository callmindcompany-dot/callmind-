import { supabase } from '../supabaseClient';
import { AuditService } from './audit.service';

export type CallOutcome = 'No Answer' | 'Busy' | 'Switched Off' | 'Answered' | 'Wrong Number';

export const schedulerService = {
  /**
   * Calculates the next callback time based on the call outcome.
   *
   * Pure: no database, no clock beyond `now`. The Simulate Outcome panel calls
   * this directly, which is what a simulation should do -- it used to run the
   * whole of processCallOutcome against a fake lead id and leave a real row in
   * the customer's call history.
   */
  calculateNextRetryTime: (outcome: CallOutcome, now: Date = new Date()): Date | null => {
    switch (outcome) {
      case 'No Answer':
        // Auto-schedule callback in 2 hours
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);

      case 'Busy':
        // Auto-schedule callback in 30 minutes
        return new Date(now.getTime() + 30 * 60 * 1000);

      case 'Switched Off': {
        // Auto-schedule for next day at 10:00 AM
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        return tomorrow;
      }

      default:
        return null;
    }
  },

  /**
   * Records a call outcome and schedules a retry if necessary.
   *
   * Every failure below throws. The previous version caught all three writes
   * and logged them, so the retry never being scheduled looked exactly like the
   * retry not being needed -- and the callbacks insert could never have
   * succeeded anyway: it wrote `agent_id` and `callback_time`, and the columns
   * are `assigned_to` and `reminder_date`.
   */
  processCallOutcome: async (
    leadId: string,
    leadName: string,
    outcome: CallOutcome,
    agentEmail: string,
    companyId?: string,
  ): Promise<Date | null> => {
    if (!leadName) {
      throw new Error('[schedulerService] Lead name is required.');
    }
    if (!leadId) {
      throw new Error('[schedulerService] Lead id is required.');
    }
    // Was `companyId || 'unknown'`, which wrote rows into a tenant called
    // "unknown" -- invisible to every company, and now a foreign key violation.
    if (!companyId) {
      throw new Error('[schedulerService] Company id is required.');
    }

    const nextRetry = schedulerService.calculateNextRetryTime(outcome);

    const { data: { session } } = await supabase.auth.getSession();
    let activeAgentId = session?.user?.id ?? '';

    // Resolve the agent from their email where possible, so the call is
    // attributed to the users row rather than the auth uid.
    if (agentEmail) {
      const { data: userRecord, error } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', companyId)
        .eq('email', agentEmail.toLowerCase().trim())
        .maybeSingle();
      if (error) throw error;
      if (userRecord) activeAgentId = userRecord.id;
    }

    if (!activeAgentId) {
      throw new Error('[schedulerService] Could not identify the calling agent.');
    }

    // Fetch the lead, and move its status to match the outcome.
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('phone')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (leadError) throw leadError;
    if (!leadData) {
      throw new Error(`[schedulerService] Lead ${leadId} not found in this company.`);
    }

    // No placeholder. This used to default to '+91 99999 99999' and write that
    // into calls.phone, so a lead with no number produced a call record to a
    // number nobody had dialled.
    const leadPhone = leadData.phone ?? null;

    const leadStatus =
      outcome === 'Answered' ? 'Contacted' :
      outcome === 'Wrong Number' ? 'Rejected' :
      'Call Back';

    const { error: statusError } = await supabase
      .from('leads')
      .update({ status: leadStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId)
      .eq('company_id', companyId);
    if (statusError) throw statusError;

    const { error: callError } = await supabase.from('calls').insert([{
      company_id: companyId,
      lead_id: leadId,
      agent_id: activeAgentId,
      phone: leadPhone,
      // Duration is not known here. It used to be written as 105 for an
      // answered call -- a 1m45s conversation that never happened, and as a
      // number, when the column is TEXT in the "Xm Ys" shape CallsPage parses.
      duration: null,
      outcome,
      notes: `Outcome recorded by the scheduler: ${outcome}.`,
      timestamp: new Date().toISOString(),
    }]);
    if (callError) throw callError;

    if (nextRetry) {
      // assigned_to and reminder_date are the real column names, and 'Pending'
      // is the capitalisation the status CHECK and every UI filter use. The
      // previous insert used agent_id/callback_time/'pending' and so failed on
      // all three counts.
      const { error: callbackError } = await supabase.from('callbacks').insert([{
        company_id: companyId,
        lead_id: leadId,
        assigned_to: agentEmail || null,
        reminder_date: nextRetry.toISOString(),
        notes: `Auto-scheduled callback for outcome: ${outcome}`,
        status: 'Pending',
      }]);
      if (callbackError) throw callbackError;

      await AuditService.logEvent({
        action: 'scheduler.retry.scheduled',
        targetId: leadId,
        targetType: 'lead',
        details: {
          leadName,
          outcome,
          scheduledTime: nextRetry.toISOString(),
          module: 'Scheduler',
        },
      });
    }

    return nextRetry;
  },
};
