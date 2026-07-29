export interface CleanupRuleSettings {
  company_id: string;
  chats_enabled: boolean;
  logs_enabled: boolean;
  leads_enabled: boolean;
  notifications_enabled: boolean;
  exports_enabled: boolean;
  trials_enabled: boolean;
  next_run_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface CleanupLog {
  id: string;
  company_id: string;
  rule_name: string;
  records_deleted: number;
  executed_at: string;
  status: 'success' | 'failed';
}
