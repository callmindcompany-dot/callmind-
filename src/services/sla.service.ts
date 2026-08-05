import { supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import { CompanySlaSettings, SlaSummary } from '../types/lead';
import { logger } from '../lib/logger';
import { NotificationService } from './notification.service';

export class SlaService {
  /**
   * Get SLA settings for a company, returning defaults if not yet configured
   */
  static async getCompanySlaSettings(companyId: string): Promise<CompanySlaSettings> {
    const defaultSettings: CompanySlaSettings = {
      companyId,
      newLeadResponseTimeMins: 15,
      overdueCallbackBufferMins: 30,
      staleLeadThresholdDays: 7,
      autoReassignEnabled: true,
      reassignRotationMode: 'round_robin',
      excludedStatuses: ['Converted', 'Lost', 'Not Interested'],
    };

    if (isPlaceholder || !companyId) {
      return defaultSettings;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('company_sla_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error || !data) {
        return defaultSettings;
      }

      return {
        companyId: data.company_id,
        newLeadResponseTimeMins: data.new_lead_response_time_mins ?? 15,
        overdueCallbackBufferMins: data.overdue_callback_buffer_mins ?? 30,
        staleLeadThresholdDays: data.stale_lead_threshold_days ?? 7,
        autoReassignEnabled: data.auto_reassign_enabled ?? true,
        reassignRotationMode: data.reassign_rotation_mode ?? 'round_robin',
        excludedStatuses: data.excluded_statuses ?? ['Converted', 'Lost', 'Not Interested'],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err) {
      logger.error(`[SlaService.getCompanySlaSettings Error for ${companyId}]:`, err);
      return defaultSettings;
    }
  }

  /**
   * Update company SLA settings (Admin / Founder only)
   */
  static async updateCompanySlaSettings(
    companyId: string,
    updates: Partial<CompanySlaSettings>
  ): Promise<CompanySlaSettings> {
    if (isPlaceholder || !companyId) {
      throw new Error('Database is in placeholder mode');
    }

    const payload = {
      company_id: companyId,
      new_lead_response_time_mins: updates.newLeadResponseTimeMins,
      overdue_callback_buffer_mins: updates.overdueCallbackBufferMins,
      stale_lead_threshold_days: updates.staleLeadThresholdDays,
      auto_reassign_enabled: updates.autoReassignEnabled,
      reassign_rotation_mode: updates.reassignRotationMode,
      excluded_statuses: updates.excludedStatuses,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('company_sla_settings')
      .upsert(payload, { onConflict: 'company_id' })
      .select()
      .single();

    if (error) {
      logger.error(`[SlaService.updateCompanySlaSettings Error]:`, error);
      throw new Error(`Failed to update SLA settings: ${error.message}`);
    }

    return {
      companyId: data.company_id,
      newLeadResponseTimeMins: data.new_lead_response_time_mins,
      overdueCallbackBufferMins: data.overdue_callback_buffer_mins,
      staleLeadThresholdDays: data.stale_lead_threshold_days,
      autoReassignEnabled: data.auto_reassign_enabled,
      reassignRotationMode: data.reassign_rotation_mode,
      excludedStatuses: data.excluded_statuses,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Evaluate SLA breaches for a company and perform auto-reassignment or admin alerts
   */
  static async processCompanySlaBreaches(companyId: string): Promise<{
    evaluatedCount: number;
    breachedCount: number;
    reassignedCount: number;
    alertedCount: number;
  }> {
    if (isPlaceholder || !companyId) {
      return { evaluatedCount: 0, breachedCount: 0, reassignedCount: 0, alertedCount: 0 };
    }

    const settings = await this.getCompanySlaSettings(companyId);
    const now = new Date();

    // 1. Fetch active leads for this company that are not deleted or excluded
    const { data: leads, error: leadsErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .or('is_deleted.is.null,is_deleted.eq.false');

    if (leadsErr || !leads) {
      logger.error(`[SlaService.processCompanySlaBreaches Leads Fetch Error]:`, leadsErr);
      return { evaluatedCount: 0, breachedCount: 0, reassignedCount: 0, alertedCount: 0 };
    }

    // 2. Fetch eligible active agents for round-robin rotation
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, company_id')
      .eq('company_id', companyId);

    const eligibleAgents = (users || []).filter(u => u.role !== 'founder');
    if (eligibleAgents.length === 0) {
      return { evaluatedCount: leads.length, breachedCount: 0, reassignedCount: 0, alertedCount: 0 };
    }

    let breachedCount = 0;
    let reassignedCount = 0;
    let alertedCount = 0;
    let rotationIndex = 0;

    for (const lead of leads) {
      // Check exclusion conditions
      if (
        lead.is_locked ||
        lead.is_manually_protected ||
        settings.excludedStatuses.includes(lead.status)
      ) {
        continue;
      }

      const createdAt = new Date(lead.created_at || lead.createdAt);
      const firstContactAt = lead.first_contact_at ? new Date(lead.first_contact_at) : null;
      const callbackDeadline = lead.callback_deadline ? new Date(lead.callback_deadline) : null;

      let isBreached = false;
      let breachReason = '';

      // Check 1: New Lead Response Time Breach
      if (!firstContactAt) {
        const minsSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        if (minsSinceCreation > settings.newLeadResponseTimeMins) {
          isBreached = true;
          breachReason = `New lead uncontacted for > ${settings.newLeadResponseTimeMins} mins`;
        }
      }

      // Check 2: Overdue Callback Breach
      if (!isBreached && callbackDeadline) {
        const minsOverdue = (now.getTime() - callbackDeadline.getTime()) / (1000 * 60);
        if (minsOverdue > settings.overdueCallbackBufferMins) {
          isBreached = true;
          breachReason = `Callback deadline overdue by > ${settings.overdueCallbackBufferMins} mins`;
        }
      }

      if (!isBreached) continue;

      breachedCount++;

      // Update lead SLA breach status
      await supabaseAdmin
        .from('leads')
        .update({
          sla_breached: true,
          sla_breached_at: lead.sla_breached_at || now.toISOString(),
        })
        .eq('id', lead.id);

      const currentAgentId = lead.assigned_to || lead.assignedTo;

      // Handle Reassignment ("YES" = Auto-Reassign, "NO" = Admin Alert Only)
      if (settings.autoReassignEnabled) {
        // Pick next eligible agent (excluding current agent if multiple exist)
        let candidateAgents = eligibleAgents.filter(a => a.id !== currentAgentId);
        if (candidateAgents.length === 0) candidateAgents = eligibleAgents;

        const nextAgent = candidateAgents[rotationIndex % candidateAgents.length];
        rotationIndex++;

        // Reassign lead
        await supabaseAdmin
          .from('leads')
          .update({
            assigned_to: nextAgent.id,
            reassignment_count: (lead.reassignment_count || 0) + 1,
            updated_at: now.toISOString(),
          })
          .eq('id', lead.id);

        reassignedCount++;

        // DUAL NOTIFICATIONS:
        // A. Send notification to Previous Agent
        if (currentAgentId) {
          await NotificationService.createNotification({
            userId: currentAgentId,
            companyId,
            title: 'Lead SLA Reassignment Notice',
            body: `Lead ${lead.name || 'Client'} has been reassigned from you due to response SLA breach (${breachReason}).`,
            type: 'system_alert',
            priority: 'high',
          });
        }

        // B. Send notification to New Agent
        await NotificationService.createNotification({
          userId: nextAgent.id,
          companyId,
          title: 'New Lead Reassigned (SLA)',
          body: `New Lead ${lead.name || 'Client'} has been reassigned to you. Please call immediately!`,
          type: 'lead_assigned',
          priority: 'high',
        });

        // Record Audit Log
        await supabaseAdmin.from('audit_logs').insert([{
          company_id: companyId,
          user_id: 'system_sla',
          user_email: 'sla-engine@callmind.app',
          action: 'sla_auto_reassign',
          target_resource: 'leads',
          target_id: lead.id,
          details: {
            leadName: lead.name,
            fromUserId: currentAgentId,
            toUserId: nextAgent.id,
            reason: breachReason,
          },
          created_at: now.toISOString(),
        }]);

      } else {
        // "NO" setting: Send urgent SLA Breach Alert to Company Admins/Founders
        alertedCount++;

        const admins = (users || []).filter(u => u.role === 'admin' || u.role === 'founder');
        for (const admin of admins) {
          await NotificationService.createNotification({
            userId: admin.id,
            companyId,
            title: '🚨 SLA Breach Urgent Alert',
            body: `Lead ${lead.name || 'Client'} assigned to agent is overdue (${breachReason}). Manual reassignment required!`,
            type: 'system_alert',
            priority: 'urgent',
          });
        }
      }
    }

    return {
      evaluatedCount: leads.length,
      breachedCount,
      reassignedCount,
      alertedCount,
    };
  }

  /**
   * Get SLA Dashboard Widget metrics summary
   */
  static async getSlaSummary(companyId: string): Promise<SlaSummary> {
    if (isPlaceholder || !companyId) {
      return {
        activeBreachesCount: 0,
        staleLeadsCount: 0,
        firstResponseComplianceRatePct: 100,
        autoReassignEnabled: true,
        recentReassignments: [],
      };
    }

    const settings = await this.getCompanySlaSettings(companyId);
    const now = new Date();
    const staleDate = new Date(now.getTime() - settings.staleLeadThresholdDays * 24 * 60 * 60 * 1000);

    // Active breaches count
    const { count: activeBreachesCount } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('sla_breached', true);

    // Stale leads count (no contact or update in staleLeadThresholdDays)
    const { count: staleLeadsCount } = await supabaseAdmin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .lt('created_at', staleDate.toISOString())
      .is('first_contact_at', null);

    // First Response Compliance %
    const { data: totalLeads } = await supabaseAdmin
      .from('leads')
      .select('id, first_contact_at, created_at, sla_breached')
      .eq('company_id', companyId)
      .limit(200);

    let compliancePct = 100;
    if (totalLeads && totalLeads.length > 0) {
      const compliantLeads = totalLeads.filter(l => !l.sla_breached);
      compliancePct = Math.round((compliantLeads.length / totalLeads.length) * 100);
    }

    // Recent Auto-Reassignments from audit_logs
    const { data: auditLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .eq('action', 'sla_auto_reassign')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentReassignments = (auditLogs || []).map(log => ({
      id: log.id,
      leadId: log.target_id,
      leadName: log.details?.leadName || 'Lead',
      fromUserId: log.details?.fromUserId || 'Unassigned',
      toUserId: log.details?.toUserId || 'Agent',
      timestamp: log.created_at,
      reason: log.details?.reason || 'SLA Response Breach',
    }));

    return {
      activeBreachesCount: activeBreachesCount || 0,
      staleLeadsCount: staleLeadsCount || 0,
      firstResponseComplianceRatePct: compliancePct,
      autoReassignEnabled: settings.autoReassignEnabled,
      recentReassignments,
    };
  }
}
