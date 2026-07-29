// CRM Reports & Business Intelligence TypeScript Models

export interface HourlyCallDensity {
  company_id: string;
  hour: number;
  call_count: number;
  date: string;
}

export interface ConversionFunnelStep {
  company_id: string;
  status: string;
  count: number;
}

export interface AgentPerformance {
  company_id: string;
  agent_id: string;
  agent_name: string | null;
  total_dials: number;
  connected: number;
  conversions: number;
  talk_time_avg: number; // in seconds
  date: string;
}

export interface LeadSourceYield {
  company_id: string;
  source: string;
  lead_count: number;
  conversion_rate: number; // percentage
}

export interface ComparisonMetrics {
  current_leads: number;
  previous_leads: number;
  current_calls: number;
  previous_calls: number;
  current_conversions: number;
  previous_conversions: number;
  current_connect_rate: number;
  previous_connect_rate: number;
}

export interface ReportSchedule {
  id: string;
  company_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  metrics: string[];
  created_at?: string;
}

// Client UI mappings
export interface UIFunnelStage {
  name: string;
  value: number;
  stage: string;
  color: string;
  pct: string;
  label: string;
}

export interface UICohortRow {
  cohortName: string;
  totalLeads: number;
  converted7d: number;
  converted14d: number;
  converted30d: number;
  rate7d: string;
  rate14d: string;
  rate30d: string;
}

// Drill-Down & Advanced Admin Analytics Interfaces

export interface DrillDownLead {
  id: string;
  name: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

export interface DrillDownCall {
  id: string;
  timestamp: string;
  duration: string;
  outcome: string;
  lead_name?: string | null;
}

export interface DrillDownAttendance {
  id: string;
  type: string;
  timestamp: string;
}

export interface DrillDownGoal {
  target_calls: number;
  actual_calls: number;
  target_conversions: number;
  actual_conversions: number;
}

export interface AgentDrillDownData {
  leads: DrillDownLead[];
  calls: DrillDownCall[];
  attendance: DrillDownAttendance[];
  goals: DrillDownGoal;
  statusChanges: StatusChangeRecord[];
}

export interface AttendanceSummary {
  agent_id: string;
  agent_name: string;
  days_present: number;
  hours_worked: number;
  late_count: number;
  avg_check_in: string | null;
}

export interface CallReportRecord {
  id: string;
  agent_name: string | null;
  lead_name: string | null;
  phone: string | null;
  duration: string;
  outcome: string;
  timestamp: string;
}

export interface WhatsAppReportRecord {
  id: string;
  agent_name: string | null;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
}

// Telecaller-specific metrics

export interface CallDispositionRecord {
  outcome: string;
  count: number;
}

export interface TelecallerMetrics {
  agent_id: string;
  agent_name: string | null;
  first_call_at: string | null;
  last_call_at: string | null;
  total_calls: number;
  total_talk_seconds: number;
  avg_talk_seconds: number;
  notes_count: number;
  login_time: string | null;
  logout_time: string | null;
  active_duration_minutes: number;
  idle_minutes: number;
}

export interface StatusChangeRecord {
  from_status: string;
  to_status: string;
  count: number;
}
