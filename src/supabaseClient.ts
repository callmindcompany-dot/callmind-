import { createClient } from '@supabase/supabase-js';

// F-11 FIX: No dummy JWT fallback — misconfigured deployments should fail explicitly
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
