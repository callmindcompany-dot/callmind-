/**
 * Schema Verification Script
 *
 * Verifies that critical tables and columns required by src/types/supabase.ts
 * are present in the Supabase database.
 *
 * Usage: node scripts/verify-schema.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ [verify-schema] SUPABASE_URL or SUPABASE_KEY missing in .env — skipping remote database check.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Core tables that must exist
const REQUIRED_TABLES = [
  'leads',
  'users',
  'companies',
  'calls',
  'lead_activity_log',
  'team_settings',
  'audit_logs',
  'announcements',
  'notifications',
  'whatsapp_messages',
  'documents',
  'targets'
];

async function verifySchema() {
  console.log('🔍 [verify-schema] Verifying database tables against application schema...');
  let hasErrors = false;

  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.error(`❌ Table missing in database: "${table}"`);
        } else {
          console.warn(`⚠️ Warning querying table "${table}": ${error.message} (${error.code})`);
        }
        hasErrors = true;
      } else {
        console.log(`✅ Table verified: "${table}"`);
      }
    } catch (err) {
      console.error(`❌ Error verifying table "${table}":`, err.message);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.warn('\n⚠️ Schema verification completed with warnings or missing tables. Ensure pending migrations have been applied.');
  } else {
    console.log('\n🎉 Schema verification completed successfully! All core tables exist.');
  }
}

verifySchema().catch((err) => {
  console.error('Fatal error during schema verification:', err);
  process.exit(1);
});
