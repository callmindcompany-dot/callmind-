import { createClient } from '@supabase/supabase-js';

// F-11 FIX: No dummy JWT fallback — misconfigured deployments should fail explicitly
//
// `import.meta.env` only exists under Vite. This module is browser-side, but
// src/services/audit.service.ts imports it and is in turn pulled in by the
// notification, search and hierarchy routers -- so under `tsx server.ts` the
// bare `import.meta.env.X` threw at import time and the dev server never
// started at all. Read defensively and fall back to process.env so the server
// can boot; the browser build is unaffected.
const viteEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const nodeEnv = (typeof process !== 'undefined' && process.env) || {};

const supabaseUrl = viteEnv.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
