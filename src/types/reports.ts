// CRM Reports & Business Intelligence TypeScript Models

/**
 * One row per (hour, day), the grain the view stores.
 *
 * Kept at this grain because the hour-of-day chart and the weekday heat map
 * need different shapes: the first sums the days away (sumByHour), the second
 * needs the date to know which weekday a count belongs to.
 */
export interface HourlyCallDensity {
  hour: number;
  call_count: number;
  date: string;
}

/**
 * Leads at each stage, summed over the period.
 *
 * These are stages, not ordered steps. leads.status has no CHECK constraint
 * and the names are per company, so nothing here says Contacted follows New.
 */
export interface FunnelStep {
  status: string;
  count: number;
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
  source: string;
  lead_count: number;
  /**
   * Leads carrying a deal value. Deliberately not "leads in a won status":
   * leads.status has no CHECK constraint and stage names are per company, so
   * that mapping would be a guess printed as a percentage.
   */
  converted_count: number;
  deal_value_total: number;
  /** Computed once from the summed counts, never by averaging daily rates. */
  conversion_rate: number;
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
  last_contact_at: string | null;
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
  /**
   * Real time between check_in and check_out, summed over days that have both.
   * null when no day does -- this used to be days_present * 8.5, a figure no
   * clock produced. The screen must render null as unknown, not as zero.
   */
  hours_worked: number | null;
  /** How many days the figure above is based on. */
  days_with_hours: number;
  /** Days checked in but never checked out, so hours cannot be known. */
  open_days: number;
  late_count: number;
  avg_check_in: string | null;
}

export interface CallReportRecord {
  id: string;
  /** Kept alongside the name so a row can be drilled into or re-filtered. */
  agent_id: string | null;
  agent_name: string | null;
  lead_id: string | null;
  lead_name: string | null;
  phone: string | null;
  /** From the lead the call belongs to; a call has no source of its own. */
  source: string | null;
  status: string | null;
  duration: string;
  outcome: string;
  interest: string | null;
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
  /** null when no call had a readable duration -- not the same as 0 seconds. */
  avg_talk_seconds: number | null;
  /** Calls whose duration text could not be parsed, so the average excludes them. */
  unreadable_durations: number;
  notes_count: number;
  login_time: string | null;
  logout_time: string | null;
  /**
   * null when the shift is not known, which used to be reported as 0 idle --
   * a flattering number shown for agents with no attendance data at all.
   */
  active_duration_minutes: number | null;
  idle_minutes: number | null;
}

export interface StatusChangeRecord {
  from_status: string;
  to_status: string;
  count: number;
}
