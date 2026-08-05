import { supabaseAdmin } from '../lib/dbAdapter';
import { logger } from '../lib/logger';
import { AuditService } from './audit.service';

export interface SearchResultItem {
  id: string;
  module: 'leads' | 'customers' | 'calls' | 'invoices' | 'tasks' | 'tickets' | 'documents' | 'workflows';
  title: string;
  subtitle: string;
  badge?: string;
  actionUrl: string;
  metadata?: Record<string, any>;
  score?: number;
}

export interface GlobalSearchResponse {
  results: SearchResultItem[];
  totalCount: number;
  executionMs: number;
  categories: Record<string, number>;
}

export class SearchService {
  /**
   * Fast Multi-Module Enterprise Search
   * Executed via PostgreSQL RPC with pg_trgm fuzzy matching & strict RBAC filtering.
   */
  static async search(
    companyId: string,
    userId: string,
    userRole: string,
    query: string,
    categories: string[] = ['all'],
    limit: number = 20,
    offset: number = 0
  ): Promise<GlobalSearchResponse> {
    const startTime = Date.now();
    const cleanQuery = (query || '').trim();

    if (!cleanQuery) {
      return { results: [], totalCount: 0, executionMs: 0, categories: {} };
    }

    try {
      // 1. Execute PostgreSQL RPC Function search_global_crm
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('search_global_crm', {
        p_company_id: companyId,
        p_user_id: userId,
        p_user_role: userRole,
        p_query: cleanQuery,
        p_categories: categories,
        p_limit: limit,
        p_offset: offset,
      });

      let results: SearchResultItem[] = [];

      if (!rpcError && Array.isArray(rpcData)) {
        results = rpcData.map((item: any) => ({
          id: item.id,
          module: item.module,
          title: item.title,
          subtitle: item.subtitle,
          badge: item.badge,
          actionUrl: item.action_url,
          metadata: item.metadata,
          score: item.score,
        }));
      } else {
        // Fallback directly to multi-table search if RPC is not yet compiled
        results = await this.fallbackDirectSearch(companyId, userId, userRole, cleanQuery, categories, limit);
      }

      // Compute category breakdown stats
      const categoryCounts: Record<string, number> = {};
      results.forEach((item) => {
        categoryCounts[item.module] = (categoryCounts[item.module] || 0) + 1;
      });

      const executionMs = Date.now() - startTime;

      // Log Search Analytics (Non-blocking async)
      this.logSearchAnalytics(companyId, userId, cleanQuery, results.length, executionMs).catch((): null => null);

      return {
        results,
        totalCount: results.length,
        executionMs,
        categories: categoryCounts,
      };
    } catch (err: any) {
      logger.error('[SearchService] Global search execution error:', err);
      throw err;
    }
  }

  /**
   * Direct Multi-Table Fallback Search
   */
  private static async fallbackDirectSearch(
    companyId: string,
    userId: string,
    userRole: string,
    query: string,
    categories: string[],
    limit: number
  ): Promise<SearchResultItem[]> {
    const results: SearchResultItem[] = [];
    const isAll = categories.includes('all') || categories.length === 0;

    // A. LEADS SEARCH
    if (isAll || categories.includes('leads')) {
      const { data: leads } = await supabaseAdmin
        .from('leads')
        .select('id, name, phone, email, company, status')
        .eq('company_id', companyId)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`)
        .limit(limit);

      if (leads) {
        leads.forEach((l) => {
          results.push({
            id: l.id,
            module: 'leads',
            title: l.name,
            subtitle: `${l.company || ''} ${l.phone || ''} ${l.email || ''}`.trim() || 'Lead Record',
            badge: l.status || 'New',
            actionUrl: `/leads?id=${l.id}`,
            metadata: { phone: l.phone, email: l.email, company: l.company },
          });
        });
      }
    }

    // B. INVOICES SEARCH (STRICT RBAC PROTECTION FOR TELECALLERS)
    if ((isAll || categories.includes('invoices') || categories.includes('financials')) && userRole !== 'telecaller') {
      const { data: invoices } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, amount, status')
        .eq('company_id', companyId)
        .or(`invoice_number.ilike.%${query}%,status.ilike.%${query}%`)
        .limit(limit);

      if (invoices) {
        invoices.forEach((inv) => {
          results.push({
            id: inv.id,
            module: 'invoices',
            title: `Invoice #${inv.invoice_number}`,
            subtitle: `Amount: ₹${inv.amount} | Status: ${inv.status}`,
            badge: inv.status,
            actionUrl: `/billing?invoice=${inv.invoice_number}`,
            metadata: { amount: inv.amount, status: inv.status },
          });
        });
      }
    }

    // C. DOCUMENTS SEARCH (STRICT RBAC PROTECTION FOR TELECALLERS)
    if ((isAll || categories.includes('documents')) && userRole !== 'telecaller') {
      const { data: docs } = await supabaseAdmin
        .from('documents')
        .select('id, file_name, category, status, uploaded_by, created_at, lead_id')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .or(`file_name.ilike.%${query}%,category.ilike.%${query}%,status.ilike.%${query}%,uploaded_by.ilike.%${query}%`)
        .limit(limit);

      if (docs) {
        docs.forEach((doc) => {
          results.push({
            id: doc.id,
            module: 'documents',
            title: doc.file_name,
            subtitle: `Category: ${doc.category} | Status: ${doc.status} | Uploaded by: ${doc.uploaded_by || 'User'}`,
            badge: doc.status,
            actionUrl: `/dashboard/documents?id=${doc.id}`,
            metadata: { category: doc.category, status: doc.status, leadId: doc.lead_id },
          });
        });
      }
    }

    return results;
  }

  /**
   * Fast Auto-Complete Suggestions (5 Top Matches)
   */
  static async getSuggestions(companyId: string, userId: string, userRole: string, query: string) {
    const response = await this.search(companyId, userId, userRole, query, ['all'], 5, 0);
    return response.results.map((r) => ({
      id: r.id,
      title: r.title,
      module: r.module,
      actionUrl: r.actionUrl,
    }));
  }

  /**
   * Save User Recent Search Entry
   */
  static async saveRecentSearch(companyId: string, userId: string, queryText: string, categoryFilter: string = 'all') {
    if (!queryText || queryText.trim().length === 0) return;

    try {
      await supabaseAdmin.from('recent_searches').insert({
        company_id: companyId,
        user_id: userId,
        query_text: queryText.trim(),
        category_filter: categoryFilter,
      });
    } catch (err) {
      // Non-critical background failure swallow
    }
  }

  /**
   * Fetch Recent Searches
   */
  static async getRecentSearches(companyId: string, userId: string, limit: number = 10) {
    const { data } = await supabaseAdmin
      .from('recent_searches')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Clear Recent Searches History
   */
  static async clearRecentSearches(companyId: string, userId: string) {
    await supabaseAdmin
      .from('recent_searches')
      .delete()
      .eq('company_id', companyId)
      .eq('user_id', userId);

    return { success: true };
  }

  /**
   * Save Search Analytics Log
   */
  private static async logSearchAnalytics(
    companyId: string,
    userId: string,
    queryText: string,
    resultsCount: number,
    executionMs: number
  ) {
    try {
      await supabaseAdmin.from('search_analytics_logs').insert({
        company_id: companyId,
        user_id: userId,
        query_text: queryText,
        results_count: resultsCount,
        execution_ms: executionMs,
      });
    } catch (err) {
      // Non-blocking log insertion
    }
  }
}
