import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface Organization {
  id: string;
  name: string;
  /** Always null today — no domain is collected at signup. */
  domain: string | null;
  plan: 'Basic' | 'Professional' | 'Enterprise' | 'trial' | 'solo' | 'team' | string;
  status: 'Active' | 'Churned' | 'Trialing' | 'Paused' | 'Suspended' | string;
  userCount: number;
  leadCount: number;
  /** null when the tenant's plan is not in plan_limits, so revenue is unknown. */
  mrr: number | null;
  seatLimit: number;
}

interface TenantsResponse {
  tenants: Organization[];
  totalCount: number;
}

export function useOrganizationTenants(
  page: number,
  search: string,
  filterPlan: string,
  filterStatus: string
) {
  return useQuery<TenantsResponse>({
    queryKey: ['organization_tenants', page, search, filterPlan, filterStatus],
    queryFn: async (): Promise<TenantsResponse> => {
      let query = supabase
        .from('organization_tenants_view')
        .select('*', { count: 'exact' });

      if (search.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }

      if (filterPlan && filterPlan !== 'all') {
        query = query.eq('plan', filterPlan);
      }

      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // Add order by name as default
      query = query.order('name', { ascending: true });

      // Apply pagination (50 rows per page)
      const from = (page - 1) * 50;
      const to = page * 50 - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('Failed to fetch organization tenants:', error);
        throw error;
      }

      const tenants: Organization[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        // No domain is collected at signup. This used to guess one by
        // slugifying the company name and appending .com, and the founder hub
        // displayed the guess as though it were the tenant's real domain.
        domain: row.domain ?? null,
        plan: row.plan || 'Trial',
        status: row.status || 'Active',
        userCount: row.user_count || 0,
        leadCount: row.lead_count || 0,
        // `|| 0` here would turn "unknown" into "₹0 revenue". Keep them apart.
        mrr: row.mrr === null || row.mrr === undefined ? null : Number(row.mrr),
        seatLimit: row.seat_limit || 10
      }));

      return {
        tenants,
        totalCount: count || 0
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 5000
  });
}
