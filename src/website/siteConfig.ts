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

/** Legal entity behind the product. */
export const COMPANY_NAME = 'Voolabs Technologies';

export const CONTACT_EMAIL = 'voolabsofficial@gmail.com';
