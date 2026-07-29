import { AuditService } from '../services/audit.service';
import { sanitize } from './sanitize';

export interface AuditLog {
  action: string;
  category: 'security' | 'data' | 'config' | 'billing' | 'system';
  target: string;
  targetId?: string;
  details?: any;
  changes?: {
    before: any;
    after: any;
  };
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

export const logActivity = async (payload: Omit<AuditLog, 'companyId' | 'userId' | 'userName' | 'userEmail' | 'userRole' | 'timestamp'> & { companyId?: string }) => {
  try {
    /**
     * MIGRATION NOTICE: 
     * Direct writes to 'audit_logs' are now denied by security rules. 
     * All logging must pass through the server-side Cloud Function to ensure integrity.
     */
    await AuditService.logEvent({
      action: payload.action,
      targetId: payload.targetId || payload.target || 'unknown',
      targetType: payload.category || 'general',
      details: sanitize({
        ...payload.details,
        target: payload.target,
        changes: payload.changes
      })
    });
  } catch (error) {
    console.error('Failed to log activity via service:', error);
  }
};
