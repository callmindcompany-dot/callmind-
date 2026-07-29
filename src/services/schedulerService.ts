import { supabase } from '../supabaseClient';
import { AuditService } from './audit.service';

export type CallOutcome = 'No Answer' | 'Busy' | 'Switched Off' | 'Answered' | 'Wrong Number';

export const schedulerService = {
  /**
   * Calculates the next callback time based on the call outcome.
   */
  calculateNextRetryTime: (outcome: CallOutcome): Date | null => {
    const now = new Date();
    
    switch (outcome) {
      case 'No Answer':
        // Auto-schedule callback in 2 hours
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      case 'Busy':
        // Auto-schedule callback in 30 minutes
        return new Date(now.getTime() + 30 * 60 * 1000);
      
      case 'Switched Off':
        // Auto-schedule for next day at 10:00 AM
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        return tomorrow;
      
      default:
        return null;
    }
  },

  /**
   * Records a call outcome and schedules a retry if necessary.
   */
  processCallOutcome: async (leadId: string, leadName: string, outcome: CallOutcome, agentEmail: string, companyId?: string) => {
    if (!leadName) {
      throw new Error('[schedulerService] Lead name is required.');
    }
    const safeCompanyId = companyId || 'unknown';
    const nextRetry = schedulerService.calculateNextRetryTime(outcome);
    
    let leadPhone = '+91 99999 99999';
    let activeAgentId = '';

    // Fetch active session user details for agent ID
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      activeAgentId = session.user.id;
    }

    // Resolve Agent ID from email if possible
    if (agentEmail) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('email', agentEmail.toLowerCase().trim())
        .maybeSingle();
      if (userRecord) {
        activeAgentId = userRecord.id;
      }
    }

    if (leadId && leadId !== 'sim_lead_123') {
      try {
        // Fetch phone and update lead status
        const { data: leadData } = await supabase
          .from('leads')
          .select('phone')
          .eq('id', leadId)
          .eq('company_id', safeCompanyId)
          .maybeSingle();

        if (leadData) {
          leadPhone = leadData.phone || leadPhone;
          
          let leadStatus = 'Call Back';
          if (outcome === 'Answered') {
            leadStatus = 'Contacted';
          } else if (outcome === 'Wrong Number') {
            leadStatus = 'Rejected';
          }
          
          await supabase
            .from('leads')
            .update({
              status: leadStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', leadId)
            .eq('company_id', safeCompanyId);
        }
      } catch (err) {
        console.warn(`[schedulerService] Failed to update lead status for leadId ${leadId}:`, err);
      }
    }

    // Log the call in calls table
    if (activeAgentId) {
      try {
        await supabase.from('calls').insert([{
          company_id: safeCompanyId,
          lead_id: leadId !== 'sim_lead_123' ? leadId : null,
          agent_id: activeAgentId,
          phone: leadPhone,
          duration: outcome === 'Answered' ? 105 : 0, // 1m 45s = 105s
          notes: `Processed by virtual scheduler engine under outcome: ${outcome}.`,
          ai_summary: `Processed by virtual scheduler engine under outcome: ${outcome}.`
        }]);
      } catch (err) {
        console.error('[schedulerService] Failed to insert call log:', err);
      }
    }

    // If a retry is needed, schedule it in callbacks table
    if (nextRetry && activeAgentId && leadId && leadId !== 'sim_lead_123') {
      try {
        await supabase.from('callbacks').insert([{
          company_id: safeCompanyId,
          lead_id: leadId,
          agent_id: activeAgentId,
          callback_time: nextRetry.toISOString(),
          notes: `Auto-scheduled callback for outcome: ${outcome}`,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

        // Log audit event
        await AuditService.logEvent({
          action: 'scheduler.retry.scheduled',
          targetId: leadId,
          targetType: 'lead',
          details: {
            leadName,
            outcome,
            scheduledTime: nextRetry.toLocaleString(),
            module: 'Scheduler'
          }
        });
      } catch (err) {
        console.error('[schedulerService] Failed to schedule callback:', err);
      }
    }

    return nextRetry;
  }
};
