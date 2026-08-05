export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  INTERESTED = 'Interested',
  NOT_INTERESTED = 'Not Interested',
  CONVERTED = 'Converted',
}

export enum LeadSource {
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  GOOGLE = 'Google',
  WEBSITE = 'Website',
  REFERRAL = 'Referral',
  OTHER = 'Other',
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo?: string; // User ID
  city?: string;
  state?: string;
  dealValue?: number;
  lostReason?: string;
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  lastActivityAt?: any;
  isDeleted?: boolean;
  isUnseen?: boolean;
  
  // Optional CRM target columns
  priority?: string;
  address?: string;
  comment?: string;
  customData?: Record<string, any>;
  firstName?: string;
  lastName?: string;
  altPhone?: string;
  altEmail?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  industry?: string;
  street?: string;
  postalCode?: string;
  country?: string;
  custom_fields?: Record<string, any>;

  // SLA Tracking Fields
  firstContactAt?: string | null;
  lastContactAt?: string | null;
  callbackDeadline?: string | null;
  slaBreached?: boolean;
  slaBreachedAt?: string | null;
  reassignmentCount?: number;
  isLocked?: boolean;
  isManuallyProtected?: boolean;
}

export interface CompanySlaSettings {
  companyId: string;
  newLeadResponseTimeMins: number; // e.g. 15 mins
  overdueCallbackBufferMins: number; // e.g. 30 mins
  staleLeadThresholdDays: number; // e.g. 7 days
  autoReassignEnabled: boolean; // TRUE = Auto reassign, FALSE = Admin alert only
  reassignRotationMode: 'round_robin' | 'least_busy';
  excludedStatuses: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SlaSummary {
  activeBreachesCount: number;
  staleLeadsCount: number;
  firstResponseComplianceRatePct: number;
  autoReassignEnabled: boolean;
  recentReassignments: Array<{
    id: string;
    leadId: string;
    leadName: string;
    fromUserId: string;
    fromUserName?: string;
    toUserId: string;
    toUserName?: string;
    timestamp: string;
    reason: string;
  }>;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  companyId: string;
  type: 'status_change' | 'note' | 'call' | 'assignment';
  content: string;
  performedBy: string; // User ID
  createdAt: any;
}

export interface LeadFilters {
  status?: LeadStatus[];
  source?: LeadSource[];
  dateRange?: {
    start: Date | null | string;
    end: Date | null | string;
  };
  assignedTo?: string[];
  city?: string;
  state?: string;
  searchTerm?: string;
  
  // New extended CRM filters
  dndFilter?: string;
  languageFilter?: string;
  scoreFilter?: string;
  showOnlyRotting?: boolean;
  stateFilter?: string;
  cityFilter?: string;
  engagementFilter?: string;
  customFilters?: Record<string, string>;
}

export interface LeadFormData {
  companyId?: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  city?: string;
  state?: string;
  notes?: string;
  
  // Optional properties mapped from spreadsheet imports
  priority?: string;
  address?: string;
  comment?: string;
  customData?: Record<string, any>;
  firstName?: string;
  lastName?: string;
  altPhone?: string;
  altEmail?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  industry?: string;
  street?: string;
  postalCode?: string;
  country?: string;
  custom_fields?: Record<string, any>;
}

export interface CustomFieldDefinition {
  id: string;
  company_id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'number' | 'select' | 'boolean';
  select_options?: string[] | any;
  is_required?: boolean;
  validation_rule?: Record<string, any>;
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
}

