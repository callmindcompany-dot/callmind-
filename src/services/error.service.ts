import { supabase } from '../supabaseClient';
import { AuditService } from './audit.service';

/**
 * Service to handle application-wide error reporting.
 */
export const ErrorService = {
  /**
   * Reports a component error to Supabase for developer review.
   */
  reportError: async (error: Error, componentStack: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const errorData = {
        message: error.message,
        stack: error.stack,
        component_stack: componentStack,
        timestamp: new Date().toISOString(),
        user_id: user?.id || 'anonymous',
        user_email: user?.email || 'unknown',
        user_agent: navigator.userAgent,
        url: window.location.href,
        type: 'runtime_exception'
      };

      // 1. Write to centralized system_errors table in Supabase
      const { error: insertError } = await supabase
        .from('system_errors')
        .insert([errorData]);

      if (insertError) throw insertError;

      // 2. Also log as a high-priority audit event if possible
      await AuditService.logEvent({
        action: 'system.error_reported',
        targetId: 'system',
        targetType: 'system',
        details: {
          errorMessage: error.message,
          severity: 'high'
        }
      });

      return true;
    } catch (err) {
      console.error('[ErrorService] Failed to report error:', err);
      return false;
    }
  }
};
