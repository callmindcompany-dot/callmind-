// ─── Integration Configuration Types ────────────────────────────────────────
// Shared TypeScript interfaces for IntegrationsPage and all related hooks/panels.

import { ReactNode } from 'react';

// ─── Workspace Router ─────────────────────────────────────────────────────────

export type IntegrationWorkspace =
  | 'facebook'
  | 'indiamart'
  | 'justdial'
  | 'tradeindia'
  | 'googleads'
  | 'website'
  | 'csv'
  | 'webhook'
  | 'sheets'
  | 'whatsapp-api'
  | 'email-provider'
  | 'voip'
  | 'routing'
  | 'mapping'
  | 'health'
  | 'import-logs'
  | null;

// ─── Integration Config Shapes ────────────────────────────────────────────────

export interface FacebookConfig {
  pageId: string;
  formId: string;
  appId: string;
  appSecret: string;
  accessToken: string;
  syncMethod: 'Webhook' | 'Polling';
  syncFrequency: number; // in minutes
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
}

export interface IndiaMartConfig {
  apiKey: string;
  mobile: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
}

export interface JustdialConfig {
  apiKey: string;
  listingId: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
}

export interface TradeIndiaConfig {
  apiKey: string;
  userid: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
}

export interface GoogleAdsConfig {
  googleWebhookUrl: string;
  googleVerifyToken: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncCount: number | null;
  lastSyncErrors: string[];
}

/**
 * The Indian WhatsApp Business Solution Providers CallMind can send through.
 *
 * Not Meta directly: their Cloud API needs Business verification, a Facebook
 * Business Manager and template review done by the customer, which a
 * six-telecaller business will not complete. These three have done it already
 * and are what Indian SMEs actually pay for.
 */
export type BspProvider = 'wati' | 'interakt' | 'aisensy';

export interface WhatsAppConfig {
  provider: BspProvider;
  apiKey: string;
  /** WATI gives each tenant its own host; copied from their dashboard, never guessed. */
  endpoint?: string;
  /** AiSensy requires a campaign per template, set to Live. */
  campaignName?: string;
  isActive?: boolean;
}

export interface EmailConfig {
  smtpServer: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  imapServer: string;
  imapPort: string;
}

export interface WebhookConfig {
  secret: string;
  url: string;
}

/**
 * How an inbound lead gets an owner.
 *
 * `excludeInactive` and `overflowHours` used to be here and are gone. Neither
 * was honoured: processInboundLead holds `activeIds` at an empty array and
 * never consults agent_status, so excluding offline agents changed nothing, and
 * an overflow SLA needs a job that reassigns untouched leads after N hours --
 * which cannot exist while pg_cron is not installed on this database.
 *
 * They also had no columns, so saving the panel raised 42703 and took the
 * assignment rule down with it. Storing them would have turned two controls
 * that do nothing into two settings that persist and still do nothing.
 */
export interface RoutingConfig {
  assignmentRule: 'Manual' | 'RoundRobin';
}

export type FieldAliasesMap = Record<string, string[]>;

// ─── Combined Integration Settings (stored in team_settings JSONB) ────────────

export interface IntegrationSettings {
  facebookConfig: FacebookConfig;
  indiamartConfig: IndiaMartConfig;
  justdialConfig: JustdialConfig;
  tradeindiaConfig: TradeIndiaConfig;
  googleadsConfig: GoogleAdsConfig;
  whatsappConfig: WhatsAppConfig;
  emailConfig: EmailConfig;
  webhookConfig: WebhookConfig;
  routingConfig: RoutingConfig;
  fieldAliases: FieldAliasesMap;
}

// ─── Default Values ───────────────────────────────────────────────────────────

export const DEFAULT_FACEBOOK_CONFIG: FacebookConfig = {
  pageId: '',
  formId: '',
  appId: '',
  appSecret: '',
  accessToken: '',
  syncMethod: 'Webhook',
  syncFrequency: 15,
  isActive: false,
  lastSyncedAt: null,
  lastSyncCount: null,
  lastSyncErrors: [],
};

export const DEFAULT_INDIAMART_CONFIG: IndiaMartConfig = {
  apiKey: '',
  mobile: '',
  isActive: false,
  lastSyncedAt: null,
  lastSyncCount: null,
  lastSyncErrors: [],
};

export const DEFAULT_JUSTDIAL_CONFIG: JustdialConfig = {
  apiKey: '',
  listingId: '',
  isActive: false,
  lastSyncedAt: null,
  lastSyncCount: null,
  lastSyncErrors: [],
};

export const DEFAULT_TRADEINDIA_CONFIG: TradeIndiaConfig = {
  apiKey: '',
  userid: '',
  isActive: false,
  lastSyncedAt: null,
  lastSyncCount: null,
  lastSyncErrors: [],
};

export const DEFAULT_GOOGLEADS_CONFIG: GoogleAdsConfig = {
  googleWebhookUrl: '',
  googleVerifyToken: '',
  isActive: false,
  lastSyncedAt: null,
  lastSyncCount: null,
  lastSyncErrors: [],
};

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  // WATI first because it is the only one of the three whose API offers both
  // approved templates and 24-hour free-text session replies.
  provider: 'wati',
  apiKey: '',
  endpoint: '',
  campaignName: '',
  isActive: false,
};

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  smtpServer: '',
  smtpPort: '465',
  smtpUser: '',
  smtpPass: '',
  imapServer: '',
  imapPort: '993',
};

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  secret: '',
  url: '',
};

export const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  assignmentRule: 'Manual',
};

export const DEFAULT_FIELD_ALIASES: FieldAliasesMap = {
  name: ['Full Name', 'Customer Name', 'lead_name', 'Client'],
  phone: ['Mobile', 'Contact', 'phone_number', 'Cell'],
  email: ['Email Address', 'Mail', 'customer_email'],
  budget: ['Budget Bracket', 'Investment size', 'price_limit'],
  propertyPreference: ['Property Type', 'Location Preference', 'Unit Preference'],
};

export const DEFAULT_INTEGRATION_SETTINGS: IntegrationSettings = {
  facebookConfig: DEFAULT_FACEBOOK_CONFIG,
  indiamartConfig: DEFAULT_INDIAMART_CONFIG,
  justdialConfig: DEFAULT_JUSTDIAL_CONFIG,
  tradeindiaConfig: DEFAULT_TRADEINDIA_CONFIG,
  googleadsConfig: DEFAULT_GOOGLEADS_CONFIG,
  whatsappConfig: DEFAULT_WHATSAPP_CONFIG,
  emailConfig: DEFAULT_EMAIL_CONFIG,
  webhookConfig: DEFAULT_WEBHOOK_CONFIG,
  routingConfig: DEFAULT_ROUTING_CONFIG,
  fieldAliases: DEFAULT_FIELD_ALIASES,
};

// ─── Card Props Interfaces ────────────────────────────────────────────────────

export interface IntegrationCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  status: string;
  statusDetail?: string;
  actionLabel: string;
  onClick: () => void;
  isLocked?: boolean;
  /**
   * How the badge should read at a glance. The card used to colour itself by
   * matching the status string against 'Live' and 'Setup Ready', which is
   * fine for two states and wrong for six -- a broken source and a working one
   * would both have fallen through to grey. See src/lib/integrationState.ts.
   */
  tone?: 'ok' | 'warn' | 'bad' | 'idle';
}

export interface ProviderCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  status: string;
  statusDetail?: string;
  actionLabel: string;
  onClick: () => void;
  isLocked?: boolean;
}

export interface WorkflowCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  status: string;
  actionLabel: string;
  onClick: () => void;
}

// ─── Health Dashboard Types ───────────────────────────────────────────────────

export interface HealthStats {
  totalLeads: number;
  sourceCounts: Record<string, number>;
}

// ─── Save Mutation Payload ────────────────────────────────────────────────────

export type IntegrationConfigPayload = Partial<{
  facebook_config: FacebookConfig;
  indiamart_config: IndiaMartConfig;
  justdial_config: JustdialConfig;
  tradeindia_config: TradeIndiaConfig;
  googleads_config: GoogleAdsConfig;
  whatsapp_config: WhatsAppConfig;
  email_config: EmailConfig;
  webhook_config: WebhookConfig;
  /**
   * The column is `assignment_mode`, not `assignment_rule`. team_settings has
   * only the first, and it is what processInboundLead reads when it chooses
   * between Manual and RoundRobin -- the old key matched no column at all, so
   * every routing save failed with 42703.
   */
  assignment_mode: string;
  field_aliases: FieldAliasesMap;
}>;
