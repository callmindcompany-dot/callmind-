export interface CompanyStats {
  id: string;
  name: string;
  plan: string | null;
  status: string | null;
  leads_count: number;
  agents_count: number;
  mrr: number;
  health_score: number;
  storage_used: number;
  storage_limit: number;
  renewal_date: string;
}

export interface PlatformStats {
  total_companies: number;
  total_leads: number;
  total_agents: number;
  total_mrr: number;
  total_arr: number;
  churned_this_month: number;
}

export interface SupportTicket {
  id: string;
  company_id: string;
  company_name: string | null;
  user_email: string;
  user_name: string | null;
  user_designation: string | null;
  user_phone: string | null;
  title: string | null;
  description: string;
  steps: string | null;
  status: 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  client_health_score: number;
  os_info: string | null;
  browser_info: string | null;
  network_latency: string | null;
  attachment_url: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FounderActivity {
  id: string;
  company_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  category: string | null;
  target: string | null;
  target_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'company' | 'ticket' | 'lead';
  metadata?: Record<string, any>;
}

export interface SearchResults {
  companies: SearchResultItem[];
  tickets: SearchResultItem[];
  leads: SearchResultItem[];
}

export interface AuditLog {
  id: string;
  company_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  category: string | null;
  target: string | null;
  target_id: string | null;
  details: string | null;
  timestamp: string;
}

export interface Callback {
  id: string;
  company_id: string;
  lead_id: string;
  assigned_to: string | null;
  reminder_date: string;
  notes: string | null;
  created_at: string;
  status: string;
  lead?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
}

export interface CallbackGroup {
  overdue: Callback[];
  today: Callback[];
  upcoming: Callback[];
}

