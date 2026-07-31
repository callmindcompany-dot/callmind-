export const CALLMIND_OFFICIAL_EMAIL = "support@callmind.app";
export const VOOLABS_OFFICIAL_EMAIL = "voolabsofficial@gmail.com";

export const masterFounderEmail = 
  (typeof process !== 'undefined' && process.env?.MASTER_FOUNDER_EMAIL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MASTER_FOUNDER_EMAIL) ||
  CALLMIND_OFFICIAL_EMAIL;

// F-02 FIX: Read internal team list from env only — no hardcoded emails in source
const internalTeamEmails = 
  (typeof process !== 'undefined' && process.env?.INTERNAL_TEAM_EMAILS) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_INTERNAL_TEAM_EMAILS) ||
  "";

export const FOUNDER_OWNERS = internalTeamEmails.split(',').map((e: string) => e.trim()).filter(Boolean);
export const INTERNAL_TEAM = [...FOUNDER_OWNERS];

export const USER_PERSPECTIVE_TESTERS: string[] = [];
