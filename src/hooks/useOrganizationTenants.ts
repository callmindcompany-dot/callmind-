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

interface TenantRow {
  id: string;
  name: string;
  domain: string | null;
  plan: string | null;
  status: string | null;
  user_count: number | null;
  lead_count: number | null;
  mrr: number | string | null;
  seat_limit: number | null;
}

export function mapTenantRow(row: TenantRow): Organization {
  return {
    id: row.id,
    name: row.name,
    // No domain is collected at signup. This used to guess one by slugifying
    // the company name and appending .com, and the founder hub displayed the
    // guess as though it were the tenant's real domain.
    domain: row.domain ?? null,
    plan: row.plan || 'Trial',
    status: row.status || 'Active',
    userCount: row.user_count || 0,
    leadCount: row.lead_count || 0,
    // `|| 0` here would turn "unknown" into "₹0 revenue". Keep them apart.
    mrr: row.mrr === null || row.mrr === undefined ? null : Number(row.mrr),
    seatLimit: row.seat_limit || 10,
  };
}

/**
 * Builds the query string shared by the list and the CSV export, so the export
 * cannot silently drift to a different filter than what is on screen.
 */
export function tenantQueryParams(search: string, filterPlan: string, filterStatus: string): URLSearchParams {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (filterPlan && filterPlan !== 'all') params.set('plan', filterPlan);
  if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
  return params;
}

export async function founderFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  return fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * founderFetch plus "a non-2xx is an error".
 *
 * `fetch` resolves on a 403 as happily as on a 200, so a caller that only
 * checks for a thrown exception treats "forbidden" as "no rows" -- which is the
 * empty-screen failure this codebase has repeatedly shipped. The server's
 * message is carried through so the UI can show why.
 */
export async function founderRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await founderFetch(path, init);

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return (await res.json()) as T;
}

/**
 * Reads through /api/founder rather than querying Supabase directly.
 *
 * This hook used to select from organization_tenants_view with the browser's
 * own client. That worked only because the view had no security_invoker and so
 * read straight through RLS -- meaning any logged-in customer could run the
 * same query from devtools and list every tenant on the platform, with seat
 * counts and revenue.
 *
 * The view is scoped now, so a direct read returns one row. The privileged read
 * happens on the server, behind the INTERNAL_TEAM_EMAILS allow-list, which the
 * browser cannot influence. `role === 'founder'` is not that check -- every
 * customer has it.
 */
export function useOrganizationTenants(
  page: number,
  search: string,
  filterPlan: string,
  filterStatus: string
) {
  return useQuery<TenantsResponse>({
    queryKey: ['organization_tenants', page, search, filterPlan, filterStatus],
    queryFn: async (): Promise<TenantsResponse> => {
      const params = tenantQueryParams(search, filterPlan, filterStatus);
      params.set('page', String(page));

      const res = await founderFetch(`/api/founder/tenants?${params.toString()}`);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load tenants (${res.status})`);
      }

      const json = await res.json();
      return {
        tenants: (json.tenants ?? []).map(mapTenantRow),
        totalCount: json.totalCount ?? 0,
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 5000
  });
}
