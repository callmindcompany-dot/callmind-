import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: 'Basic' | 'Professional' | 'Enterprise' | 'trial' | 'solo' | 'team' | string;
  status: 'Active' | 'Churned' | 'Trialing' | 'Paused' | 'Suspended' | string;
  userCount: number;
  leadCount: number;
  mrr: number;
  healthScore: number;
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
        domain: row.domain || `${row.name.toLowerCase().replace(/\s+/g, '')}.com`,
        plan: row.plan || 'Trial',
        status: row.status || 'Active',
        userCount: row.user_count || 0,
        leadCount: row.lead_count || 0,
        mrr: Number(row.mrr) || 0,
        healthScore: row.health_score || 80,
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
