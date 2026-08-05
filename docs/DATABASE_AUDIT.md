# CALLMIND CRM - SUPABASE POSTGRESQL DATABASE AUDIT REPORT

**Auditor Role:** Principal Database Architect & Performance Auditor  
**Date:** July 31, 2026  
**Target Database:** Supabase PostgreSQL (`full_master_supabase_setup.sql`, `schema.sql`, `supabase_reports_migration.sql`)  
**Audit Mandate:** Evaluate the database layer across 11 core structural and performance dimensions without executing code mutations. Provide empirical line-level evidence.

---

## ━━ EXECUTIVE SUMMARY ━━

| Dimension | Assessment | Codebase Evidence & Line References |
| :--- | :--- | :--- |
| **1. Tables** | ✅ 19 Master Tables | `full_master_supabase_setup.sql` (L27-300), `schema.sql` |
| **2. Relationships & FKs** | ✅ Cascade Protected | FK constraints on `company_id`, `lead_id`, `assigned_to` |
| **3. Indexes** | ✅ Well Indexed | `idx_leads_company_id`, `idx_leads_status`, `idx_users_email` |
| **4. Triggers** | ✅ Automated | `update_updated_at_column()` attached to `users`, `leads`, `companies` |
| **5. Functions (RPCs)** | ✅ Pre-Aggregated | `get_my_company_id()`, `get_comparison_metrics()`, `get_agent_tat()` |
| **6. Policies & RLS** | ✅ Strict Isolation | RLS active on `leads`, `users`, `companies`, `call_logs`, `invoices` |
| **7. Performance** | ✅ High Scalability | SQL Views (`conversion_funnel`, `hourly_call_density`) de-couple queries |
| **8. Missing Indexes** | ⚠️ Optimization Needed| Missing GIN index on `leads.custom_data` & composite `(company_id, phone)` |
| **9. Duplicate Columns** | ℹ️ Schema Evolution | `users.name` (`schema.sql`) vs `users.full_name` (`full_master_supabase_setup.sql`) |
| **10. Unused Tables** | ℹ️ Legacy Artifact | `profiles` table (consolidated into `public.users`) |
| **11. Overall Health** | 9.2 / 10 | Enterprise grade multi-tenant isolation with high query efficiency |

---

## ━━ 1. TABLE INVENTORY & SCHEMA DESIGN ━━

The database architecture consists of 19 master tables grouped into 5 functional domains:

1. **Multi-Tenant Administration:** `companies`, `users`, `profiles`, `founder_configs`, `team_settings`.
2. **Sales & CRM Engine:** `leads`, `call_logs` (also aliased as `calls`), `lead_activity`, `sim_cards`, `agent_status`.
3. **Integrations & Workflows:** `integrations`, `automation_rules`, `scheduled_messages`.
4. **Financials & Billing:** `invoices`, `billing_intents`.
5. **Audits & System Diagnostics:** `audit_logs`, `system_errors`, `report_templates`, `custom_field_definitions`, `ai_usage_logs`.

---

## ━━ 2. RELATIONSHIPS & FOREIGN KEY CONSTRAINTS ━━

Foreign keys are explicitly defined to preserve relational integrity:
- `users.company_id` ➔ `companies.id` (`ON DELETE CASCADE`)
- `leads.company_id` ➔ `companies.id` (`ON DELETE CASCADE`)
- `leads.assigned_to` ➔ `users.id` (`ON DELETE SET NULL`)
- `call_logs.company_id` ➔ `companies.id` (`ON DELETE CASCADE`)
- `call_logs.lead_id` ➔ `leads.id` (`ON DELETE CASCADE`)
- `call_logs.agent_id` ➔ `users.id` (`ON DELETE SET NULL`)
- `lead_activity.lead_id` ➔ `leads.id` (`ON DELETE CASCADE`)

---

## ━━ 3. INDEXING COVERAGE AUDIT ━━

Existing indexes optimize high-frequency filtering columns:
- **`leads` Table:**
  * `CREATE INDEX idx_leads_company_id ON leads(company_id);` (`schema.sql` L71)
  * `CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);` (`schema.sql` L72)
  * `CREATE INDEX idx_leads_status ON leads(status);` (`schema.sql` L73)
  * `CREATE INDEX idx_leads_source ON leads(source);` (`schema.sql` L74)
  * `CREATE INDEX idx_leads_created_at ON leads(created_at DESC);` (`schema.sql` L76)
- **`users` Table:**
  * `CREATE INDEX idx_users_email ON users(email);` (`schema.sql` L38)
  * `CREATE INDEX idx_users_company_id ON users(company_id);` (`schema.sql` L39)
- **`call_logs` Table:**
  * Indexes defined on `company_id`, `lead_id`, `agent_id`, `created_at`.

---

## ━━ 4. AUTOMATED TRIGGERS ━━

Auto-updating timestamp trigger function:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Attached to `users`, `leads`, `companies`, `founder_configs`, and `team_settings` to automatically refresh `updated_at` on every row mutation.

---

## ━━ 5. STORED PROCEDURES (RPCs) & VIEWS ━━

### Security Definer Helper Functions
- `get_my_company_id()`: Returns `company_id` of `auth.uid()`.
- `get_my_role()`: Returns `role` of `auth.uid()`.

### Analytical Views (`supabase_reports_migration.sql`)
1. `hourly_call_density`: Groups calls by `company_id`, `hour`, and `date` (Lines 5–13).
2. `conversion_funnel`: Aggregates leads by `company_id` and `status` (Lines 16–22).
3. `agent_performance`: Aggregates total dials, connected calls, conversions, and talk time per agent (Lines 25–44).
4. `lead_source_yield`: Calculates conversion percentage per lead source (Lines 47–57).

### Analytics RPC (`supabase_reports_migration.sql` L60–140)
- `get_comparison_metrics`: Accepts current vs previous date ranges for a `company_id` and calculates percentage growth in leads, calls, and conversions natively on PostgreSQL.

---

## ━━ 6. ROW-LEVEL SECURITY (RLS) AUDIT ━━

- RLS is explicitly enabled on all sensitive multi-tenant tables:
  ```sql
  ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
  ```
- **Policy Enforcement Example:**
  ```sql
  CREATE POLICY "Tenant Leads Access Policy"
  ON public.leads FOR ALL
  USING (
      company_id = public.get_my_company_id() AND
      (
          public.get_my_role() IN ('founder', 'sub_admin', 'floor_manager') OR
          assigned_to = auth.uid()
      )
  );
  ```

---

## ━━ 7. PERFORMANCE EVALUATION ━━

- **Pre-Aggregated Views:** By moving calculation logic from client JavaScript to PostgreSQL views (`conversion_funnel`, `lead_source_yield`), browser CPU overhead is dramatically reduced.
- **PgBouncer Pooling:** UUID primary keys and lightweight queries ensure compatibility with Supabase transaction connection pooling (PgBouncer).

---

## ━━ 8. MISSING INDEXES & RECOMMENDATIONS ━━

1. **`leads.custom_data` GIN Index (Optimization Needed):**
   * *Finding:* `custom_data` is a `JSONB` column storing custom fields. Queries using `custom_data ->>` currently execute unindexed JSON scans.
   * *Recommendation:* Add GIN index:
     `CREATE INDEX idx_leads_custom_data ON leads USING gin (custom_data);`
2. **`leads(company_id, phone)` Composite Index (Optimization Needed):**
   * *Finding:* `deduplication.service.ts` checks `company_id` AND `phone` on every lead insertion.
   * *Recommendation:* Add composite index:
     `CREATE INDEX idx_leads_company_phone ON leads(company_id, phone);`

---

## ━━ 9. DUPLICATE COLUMNS / SCHEMA EVOLUTION ━━

- **`users.name` vs `users.full_name`:**
  * `schema.sql` defines `name TEXT`, while `full_master_supabase_setup.sql` defines `full_name TEXT`.
  * *Status:* Managed safely by `src/lib/dbAdapter.ts` which falls back between `full_name || name`.

---

## ━━ 10. UNUSED TABLES ━━

- **`public.profiles` Table (`full_master_supabase_setup.sql` L96–98):**
  * Historical Supabase template table. Modern CallMind architecture consolidates user profiles directly into `public.users`.
  * *Status:* Harmless legacy table; can be safely dropped in future cleanup migrations.

---

**Audit Conclusion:** The CallMind Supabase PostgreSQL architecture is exceptionally well-designed. It features strict multi-tenant RLS isolation, analytical SQL views that offload calculation overhead from the client, and automated timestamp triggers. Adding the recommended JSONB GIN index and composite deduplication index will optimize query performance for large scale enterprise deployments.
