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

      const logEntry = {
        company_id: companyId || null,
        action: params.action,
        actor_id: user.id,
        actor_email: user.email || 'unknown',
        details: params.details ? JSON.stringify(params.details) : null,
        timestamp: new Date().toISOString()
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
