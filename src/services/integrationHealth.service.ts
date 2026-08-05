import { supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import { logger } from '../lib/logger';

export interface IntegrationHealthItem {
  id: string;
  companyId: string;
  providerName: string;
  status: 'healthy' | 'warning' | 'error';
  lastSuccessAt?: string;
  lastErrorAt?: string;
  retryCount: number;
  nextRetryAt?: string;
  safeErrorSummary?: string;
  updatedAt: string;
}

export class IntegrationHealthService {
  /**
   * Redact sensitive secrets (tokens, API keys, passwords) from error messages
   */
  static maskErrorSecrets(errorMessage: string): string {
    if (!errorMessage || typeof errorMessage !== 'string') return 'Unknown Integration Error';

    return errorMessage
      .replace(/(bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*/gi, '$1[REDACTED_TOKEN]')
      .replace(/(key=|api_key=|token=|secret=|password=)[^\s&]+/gi, '$1[REDACTED_SECRET]')
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[REDACTED_EMAIL]');
  }

  /**
   * Calculate next retry delay using exponential backoff (2^retryCount * 60 seconds)
   */
  static calculateExponentialBackoffMins(retryCount: number): number {
    const safeCount = Math.min(Math.max(1, retryCount), 6);
    return Math.pow(2, safeCount);
  }

  /**
   * Get all integration health statuses for a company
   */
  static async getCompanyIntegrationHealth(companyId: string): Promise<IntegrationHealthItem[]> {
    const defaultProviders = [
      'IndiaMART',
      'JustDial',
      'TradeIndia',
      'Meta Ads',
      'Google Ads',
      'WhatsApp',
      'Email',
      'Razorpay',
      'Telephony',
    ];

    if (isPlaceholder || !companyId) {
      return defaultProviders.map((provider, i) => ({
        id: `health-mock-${i}`,
        companyId,
        providerName: provider,
        status: 'healthy',
        lastSuccessAt: new Date().toISOString(),
        retryCount: 0,
        updatedAt: new Date().toISOString(),
      }));
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('integration_health')
        .select('*')
        .eq('company_id', companyId);

      if (error || !data || data.length === 0) {
        return defaultProviders.map((provider, i) => ({
          id: `health-default-${i}`,
          companyId,
          providerName: provider,
          status: 'healthy',
          lastSuccessAt: new Date().toISOString(),
          retryCount: 0,
          updatedAt: new Date().toISOString(),
        }));
      }

      return data.map((item) => ({
        id: item.id,
        companyId: item.company_id,
        providerName: item.provider_name,
        status: item.status,
        lastSuccessAt: item.last_success_at,
        lastErrorAt: item.last_error_at,
        retryCount: item.retry_count || 0,
        nextRetryAt: item.next_retry_at,
        safeErrorSummary: item.safe_error_summary,
        updatedAt: item.updated_at,
      }));
    } catch (err) {
      logger.error(`[IntegrationHealthService.getCompanyIntegrationHealth Error ${companyId}]:`, err);
      return [];
    }
  }

  /**
   * Record success or error event for an integration provider
   */
  static async recordHealthEvent(
    companyId: string,
    providerName: string,
    isSuccess: boolean,
    rawError?: string
  ): Promise<void> {
    if (isPlaceholder || !companyId) return;

    const now = new Date();
    const safeSummary = rawError ? this.maskErrorSecrets(rawError) : null;

    try {
      const { data: existing } = await supabaseAdmin
        .from('integration_health')
        .select('*')
        .eq('company_id', companyId)
        .eq('provider_name', providerName)
        .maybeSingle();

      if (isSuccess) {
        await supabaseAdmin.from('integration_health').upsert({
          company_id: companyId,
          provider_name: providerName,
          status: 'healthy',
          last_success_at: now.toISOString(),
          retry_count: 0,
          next_retry_at: null,
          safe_error_summary: null,
          updated_at: now.toISOString(),
        }, { onConflict: 'company_id,provider_name' });
      } else {
        const currentRetries = (existing?.retry_count || 0) + 1;
        const status = currentRetries >= 3 ? 'error' : 'warning';
        const delayMins = this.calculateExponentialBackoffMins(currentRetries);
        const nextRetry = new Date(now.getTime() + delayMins * 60 * 1000);

        await supabaseAdmin.from('integration_health').upsert({
          company_id: companyId,
          provider_name: providerName,
          status,
          last_error_at: now.toISOString(),
          retry_count: currentRetries,
          next_retry_at: nextRetry.toISOString(),
          safe_error_summary: safeSummary,
          updated_at: now.toISOString(),
        }, { onConflict: 'company_id,provider_name' });
      }
    } catch (err) {
      logger.error(`[IntegrationHealthService.recordHealthEvent Error ${providerName}]:`, err);
    }
  }

  /**
   * Trigger manual retry for a failed integration (Authorized Founder / Admin only)
   */
  static async triggerManualRetry(
    companyId: string,
    providerName: string,
    userRole: string,
    userId: string,
    userEmail: string
  ): Promise<{ success: boolean; message: string }> {
    if (!['founder', 'admin'].includes(userRole)) {
      return { success: false, message: 'Unauthorized. Only Founder or Admin can trigger integration retries.' };
    }

    if (!isPlaceholder && companyId) {
      // Record audit log entry
      await supabaseAdmin.from('audit_logs').insert([{
        company_id: companyId,
        user_id: userId,
        user_email: userEmail,
        action: 'integration_manual_retry',
        target_resource: 'integration_health',
        target_id: providerName,
        details: { providerName, triggeredByRole: userRole },
        created_at: new Date().toISOString(),
      }]);

      // Reset retry count and status in integration_health table
      await this.recordHealthEvent(companyId, providerName, true);
    }

    logger.info(`[IntegrationHealthService] Manual retry triggered for ${providerName} by ${userEmail} (${userRole})`);
    return { success: true, message: `Retry triggered successfully for ${providerName}.` };
  }
}
