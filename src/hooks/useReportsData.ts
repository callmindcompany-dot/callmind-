import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface ReportsData {
  loading: boolean;
  leads: any[];
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
      
      return (data || []).map(u => ({
        ...u,
        uid: u.id,
        displayName: u.display_name || u.name || u.email
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  // Query leads (Limited to 1000 for the Custom Report Workspace and CSV export)
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['reports', 'rawLeads', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      
      return (data || []).map(l => ({
        ...l,
        assignedTo: l.assigned_to,
        createdAt: l.created_at,
        lastContactedAt: l.last_contact_at
      }));
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  return {
    loading: loadingUsers || loadingLeads,
    leads,
    users
  };
}
