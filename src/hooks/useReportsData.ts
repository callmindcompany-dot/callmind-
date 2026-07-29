import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface ReportsData {
  loading: boolean;
  leads: any[];
  calls: any[];
  callbacks: any[];
  auditLogs: any[];
  users: any[];
}

export function useReportsData(companyId: string | null): ReportsData {
  // Query users
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['reports', 'rawUsers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId);
      if (error) throw error;
      
      // Map properties for UI consistency
      return (data || []).map(u => ({
        ...u,
        uid: u.id,
        displayName: u.display_name || u.name || u.email
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  // Query leads
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['reports', 'rawLeads', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .limit(1000);
      if (error) throw error;
      
      return (data || []).map(l => ({
        ...l,
        assignedTo: l.assigned_to,
        createdAt: l.created_at,
        lastContactedAt: l.last_contacted_at
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  // Query calls
  const { data: calls = [], isLoading: loadingCalls } = useQuery({
    queryKey: ['reports', 'rawCalls', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('company_id', companyId)
        .limit(1000);
      if (error) throw error;
      
      return (data || []).map(c => ({
        ...c,
        leadName: c.outcome || 'Unknown Lead',
        createdBy: c.created_by,
        agentId: c.created_by
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  // Query callbacks
  const { data: callbacks = [], isLoading: loadingCallbacks } = useQuery({
    queryKey: ['reports', 'rawCallbacks', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('callbacks')
        .select('*')
        .eq('company_id', companyId)
        .limit(1000);
      if (error) throw error;
      
      return (data || []).map(cb => ({
        ...cb,
        scheduledTime: cb.scheduled_time,
        agentId: cb.agent_id,
        leadId: cb.lead_id
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  // Query audit logs
  const { data: auditLogs = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['reports', 'rawAuditLogs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(100);
      if (error) throw error;
      
      return (data || []).map(log => ({
        ...log,
        userName: log.user_name,
        userId: log.company_id
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  return {
    loading: loadingUsers || loadingLeads || loadingCalls || loadingCallbacks || loadingAudits,
    leads,
    calls,
    callbacks,
    auditLogs,
    users
  };
}
