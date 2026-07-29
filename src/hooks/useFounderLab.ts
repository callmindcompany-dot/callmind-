import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

export interface FounderTest {
  id: string;
  service: 'voip' | 'whatsapp' | 'email';
  status: 'Connected' | 'Disconnected' | 'Testing';
  last_tested_at: string | null;
  config: Record<string, any>;
}

export interface TestLog {
  id: string;
  service: 'voip' | 'whatsapp' | 'email';
  status: 'Success' | 'Failure';
  message: string;
  timestamp: string;
}

export interface Resource {
  id: string;
  type: 'video' | 'pdf';
  title: string;
  description: string | null;
  url: string;
  duration: string | null;
  youtube_id: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  company_id: string;
  lead_id: string | null;
  sender: string;
  message_text: string;
  direction: 'inbound' | 'outbound';
  created_at: string;
}

// 1. Fetch current status of tests
export function useFounderTests() {
  return useQuery<FounderTest[]>({
    queryKey: ['founder_tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('founder_tests')
        .select('*')
        .order('service', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Reactive polling
  });
}

// 2. Fetch recent logs for a specific service
export function useFounderTestLogs(service: 'voip' | 'whatsapp' | 'email') {
  return useQuery<TestLog[]>({
    queryKey: ['founder_test_logs', service],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('founder_test_logs')
        .select('*')
        .eq('service', service)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
  });
}

// 3. Mutation to invoke Edge Function tests
export function useRunTestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ service, config }: { service: 'voip' | 'whatsapp' | 'email'; config: Record<string, any> }) => {
      // 1. Transition state to Testing
      await supabase
        .from('founder_tests')
        .update({ status: 'Testing', last_tested_at: new Date().toISOString() })
        .eq('service', service);
      
      queryClient.invalidateQueries({ queryKey: ['founder_tests'] });

      // 2. Trigger Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(`test-${service}`, {
        body: { config }
      });

      if (error) {
        // Log Edge Function error
        await supabase.from('founder_test_logs').insert({
          service,
          status: 'Failure',
          message: error.message || 'Edge function call failed.'
        });
        
        await supabase
          .from('founder_tests')
          .update({ status: 'Disconnected' })
          .eq('service', service);

        throw error;
      }

      const res = data as { success: boolean; status: string; message: string; latency: number };

      // 3. Write log and update status
      await supabase.from('founder_test_logs').insert({
        service,
        status: res.success ? 'Success' : 'Failure',
        message: `${res.message} (Latency: ${res.latency}ms)`
      });

      await supabase
        .from('founder_tests')
        .update({ status: res.status })
        .eq('service', service);

      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['founder_tests'] });
      queryClient.invalidateQueries({ queryKey: ['founder_test_logs', variables.service] });
      queryClient.invalidateQueries({ queryKey: ['founder_test_stats'] });
    }
  });
}

// 4. Update tool configuration (Credentials)
export function useUpdateConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ service, config }: { service: 'voip' | 'whatsapp' | 'email'; config: Record<string, any> }) => {
      const { data, error } = await supabase
        .from('founder_tests')
        .update({ config, updated_at: new Date().toISOString() })
        .eq('service', service)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['founder_tests'] });
    }
  });
}

// 5. Fetch all resources
export function useResourcesQuery() {
  return useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });
}

// 6. Manage resources (Add/Delete/Seed)
export function useManageResourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      action: 
        | { type: 'add'; resource: Omit<Resource, 'id' | 'created_at'> }
        | { type: 'delete'; id: string }
        | { type: 'seed'; videos: Omit<Resource, 'id' | 'created_at'>[] }
    ) => {
      if (action.type === 'add') {
        const { error } = await supabase.from('resources').insert([action.resource]);
        if (error) throw error;
      } else if (action.type === 'delete') {
        const { error } = await supabase.from('resources').delete().eq('id', action.id);
        if (error) throw error;
      } else if (action.type === 'seed') {
        const { error } = await supabase.from('resources').insert(action.videos);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  });
}

// 7. Fetch active CRM leads (Limit 5)
export function useLeadsQuery(companyId: string | null) {
  return useQuery<Lead[]>({
    queryKey: ['founder_leads', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('id, company_id, name, phone, email, status, created_at')
        .eq('company_id', companyId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });
}

// 8. Fetch WhatsApp chats for testing viewport
export function useWhatsAppMessagesQuery(companyId: string | null, leadId: string | null) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp_messages', companyId, leadId],
    queryFn: async () => {
      if (!companyId) return [];
      let queryBuilder = supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('company_id', companyId);

      if (leadId) {
        queryBuilder = queryBuilder.eq('lead_id', leadId);
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 3000
  });
}

// 9. Fetch aggregate stats of test histories
export function useFounderTestStats() {
  return useQuery<{ total: number; success: number; failure: number; rate: number }>({
    queryKey: ['founder_test_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('founder_test_logs')
        .select('status');

      if (error) throw error;
      const total = data?.length || 0;
      const success = data?.filter(l => l.status === 'Success').length || 0;
      const failure = total - success;
      const rate = total > 0 ? Math.round((success / total) * 100) : 0;

      return { total, success, failure, rate };
    }
  });
}
