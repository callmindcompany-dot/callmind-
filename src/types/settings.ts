export interface CompanySettings {
  id: string;
  name: string;
  industry: string;
  size: string;
  email: string;
  timezone: string;
  working_hours: { start: string; end: string };
  logo_url: string | null;
  intended_user_count: number;
  goals: string[];
  admin_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  is_locked?: boolean;
  locked_at?: string;
}

export interface TeamSettings {
  company_id: string;
  require_approval: boolean;
  assignment_mode: 'manual' | 'round_robin' | 'pool';
  rotting_threshold: number;
  aging_threshold: number;
  hide_phone_numbers: boolean;
  device_limit: number;
  leads_statuses: string[];
  default_stage: string;
  duplicate_detection: boolean;
  follow_up_duration: string;
  follow_up_reminder: string;
  allow_qr: boolean;
  allow_code: boolean;
  background_fetch: boolean;
  delta_sync: boolean;
  biometric_enforcement: boolean;
  export_perms: boolean;
  auto_lock: string;
  max_devices: number;
  ai_enabled: boolean;
  ai_wa_drafts: boolean;
  ai_wa_me_only: boolean;
  calling_method: string;
  twilio_config: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    appSid: string;
  };
  agent_overrides: Record<string, any>;
  new_join_request: boolean;
  seats_full: boolean;
  overdue_followup: boolean;
  import_fail: boolean;
  sync_fail: boolean;
  member_reminders: boolean;
  member_snooze: boolean;
  reminder_interval: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
  auto_delete_leads_months: number;
  auto_delete_calls_months: number;
  two_factor_enabled: boolean;
  api_key: string;
  webhook_url: string;
  remote_wipe_triggered_at?: string;
  tokens_revoked?: boolean;
  force_logout_timestamp?: string;
  kill_switch_activated_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface BillingInfo {
  plan: string;
  seats_used: number;
  seats_total: number;
  next_billing_date: string;
}

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface WhatsAppMessage {
  id: string;
  company_id: string;
  lead_id: string;
  agent_id: string | null;
  direction: 'incoming' | 'outgoing';
  message_type: 'text' | 'template' | 'image' | 'document';
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata: Record<string, any> | null;
  whatsapp_message_id: string | null;
  created_at: string;
}

export interface ChatLead {
  lead_id: string;
  lead_name: string;
  lead_phone: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'not_equals' | 'greater_than' | 'less_than';
  value: string;
}

export interface RuleConditionGroup {
  logicalOperator: 'AND' | 'OR';
  conditions: RuleCondition[];
}

export interface WorkflowAction {
  id: string;
  type: 
    | 'send_whatsapp' 
    | 'send_email' 
    | 'assign_agent' 
    | 'change_status' 
    | 'add_tag' 
    | 'remove_tag' 
    | 'create_task' 
    | 'internal_notification' 
    | 'update_field' 
    | 'webhook' 
    | 'wait';
  config: Record<string, string | number | boolean | string[]>;
}

export interface AutomationRule {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  icon?: string;
  priority?: number;
  trigger_type: string;
  trigger_keywords?: string[];
  trigger_hours?: number;
  action_type?: string;
  action_template_id?: string;
  is_active: boolean;
  trigger_config?: Record<string, string | number | boolean | string[] | RuleConditionGroup[]>;
  actions_config?: WorkflowAction[];
  created_at?: string;
  updated_at?: string;
}
