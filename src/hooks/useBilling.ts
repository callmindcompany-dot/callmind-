import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { BillingIntent, Invoice } from '@/types/billing';
import { CompanyRow } from './useTeam';
import { toast } from 'react-hot-toast';

// 1. Fetch Subscription/Company Plan details
export function useSubscription(companyId: string | null) {
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
        console.error('Failed to fetch subscription details:', error);
        throw error;
      }
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });
}

// 2. Fetch Invoices list for a company
export function useInvoices(companyId: string | null) {
  return useQuery<Invoice[]>({
    queryKey: ['invoices', companyId],
    queryFn: async (): Promise<Invoice[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch invoices:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId,
  });
}

// 3. Register Upgrade Intent Mutation
export function useRegisterUpgradeIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intent: Omit<BillingIntent, 'id' | 'status' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('billing_intents')
        .insert({
          user_id: intent.user_id,
          user_email: intent.user_email,
          company_id: intent.company_id,
          plan_id: intent.plan_id,
          seats: intent.seats,
          duration_months: intent.duration_months,
          addons: intent.addons,
          total_amount: intent.total_amount,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to register upgrade intent:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['billing_intents', variables.company_id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to register upgrade intent.');
    }
  });
}

// 4. Create Razorpay Payment Order Mutation
export function useCreateRazorpayOrder() {
  return useMutation({
    mutationFn: async ({ amount, companyId, planId, seats, durationMonths = 1 }: { amount: number; companyId: string; planId: string; seats: number; durationMonths?: number }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        // durationMonths is recorded in the Razorpay order notes server-side and read
        // back at verification — it must be established here, not at verify time.
        body: JSON.stringify({ amount, companyId, planId, seats, durationMonths })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to initiate Razorpay order');
      }

      return await res.json();
    }
  });
}

// 5. Verify Razorpay Payment & Activate Plan Mutation
export function useVerifyRazorpayPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      companyId: string;
      planId: string;
      seats: number;
      amount: number;
      durationMonths?: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Payment verification failed');
      }

      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['companyPlan', variables.companyId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.companyId] });
      toast.success(`🎉 Subscription Activated! Upgraded to ${variables.planId.toUpperCase()} plan.`, {
        duration: 6000,
        icon: '💎'
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Payment verification failed.');
    }
  });
}

