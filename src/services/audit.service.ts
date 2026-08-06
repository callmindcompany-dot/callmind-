import { supabase } from '../supabaseClient';

export interface AuditLogParams {
  action: string;
  targetId: string;
  targetType: string;
  details?: Record<string, any>;
}

/**
 * Service to log audit events directly to Supabase audit_logs table.
 */
export const AuditService = {
  /**
   * Logs an event to the server-side audit trail.
   */
  logEvent: async (params: AuditLogParams): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        console.warn('[AuditService] Skipping log: User is not authenticated.');
        return;
      }

      // Fetch companyId from profile in public.users table
      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      const companyId = profile?.company_id;

      if (!companyId) {
        console.warn('[AuditService] Missing companyId. Event might fail validation.');
      }

      // Write both naming schemes. The live table uses user_id/user_email and
      // created_at; this service was written against actor_id/actor_email and
      // timestamp, and useAuditLogs reads user_name and category. Until the
      // call sites converge, every event fills all of them -- a half-written
      // audit row is worse than none, because it looks like a record.
      //
      // `timestamp` is generated from created_at in
      // 20260718_audit_logs_columns.sql, so it is not set here.
      const logEntry = {
        company_id: companyId || null,
        action: params.action,
        category: params.targetType || 'system',
        target: params.targetId || null,
        target_id: params.targetId || null,
        user_id: user.id,
        user_email: user.email || 'unknown',
        user_name: user.user_metadata?.name || user.email || 'unknown',
        actor_id: user.id,
        actor_email: user.email || 'unknown',
        details: params.details ? JSON.stringify(params.details) : null,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([logEntry]);

      if (error) throw error;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AuditLog] ${params.action} recorded safely on Supabase.`);
      }
    } catch (error) {
      console.error('[AuditService] Failed to record audit event:', error);
    }
  }
};
export const logActivity = AuditService.logEvent;
