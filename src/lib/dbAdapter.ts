import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
export let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("[Gemini AI] Client successfully initialized with configured API Key.");
}

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * What role the configured key actually grants.
 *
 * A Supabase key is a JWT whose payload carries the role it authenticates as.
 * Decoding it is not verification — the server does not need to verify its own
 * key — it is a way to notice that the wrong one has been pasted in.
 *
 * Returns null when the value is not a JWT at all, which is the case for the
 * newer `sb_secret_...` style keys. Those are opaque, so nothing can be
 * concluded from them and the check stays quiet.
 */
export function roleOfSupabaseKey(key: string): string | null {
  const parts = (key || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Whether the server can actually act with elevated privileges.
 *
 * Read from SUPABASE_SERVICE_ROLE_KEY alone. That is the point: the client
 * below still falls back to the anon key so the module can load and UI work is
 * possible without one, but this flag never does, so the fallback can no longer
 * pass itself off as the real thing.
 *
 * It had been passing itself off for a long time. Both env vars held the same
 * anon key, byte for byte, so `supabaseAdmin` had the privileges of a
 * logged-out visitor while every privileged path assumed otherwise: inbound
 * lead ingestion, the payment write-back after a verified Razorpay signature,
 * the admin routes, and the hourly trial-expiry job.
 *
 * Trial expiry is how it surfaced. expire_trials() is refused by
 * trg_protect_billing_columns unless the caller is service_role, so the cron
 * raised "Subscription details can only be changed by completing a payment"
 * every hour into a swallowed catch, and eight companies sat in `trialing` past
 * their end date.
 *
 * server.ts refuses to start in production when this is false.
 */
export const SERVICE_ROLE_CONFIGURED =
  roleOfSupabaseKey(process.env.SUPABASE_SERVICE_ROLE_KEY || '') === 'service_role';

// The anon key keeps the module loadable; SERVICE_ROLE_CONFIGURED above is what
// tells the truth about what it can do.
const transportKey = supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY || 'missing-key';

export const supabaseAdmin = createClient(supabaseUrl || 'http://localhost', transportKey);
export const isPlaceholder = false;

// Convert camelCase to snake_case for PostgreSQL
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case to camelCase
export function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

// Convert object keys recursively
export function mapKeys(obj: any, converter: (s: string) => string): any {
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

// Mock Firestore FieldValue simulator
export const FieldValue = {
  increment(value: number) {
    return { type: 'increment', value };
  },
  serverTimestamp() {
    return new Date().toISOString();
  }
};

// Mock Firestore Timestamp adapter
export class MockTimestamp {
  constructor(private date: Date) {}
  toDate() { return this.date; }
  toMillis() { return this.date.getTime(); }
  static now() { return new MockTimestamp(new Date()); }
  static fromDate(date: Date) { return new MockTimestamp(date); }
  static fromMillis(ms: number) { return new MockTimestamp(new Date(ms)); }
}

export const Timestamp = MockTimestamp;

// Mock Firestore Query Builder
export class QueryBuilder {
  private constraints: any[] = [];
  constructor(private tableName: string) {}

  where(field: string, op: string, value: any) {
    this.constraints.push({ type: 'where', field, op, value });
    return this;
  }

  limit(count: number) {
    if (count > 0) {
      this.constraints.push({ type: 'limit', count });
    }
    return this;
  }

  async get() {
    

    let q = supabaseAdmin.from(this.tableName).select('*');
    for (const c of this.constraints) {
      if (c.type === 'where') {
        const dbField = toSnakeCase(c.field);
        if (c.op === '==') {
          q = q.eq(dbField, c.value);
        } else if (c.op === 'in') {
          q = q.in(dbField, c.value);
        }
      } else if (c.type === 'limit') {
        q = q.limit(c.count);
      }
    }
    const { data, error } = await q;
    if (error) throw error;
    
    return {
      empty: !data || data.length === 0,
      size: data?.length || 0,
      docs: (data || []).map((row: any) => ({
        ref: db.collection(this.tableName).doc(row.id),
        data: () => mapKeys(row, toCamelCase)
      }))
    };
  }

  count() {
    return {
      get: async () => {
        

        let q = supabaseAdmin.from(this.tableName).select('*', { count: 'exact', head: true });
        for (const c of this.constraints) {
          if (c.type === 'where') {
            q = q.eq(toSnakeCase(c.field), c.value);
          }
        }
        const { count, error } = await q;
        if (error) throw error;
        return {
          data: () => ({ count: count || 0 })
        };
      }
    };
  }
}

// Expose standard db interface
export const db = {
  collection(name: string) {
    const tableName = toSnakeCase(name);
    return {
      doc(id: string) {
        const docRef = { id, collectionName: name };
        return {
          id,
          ref: docRef,
          async get() {
            

            const { data, error } = await supabaseAdmin
              .from(tableName)
              .select('*')
              .eq('id', id)
              .maybeSingle();
            if (error) throw error;
            return {
              exists: !!data,
              data: () => data ? mapKeys(data, toCamelCase) : null
            };
          },
          async update(data: any) {
            const dbData = mapKeys(data, toSnakeCase);
            
            

            // Resolve FieldValue.increment
            for (const k of Object.keys(dbData)) {
              if (dbData[k] && dbData[k].type === 'increment') {
                const { data: current } = await supabaseAdmin.from(tableName).select(k).eq('id', id).maybeSingle();
                const baseValue = current ? (current[k as keyof typeof current] || 0) : 0;
                dbData[k] = baseValue + dbData[k].value;
              }
            }

            const { error } = await supabaseAdmin
              .from(tableName)
              .update(dbData)
              .eq('id', id);
            if (error) throw error;
          },
          async set(data: any, options?: { merge?: boolean }) {
            const dbData = mapKeys(data, toSnakeCase);
            
            

            const { error } = await supabaseAdmin
              .from(tableName)
              .upsert([{ id, ...dbData }]);
            if (error) throw error;
          },
          collection(subName: string) {
            const subTableName = toSnakeCase(subName);
            const parentField = tableName === 'companies' ? 'company_id' : (tableName === 'users' ? 'user_id' : null);
            return {
              async add(data: any) {
                const dbData = mapKeys(data, toSnakeCase);
                if (parentField) {
                  dbData[parentField] = id;
                }

                

                const { data: inserted, error } = await supabaseAdmin
                  .from(subTableName)
                  .insert([dbData])
                  .select('id')
                  .single();
                if (error) throw error;
                return { id: inserted.id };
              },
              async get() {
                

                let q = supabaseAdmin.from(subTableName).select('*');
                if (parentField) {
                  q = q.eq(parentField, id);
                }
                const { data, error } = await q;
                if (error) throw error;
                return {
                  empty: !data || data.length === 0,
                  size: data?.length || 0,
                  docs: (data || []).map((row: any) => ({
                    ref: { id: row.id },
                    data: () => mapKeys(row, toCamelCase)
                  }))
                };
              }
            };
          }
        };
      },
      where(field: string, op: string, value: any) {
        const q = new QueryBuilder(tableName);
        return q.where(field, op, value);
      },
      async add(data: any) {
        const dbData = mapKeys(data, toSnakeCase);
        
        

        const { data: inserted, error } = await supabaseAdmin
          .from(tableName)
          .insert([dbData])
          .select('id')
          .single();
        if (error) throw error;
        return { id: inserted.id, ref: this.doc(inserted.id).ref };
      },
      batch() {
        const updates: Array<{ ref: any, data: any }> = [];
        return {
          update(ref: any, data: any) {
            updates.push({ ref, data });
          },
          async commit() {
            // F-16 FIX: Real bulk upsert grouped by table — not a sequential loop.
            const grouped = new Map<string, Array<{ id: string; [key: string]: any }>>();
            for (const item of updates) {
              const tbl = toSnakeCase(item.ref.collectionName);
              const row = { id: item.ref.id, ...mapKeys(item.data, toSnakeCase) };
              if (!grouped.has(tbl)) grouped.set(tbl, []);
              grouped.get(tbl)!.push(row);
            }
            for (const [table, rows] of grouped) {
              const { error } = await supabaseAdmin.from(table).upsert(rows);
              if (error) throw new Error(`Batch commit failed on table '${table}': ${error.message}`);
            }
          }
        };
      }
    };
  },
  batch() {
    const updates: Array<{ ref: any, data: any }> = [];
    return {
      update(ref: any, data: any) {
        updates.push({ ref, data });
      },
      async commit() {
        // F-16 FIX: Real bulk upsert grouped by table — not a sequential loop.
        // Groups all updates by collection name and sends one upsert per table,
        // giving near-atomic behaviour (single round-trip per table).
        const grouped = new Map<string, Array<{ id: string; [key: string]: any }>>();
        for (const item of updates) {
          const tbl = toSnakeCase(item.ref.collectionName);
          const row = { id: item.ref.id, ...mapKeys(item.data, toSnakeCase) };
          if (!grouped.has(tbl)) grouped.set(tbl, []);
          grouped.get(tbl)!.push(row);
        }
        for (const [table, rows] of grouped) {
          const { error } = await supabaseAdmin.from(table).upsert(rows);
          if (error) throw new Error(`Batch commit failed on table '${table}': ${error.message}`);
        }
      }
    };
  }
};

// Decoupled Supabase token authentication check helper
export const auth = {
  verifyIdToken: async (idToken: string) => {
    if (!idToken) throw new Error("Missing ID Token");
    
    

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(idToken);
    if (error || !user) {
      throw error || new Error("Failed to verify user ID Token on Supabase Auth server");
    }
    
    return {
      uid: user.id,
      email: user.email,
      name: String(user.user_metadata?.display_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User').replace(/[\r\n]/g, '').trim()
    };
  },
  revokeRefreshTokens: async (userId: string) => {
    if (isPlaceholder) return;
    await supabaseAdmin.auth.admin.signOut(userId);
  }
};

// Inbound lead processing logic (migrated from server.ts)
export async function processInboundLead(companyId: string, source: string, payload: any) {
  console.log(`[Ingestion Engine] Inbound lead from ${source} for company ${companyId}:`, payload);
  
  const sourceQuery = await db.collection("lead_sources")
    .where("companyId", "==", companyId)
    .where("sourceType", "==", source.toLowerCase())
    .get();

  let mapping: Record<string, string> = {};
  let automationRules = { mode: 'RoundRobin', skipOfflineAgents: true };

  if (!sourceQuery.empty) {
    const sourceData = sourceQuery.docs[0].data();
    mapping = sourceData.fieldMapping || {};
    automationRules = sourceData.automationRules || automationRules;
  } else {
    if (source.toLowerCase() === 'facebook') {
      mapping = { full_name: 'name', phone_number: 'phone', email: 'email', city: 'city' };
    } else if (source.toLowerCase() === 'indiamart') {
      mapping = { SENDER_NAME: 'name', SENDER_MOBILE: 'phone', SENDER_EMAIL: 'email', QUERY_MESSAGE: 'comment', SENDER_CITY: 'city' };
    } else {
      mapping = { name: 'name', phone: 'phone', email: 'email', comment: 'comment' };
    }
  }

  const leadData: any = {};
  Object.keys(payload).forEach(key => {
    const targetField = mapping[key];
    if (targetField && targetField !== 'doNotMap') {
      leadData[targetField] = payload[key];
    } else if (!targetField) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === 'name' || cleanKey === 'fullname' || cleanKey === 'sendername') {
        leadData.name = payload[key];
      } else if (cleanKey === 'phone' || cleanKey === 'mobile' || cleanKey === 'sendermobile' || cleanKey === 'phonenumber') {
        leadData.phone = payload[key];
      } else if (cleanKey === 'email' || cleanKey === 'senderemail') {
        leadData.email = payload[key];
      } else if (cleanKey === 'city' || cleanKey === 'sendercity') {
        leadData.city = payload[key];
      } else if (cleanKey === 'comment' || cleanKey === 'remarks' || cleanKey === 'querymessage' || cleanKey === 'message') {
        leadData.comment = payload[key];
      }
    }
  });

  if (!leadData.name && payload.name) leadData.name = payload.name;
  if (!leadData.phone && payload.phone) leadData.phone = payload.phone;

  if (!leadData.phone) {
    throw new Error("Validation Failed: Incoming lead does not contain a phone number.");
  }

  let phone = String(leadData.phone).replace(/\D/g, '');
  if (phone.length === 10) {
    phone = '+91' + phone;
  } else if (phone.length > 10 && !phone.startsWith('+')) {
    phone = '+' + phone;
  }
  leadData.phone = phone;

  if (leadData.email) {
    leadData.email = String(leadData.email).trim().toLowerCase();
  }
  if (leadData.name) {
    leadData.name = String(leadData.name).trim().replace(/\b\w/g, c => c.toUpperCase());
  }

  const teamSettingsSnap = await db.collection("team_settings").doc(companyId).get();
  const teamSettings = teamSettingsSnap.exists ? teamSettingsSnap.data() : {};

  // team_settings holds company_id, require_approval, assignment_mode,
  // rotting_threshold, hide_phone_numbers, device_limit, leads_statuses and
  // default_stage -- queried, not assumed.
  //
  // This block used to read assignmentRule, activeAgentIds, smartDeduplication,
  // dedupeWindowDays, holdNightLeads, nightHours and categoryAgentMap. Only one
  // of those has a column, and it is spelled assignment_mode. So `assignmentMode`
  // resolved to 'Manual' on every company no matter what they had chosen, and
  // the `assignmentMode === 'RoundRobin'` branch below could never be reached --
  // inbound leads were never auto-assigned to anybody.
  //
  // The rest are constants until there is a column to put them in. Reading a
  // field that is always undefined is not a setting; it is a default wearing a
  // setting's name.
  const assignmentMode = teamSettings.assignmentMode || 'Manual';
  const activeIds: string[] = [];
  const smartDedupe = true;
  const dedupeWindow = 7;
  const holdNight = false;
  const nightEnd = '08:00';

  const dupCheck = await db.collection("leads")
    .where("phone", "==", phone)
    .where("companyId", "==", companyId)
    .limit(1)
    .get();

  let leadId = '';
  let isDuplicate = false;
  let assignedAgentId = null;

  if (!dupCheck.empty && smartDedupe) {
    const matchDoc = dupCheck.docs[0];
    const data = matchDoc.data();
    let createdTime: Date;
    if (data.createdAt?.seconds) {
      createdTime = new Date(data.createdAt.seconds * 1000);
    } else if (data.createdAt) {
      createdTime = new Date(data.createdAt);
    } else {
      createdTime = new Date();
    }
    const differenceDays = (new Date().getTime() - createdTime.getTime()) / (1000 * 3600 * 24);

    if (differenceDays <= dedupeWindow) {
      isDuplicate = true;
      leadId = matchDoc.ref.id;
      assignedAgentId = data.assignedTo || null;

      await db.collection("leads").doc(leadId).update({
        comment: (data.comment ? data.comment + '\n' : '') + `[Duplicate ingestion from ${source}]: ` + (leadData.comment || ''),
        updatedAt: FieldValue.serverTimestamp(),
        isUnseen: true
      });
    }
  }

  // holdUntil is gone with the column that never existed. hold_outbound_trigger
  // is the whole state: the release cron in src/routes/leads.ts clears it.
  let holdOutboundTrigger = false;

  if (holdNight) {
    const currentHour = new Date().getHours();
    const startH = 22;
    const endH = parseInt(nightEnd.split(':')[0]);

    const inNightWindow = startH > endH
      ? (currentHour >= startH || currentHour < endH)
      : (currentHour >= startH && currentHour < endH);

    if (inNightWindow) {
      holdOutboundTrigger = true;
      console.log(`[Night Hold Queue] Lead held. Scheduled release at ${nightEnd}.`);
    }
  }

  if (!isDuplicate) {
    let categoryName = 'General';
    const commentText = (leadData.comment || '').toLowerCase();
    if (commentText.includes('vip') || commentText.includes('luxury') || commentText.includes('high value')) {
      categoryName = 'VIP';
    } else if (commentText.includes('commercial') || commentText.includes('office') || commentText.includes('shop')) {
      categoryName = 'Commercial';
    }

    const usersSnap = await db.collection("users").where("companyId", "==", companyId).get();
    const allAgents = usersSnap.docs
      .map(d => ({ uid: d.ref.id, ...d.data() }))
      .filter((u: any) => u.role !== 'admin' && u.role !== 'founder');

    let routedAgents = [...allAgents];

    let skillMatch = '';
    if (commentText.includes('villa')) skillMatch = 'villa';
    else if (commentText.includes('commercial')) skillMatch = 'commercial';
    else if (commentText.includes('budget') || commentText.includes('high value')) skillMatch = 'luxury';

    if (skillMatch) {
      const matchingSkill = allAgents.filter((a: any) => a.skills && Array.isArray(a.skills) && a.skills.includes(skillMatch));
      if (matchingSkill.length > 0) {
        routedAgents = matchingSkill;
      }
    }

    if (leadData.city) {
      const matchingCity = routedAgents.filter((a: any) => a.coverageCities && Array.isArray(a.coverageCities) && a.coverageCities.map((c: string) => c.toLowerCase()).includes(leadData.city.toLowerCase()));
      if (matchingCity.length > 0) {
        routedAgents = matchingCity;
      }
    }

    if (activeIds.length > 0) {
      routedAgents = routedAgents.filter((a: any) => activeIds.includes(a.uid));
    }

    // categoryAgentMap has no column on team_settings, so this filter was
    // always a no-op. categoryName is still computed above and is worth keeping
    // for the day there is somewhere to store the mapping.
    void categoryName;

    // Spelling has to be forgiving: team_settings.assignment_mode defaults to
    // 'round_robin' in the schema while the Integrations panel saves
    // 'RoundRobin'. Comparing exactly meant every company still on the schema
    // default -- which reads as Round Robin to a person -- fell through to
    // Manual. The edge functions use the same normalisation in
    // supabase/functions/_shared/assignLead.ts, so the two paths cannot
    // disagree about what Round Robin means.
    const wantsRoundRobin =
      String(assignmentMode ?? '').replace(/[^a-z]/gi, '').toLowerCase() === 'roundrobin';

    if (wantsRoundRobin && routedAgents.length > 0) {
      let nextIndex = 0;
      if (!isPlaceholder) {
        const { data: indexVal, error: rpcErr } = await supabaseAdmin.rpc('increment_routing_index', {
          p_company_id: companyId,
          p_source: source.toLowerCase(),
          p_agent_count: routedAgents.length
        });
        if (!rpcErr && typeof indexVal === 'number') {
          nextIndex = indexVal;
        } else {
          console.error('[Routing Error] RPC atomic increment failed, falling back to local calculation:', rpcErr);
          const routeRef = db.collection("routing_state").doc(`${companyId}_${source.toLowerCase()}`);
          const routeDoc = await routeRef.get();
          const lastIndex = routeDoc.exists ? (routeDoc.data().lastAssignedIndex || 0) : 0;
          nextIndex = (lastIndex + 1) % routedAgents.length;
          await routeRef.set({
            lastAssignedIndex: nextIndex,
            companyId,
            source: source.toLowerCase(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
      } else {
        const routeRef = db.collection("routing_state").doc(`${companyId}_${source.toLowerCase()}`);
        const routeDoc = await routeRef.get();
        const lastIndex = routeDoc.exists ? (routeDoc.data().lastAssignedIndex || 0) : 0;
        nextIndex = (lastIndex + 1) % routedAgents.length;
        await routeRef.set({
          lastAssignedIndex: nextIndex,
          companyId,
          source: source.toLowerCase(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
      assignedAgentId = routedAgents[nextIndex].uid;
    }

    // isNew and holdUntil are gone. mapKeys snake_cases every key, and neither
    // is_new nor hold_until exists on leads -- so this insert raised 42703 and
    // every inbound lead from Meta Ads, IndiaMART or a plain webhook was lost
    // at the first write. is_unseen already carries what is_new was for.
    const newLead = {
      companyId,
      name: leadData.name || 'Unknown Lead',
      phone: leadData.phone,
      email: leadData.email || '',
      city: leadData.city || '',
      comment: leadData.comment || '',
      source,
      status: 'New',
      assignedTo: assignedAgentId,
      isUnseen: true,
      holdOutboundTrigger,
      createdAt: FieldValue.serverTimestamp()
    };

    const added = await db.collection("leads").add(newLead);
    leadId = added.id;
  }

  // The ingestion trail goes to lead_activity_log, not import_logs.
  //
  // import_logs is the CSV importer's table -- (company_id, filename, row_count,
  // status), with filename NOT NULL. The four extra columns this used to write
  // (source, lead_id, assigned_to, routing_reason) do not exist on it, so the
  // insert failed even when the lead itself had gone in, and the trail was
  // empty for every webhook lead ever received.
  if (leadId) {
    const { error: trailError } = await supabaseAdmin.from('lead_activity_log').insert({
      company_id: companyId,
      lead_id: leadId,
      activity_type: isDuplicate ? 'duplicate_merged' : 'lead_ingested',
      description: isDuplicate
        ? `Merged into an existing lead by phone, within the ${dedupeWindow}-day window, from ${source}`
        : (assignedAgentId
            ? `Received from ${source} and assigned by round-robin`
            : `Received from ${source} and left unassigned`),
      created_by: assignedAgentId,
    });
    // Logged, not thrown. The lead is already saved; losing its trail line is
    // not a reason to make the sender retry and create a duplicate.
    if (trailError) console.error('[Ingestion Engine] activity trail not written:', trailError.message);
  }

  // The welcome-template dispatch that used to sit here logged
  // "[WhatsApp Welcome Template Dispatch] Template sent" and sent nothing --
  // there is no send call in it, and its two settings, welcomeTemplate and
  // welcomeTemplateVariables, have no columns on team_settings, so the branch
  // could not be entered in the first place. A log line claiming a message went
  // out is worse than silence when reading the logs is how you check.

  return { leadId, isDuplicate, assignedTo: assignedAgentId };
}
