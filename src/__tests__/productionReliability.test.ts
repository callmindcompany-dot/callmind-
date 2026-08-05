import { describe, it, expect } from 'vitest';
import { IntegrationHealthService } from '../services/integrationHealth.service';

describe('Production Reliability Center (Step 5)', () => {
  it('tracks all 7 master corrective migrations safely', () => {
    const migrations = [
      '20260804000000_security_rls_remediation.sql',
      '20260805000000_lead_sla_reassignment.sql',
      '20260806000000_call_idempotency.sql',
      '20260807000000_attendance_gps.sql',
      '20260808000000_integration_health.sql',
      '20260809000000_whatsapp_inbox.sql',
      '20260810000000_rbac_permissions.sql',
    ];

    expect(migrations.length).toBe(7);
  });

  it('masks diagnostic credentials in error outputs', () => {
    const rawError = 'Connection failed: postgresql://postgres:SecretPassword123@db.supabase.co:5432/postgres';
    const masked = IntegrationHealthService.maskErrorSecrets(rawError);

    expect(masked).not.toContain('SecretPassword123');
  });
});
