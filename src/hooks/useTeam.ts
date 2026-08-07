import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';
import { parsePlanLimitError } from '../lib/planErrors';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type JoinRequestRow = Database['public']['Tables']['join_requests']['Row'];
export type InviteRow = Database['public']['Tables']['invites']['Row'];
export type TeamSettingsRow = Database['public']['Tables']['team_settings']['Row'];
export type AgentStatusRow = Database['public']['Tables']['agent_status']['Row'];
export type ActivityStreamRow = Database['public']['Tables']['activity_stream']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type CompanyRow = Database['public']['Tables']['companies']['Row'];

/**
 * A team member with the two figures the UI shows next to them.
 *
 * They are counted per render rather than stored, because nothing in the
 * product ever wrote them — see useTeamMembers.
 */
export interface TeamMember extends UserRow {
  assigned_leads: number;
  calls_today: number;
}

/**
 * useTeamMembers
 * Queries users table scoping to company_id.
 */
export function useTeamMembers(companyId: string | null) {
  return useQuery<TeamMember[]>({
    queryKey: ['teamMembers', companyId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('Failed to fetch team members:', error);
        throw error;
      }

      const members = (data || []) as UserRow[];
      if (members.length === 0) return [];

      // assigned_leads and calls_today are counted, not stored.
      //
      // Both were read off the users row as `member.assigned_leads || 0`, and
      // neither column exists -- nothing in the codebase has ever written them.
      // So every member showed 0 leads and 0 calls, the removal dialog said
      // "This member has 0 assigned leads" whatever the truth was, and the
      // reassign-ALL control resolved a count of 0 and moved nothing.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [leadCounts, callCounts] = await Promise.all([
        supabase
          .from('leads')
          .select('assigned_to')
          .eq('company_id', companyId)
          .eq('is_deleted', false),
        supabase
          .from('calls')
          .select('created_by')
          .eq('company_id', companyId)
          .gte('timestamp', startOfToday.toISOString()),
      ]);

      if (leadCounts.error) throw leadCounts.error;
      if (callCounts.error) throw callCounts.error;

      const leadsByAgent = new Map<string, number>();
      for (const row of leadCounts.data ?? []) {
        if (row.assigned_to) leadsByAgent.set(row.assigned_to, (leadsByAgent.get(row.assigned_to) ?? 0) + 1);
      }

      const callsByAgent = new Map<string, number>();
      for (const row of callCounts.data ?? []) {
        if (row.created_by) callsByAgent.set(row.created_by, (callsByAgent.get(row.created_by) ?? 0) + 1);
      }

      return members.map((m) => ({
        ...m,
        assigned_leads: leadsByAgent.get(m.id) ?? 0,
        calls_today: callsByAgent.get(m.id) ?? 0,
      }));
    },
    enabled: !!companyId,
    refetchInterval: 10000, // Refetch every 10s for real-time updates
  });
}

/**
 * usePendingRequests
 * Queries join_requests table scoping to company_id where status is pending.
 */
export function usePendingRequests(companyId: string | null) {
  return useQuery<JoinRequestRow[]>({
    queryKey: ['pendingRequests', companyId],
    queryFn: async (): Promise<JoinRequestRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch join requests:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });
}

/**
 * useInvites
 * Queries invites table scoping to company_id.
 */
export function useInvites(companyId: string | null) {
  return useQuery<InviteRow[]>({
    queryKey: ['teamInvites', companyId],
    queryFn: async (): Promise<InviteRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch invites:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });
}

/**
 * useTeamSettings
 * Queries team_settings table scoping to company_id.
 */
export function useTeamSettings(companyId: string | null) {
  return useQuery<TeamSettingsRow | null>({
    queryKey: ['teamSettings', companyId],
    queryFn: async (): Promise<TeamSettingsRow | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('team_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch team settings:', error);
        throw error;
      }
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });
}

/**
 * useAgentStatuses
 * Queries agent_status table scoping to company_id.
 */
export function useAgentStatuses(companyId: string | null) {
  return useQuery<AgentStatusRow[]>({
    queryKey: ['agentStatuses', companyId],
    queryFn: async (): Promise<AgentStatusRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('agent_status')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('Failed to fetch agent statuses:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });
}

/**
 * useActivityStream
 * Queries activity_stream table scoping to company_id.
 */
export function useActivityStream(companyId: string | null) {
  return useQuery<ActivityStreamRow[]>({
    queryKey: ['activityStream', companyId],
    queryFn: async (): Promise<ActivityStreamRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('activity_stream')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Failed to fetch activity stream:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 10000,
  });
}

/**
 * useAuditLogs
 * Queries audit_logs table scoping to company_id.
 */
export function useAuditLogs(companyId: string | null) {
  return useQuery<AuditLogRow[]>({
    queryKey: ['auditLogs', companyId],
    queryFn: async (): Promise<AuditLogRow[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 15000,
  });
}

/**
 * useCompanyPlan
 * Queries companies table for company plan details and limits.
 */
export function useCompanyPlan(companyId: string | null) {
  return useQuery<CompanyRow | null>({
    queryKey: ['companyPlan', companyId],
    queryFn: async (): Promise<CompanyRow | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch company plan details:', error);
        throw error;
      }
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });
}

// -------------------------------------------------------------
// Mutations
// -------------------------------------------------------------

export function useApproveRequest(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ request, inviteToUpdate }: { request: any; inviteToUpdate?: any }) => {
      if (!companyId) throw new Error('Missing companyId');

      // users.id has to be the auth uid: the users_self_read policy is
      // `id = auth.uid()::text`, so a row keyed to anything else is one its
      // owner can never read. This used to fall back to `user_${Date.now()}`,
      // which would occupy a seat, appear in the team list, and belong to
      // nobody who could sign in as them.
      //
      // The submit-join-request edge function rejects a request whose userId is
      // not the caller's own, so a request without one should not exist. If it
      // does, that is worth knowing about rather than papering over.
      const userId = request.user_id;
      if (!userId) {
        throw new Error(
          'This join request has no user account attached, so no seat can be created for it.'
        );
      }

      // 1. Create/Update user document in Supabase
      const { error: userErr } = await supabase
        .from('users')
        .insert({
          id: userId,
          company_id: companyId,
          display_name: request.name,
          name: request.name,
          email: request.email,
          phone: request.phone,
          role: 'Telecaller',
          status: 'active',
          seat_active: true,
          joined_via: request.requested_via || 'Direct Join',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (userErr) throw userErr;

      // 2. Update invite uses count if applicable
      if (inviteToUpdate) {
        const nextUses = (inviteToUpdate.used_count || 0) + 1;
        const { error: inviteErr } = await supabase
          .from('invites')
          .update({
            used_count: nextUses,
            status: inviteToUpdate.max_uses && nextUses >= inviteToUpdate.max_uses ? 'expired' : 'active'
          })
          .eq('id', inviteToUpdate.id);

        // Thrown, not warned. used_count is what enforces max_uses -- if the
        // increment silently fails, a code with a limit of one keeps admitting
        // people, and the approval that consumed it has already created a user.
        if (inviteErr) throw inviteErr;
      }

      // 3. Mark request as approved
      const { error: reqErr } = await supabase
        .from('join_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (reqErr) throw reqErr;

      // 4. Log to audit log
      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'MEMBER_APPROVED',
        category: 'system',
        target: request.name,
        details: `Approved ${request.name} via onboarding request. Seat allocated.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', companyId] });
      queryClient.invalidateQueries({ queryKey: ['pendingRequests', companyId] });
      queryClient.invalidateQueries({ queryKey: ['teamInvites', companyId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', companyId] });
      toast.success('Onboarding request approved successfully');
    },
    onError: (err: any) => {
      // A seat-limit rejection from the database arrives here as a Postgres
      // error. Show the plan message rather than the raw string.
      const planLimit = parsePlanLimitError(err);
      toast.error(planLimit ? planLimit.message : (err.message || 'Failed to approve onboarding request'));
    }
  });
}

export function useRejectRequest(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, targetName }: { requestId: string; targetName: string }) => {
      if (!companyId) throw new Error('Missing companyId');

      const { error } = await supabase
        .from('join_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'MEMBER_REJECTED',
        category: 'system',
        target: targetName,
        details: `Rejected onboarding request from ${targetName}.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRequests', companyId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', companyId] });
      toast.success('Onboarding request rejected');
    }
  });
}

export function useCreateInvite(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string | null; role: string; type: string; joinCode?: string; token?: string; maxUses?: number }) => {
      if (!companyId) throw new Error('Missing companyId');

      const { data, error } = await supabase
        .from('invites')
        .insert({
          company_id: companyId,
          email: payload.email,
          role: payload.role,
          join_code: payload.joinCode || null,
          token: payload.token || null,
          status: 'active',
          created_at: new Date().toISOString(),
          used_count: 0,
          max_uses: payload.maxUses || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'INVITE_CODE_GENERATED',
        category: 'system',
        target: payload.joinCode || payload.email || 'Invite',
        details: `Generated onboarding invite: ${payload.joinCode || payload.email}`
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInvites', companyId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', companyId] });
    }
  });
}

export function useRevokeInvite(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!companyId) throw new Error('Missing companyId');

      const { error } = await supabase
        .from('invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'INVITE_REVOKED',
        category: 'system',
        target: inviteId,
        details: `Revoked onboarding invite code.`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamInvites', companyId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', companyId] });
      toast.success('Invite revoked successfully');
    }
  });
}

export function useProcessMember(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { memberId: string; displayName: string; action: 'disable' | 'remove'; transferTarget: string }) => {
      if (!companyId) throw new Error('Missing companyId');

      const statusVal = payload.action === 'disable' ? 'disabled' : 'removed';

      // 1. Update user record.
      //
      // Scoped by company as well as id. RLS should already stop a cross-tenant
      // update, but a mutation that disables a member is not the place to lean
      // on that alone -- and the filter costs nothing.
      const { error: userErr } = await supabase
        .from('users')
        .update({
          status: statusVal,
          seat_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.memberId)
        .eq('company_id', companyId);

      if (userErr) throw userErr;

      // 2. Add audit log record.
      //
      // The details line used to read "Leads reassigned to <target>" for both
      // actions. Reassignment is a separate call to /api/admin/bulk-reassign
      // that TeamPage makes only on 'remove', and whose response it did not
      // check -- so the audit trail asserted a transfer that may not have
      // happened, and never happened at all on 'disable'. State only what this
      // mutation did.
      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: payload.action === 'disable' ? 'MEMBER_DISABLED' : 'MEMBER_REMOVED',
        category: 'system',
        target: payload.displayName,
        details: payload.action === 'disable'
          ? 'Member disabled and seat released.'
          : 'Member removed and seat released.'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers', companyId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', companyId] });
    }
  });
}

export function useUpdateTeamSettings(companyId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<TeamSettingsRow>) => {
      if (!companyId) throw new Error('Missing companyId');

      const { data, error } = await supabase
        .from('team_settings')
        .upsert({
          ...payload,
          company_id: companyId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        company_id: companyId,
        action: 'SETTING_UPDATED',
        category: 'config',
        target: 'Team Policies',
        details: `Settings updated: ${Object.keys(payload).join(', ')}`
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamSettings', companyId] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs', companyId] });
      toast.success('Team settings updated successfully');
    }
  });
}
