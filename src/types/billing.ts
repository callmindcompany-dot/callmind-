export interface Subscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'paused' | 'expired';
  seats_limit: number;
  billing_cycle: 'monthly' | 'yearly';
  starts_at?: string;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BillingIntent {
  id: string;
  user_id: string;
  user_email: string;
  company_id: string;
  plan_id: string;
  seats: number;
  duration_months: number;
  addons: string[];
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'refunded';
  billing_period_start: string;
  billing_period_end: string;
  pdf_url?: string | null;
  created_at?: string;
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  companyId: string;
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
    };
  }
}

