/**
 * Single source of truth for public-facing site constants.
 *
 * These strings end up in QR codes, meta tags and visible UI chrome, so a stale
 * copy in one component is a bug a visitor sees. Import from here rather than
 * hardcoding — the site previously showed both callmind.ai and callmind.app,
 * and a QR code pointing at http://localhost:8083.
 */

export const SITE_URL = 'https://callmind.app';

/** Bare domain, for display in UI chrome such as the mock browser address bar. */
export const SITE_DOMAIN = 'callmind.app';

/**
 * Legal entity behind the product.
 *
 * Re-exported from src/config/legal.ts, which is where the legal documents take
 * it from too. It was declared separately here as 'Voolabs Technologies' while
 * the mobile app said 'CallMind Technologies Inc.' and the three legal pages
 * each named their own — four answers to one question, on the same site.
 *
 * Nothing here is used by any component today (the footer and company page
 * hardcode the string), which is part of how the four came about.
 */
export { ENTITY } from '@/config/legal';
import { ENTITY as LEGAL_ENTITY } from '@/config/legal';
export const COMPANY_NAME = LEGAL_ENTITY.business;

export const CONTACT_EMAIL = 'support@callmind.app';
export const SALES_EMAIL = 'sales@callmind.app';
export const SUPPORT_EMAIL = 'support@callmind.app';
export const COMPANY_LOCATIONS = 'Pune, Nashik, Satara, Maharashtra, India';
