import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Legacy source config (Fill these with your old Firebase project values)
const sourceConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_LEGACY_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_LEGACY_AUTH_DOMAIN",
  projectId: process.env.FIREBASE_PROJECT_ID || "ai-studio-applet-webapp-e3ef2",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_LEGACY_STORAGE_BUCKET",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_LEGACY_MESSAGING_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "YOUR_LEGACY_APP_ID"
};

// Destination Supabase config (loaded from .env)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check flags
const isDryRun = process.argv.includes('--dry-run');

// Helper to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert object keys recursively
function mapKeys(obj: any, converter: (s: string) => string): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => mapKeys(item, converter));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      n[converter(k)] = mapKeys(obj[k], converter);
    });
    return n;
  }
  return obj;
}

async function run() {
  console.log(`Starting CallMind Legacy Firebase to Supabase Migration...`);
  if (isDryRun) {
    console.log(`[DRY RUN] Simulation mode active. No data will be written to Supabase.`);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`Error: Supabase environment variables missing! Please configure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.`);
    process.exit(1);
  }

  // Init Firebase
  console.log(`Connecting to legacy Firebase project: ${sourceConfig.projectId}...`);
  const firebaseApp = initializeApp(sourceConfig);
  const firestore = getFirestore(firebaseApp);

  // Init Supabase with service role key to bypass RLS policies
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const collections = ['users', 'leads', 'founder_configs', 'lead_sources', 'automations', 'sequences', 'calls', 'agent_status'];

  for (const collName of collections) {
    console.log(`\n======================================`);
    console.log(`Migrating collection: "${collName}"...`);
    console.log(`======================================`);

    try {
      const collRef = collection(firestore, collName);
      const snapshot = await getDocs(collRef);
      const docs = snapshot.docs;

      console.log(`Found ${docs.length} documents in Firestore "${collName}".`);

      if (docs.length === 0) {
        console.log(`Skipping migration for "${collName}" since it contains no records.`);
        continue;
      }

      const supabaseTable = toSnakeCase(collName);
      let successCount = 0;
      let errorCount = 0;

      // Map and write documents in batches
      const batchSize = 50;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        const payloads = batch.map(doc => {
          const rawData = doc.data();
          const dbData = mapKeys(rawData, toSnakeCase);
          
          // Map document id as the primary key id
          const payload = {
            id: doc.id,
            ...dbData
          };

          // Format timestamp fields to ISO strings for PostgreSQL compatibility
          for (const key of Object.keys(payload)) {
            const val = payload[key];
            if (val && typeof val === 'object' && val.seconds !== undefined && val.nanoseconds !== undefined) {
              payload[key] = new Date(val.seconds * 1000).toISOString();
            }
          }

          // Special mappings
          if (collName === 'users') {
             if (payload.onboarding_status === undefined && payload.onboardingStatus !== undefined) {
               payload.onboarding_status = payload.onboardingStatus;
               delete payload.onboardingStatus;
             }
          }

          return payload;
        });

        if (isDryRun) {
          console.log(`[DRY RUN] Would upsert ${payloads.length} records into table: "${supabaseTable}".`);
          successCount += payloads.length;
        } else {
          const { error } = await supabase
            .from(supabaseTable)
            .upsert(payloads);

          if (error) {
            console.error(`[ERROR] Batch upsert failed for table "${supabaseTable}":`, error.message);
            errorCount += payloads.length;
          } else {
            successCount += payloads.length;
            console.log(`Successfully upserted batch of ${payloads.length} records.`);
          }
        }
      }

      console.log(`Finished "${collName}": Success: ${successCount}, Failed: ${errorCount}`);
    } catch (e: any) {
      console.error(`[CRITICAL] Migration failed for collection "${collName}":`, e.message || e);
    }
  }

  // Subcollections Migration (Company-nested)
  console.log(`\n======================================`);
  console.log(`Fetching companies list to scan subcollections...`);
  console.log(`======================================`);

  try {
    const companiesRef = collection(firestore, 'companies');
    const companiesSnap = await getDocs(companiesRef);
    const companyIds = companiesSnap.docs.map(doc => doc.id);
    console.log(`Found ${companyIds.length} companies to scan.`);

    const subCollections = [
      { name: 'attendance_logs', table: 'attendance_logs' },
      { name: 'targets', table: 'targets' },
      { name: 'announcements', table: 'announcements' },
      { name: 'join_requests', table: 'join_requests' },
      { name: 'invites', table: 'invites' }
    ];

    for (const sub of subCollections) {
      console.log(`\n--------------------------------------`);
      console.log(`Migrating subcollection: "${sub.name}"...`);
      console.log(`--------------------------------------`);
      let successCount = 0;
      let errorCount = 0;
      let totalDocsCount = 0;

      for (const companyId of companyIds) {
        const path = `companies/${companyId}/${sub.name}`;
        try {
          const ref = collection(firestore, path);
          const snapshot = await getDocs(ref);
          const docs = snapshot.docs;
          if (docs.length === 0) continue;

          totalDocsCount += docs.length;
          const payloads = docs.map(doc => {
            const rawData = doc.data();
            const dbData = mapKeys(rawData, toSnakeCase);
            const payload = {
              id: doc.id,
              company_id: companyId,
              ...dbData
            };

            for (const key of Object.keys(payload)) {
              const val = payload[key];
              if (val && typeof val === 'object' && val.seconds !== undefined && val.nanoseconds !== undefined) {
                payload[key] = new Date(val.seconds * 1000).toISOString();
              }
            }

            return payload;
          });

          if (isDryRun) {
            console.log(`[DRY RUN] Would upsert ${payloads.length} records from path "${path}" into table "${sub.table}".`);
            successCount += payloads.length;
          } else {
            const { error } = await supabase.from(sub.table).upsert(payloads);
            if (error) {
              console.error(`[ERROR] Subcollection batch upsert failed for path "${path}":`, error.message);
              errorCount += payloads.length;
            } else {
              successCount += payloads.length;
            }
          }
        } catch (err: any) {
          // Path might not exist for some companies
        }
      }
      console.log(`Finished subcollection "${sub.name}": Total Found: ${totalDocsCount}, Success: ${successCount}, Failed: ${errorCount}`);
    }
  } catch (companiesErr: any) {
    console.error(`Failed to scan companies for subcollection migration:`, companiesErr.message);
  }

  console.log(`\n======================================`);
  console.log(`Migration Process Complete!`);
  console.log(`======================================\n`);
}

run().catch(err => {
  console.error(`Fatal migration runner error:`, err);
  process.exit(1);
});
