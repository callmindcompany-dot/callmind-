# CallMind CRM — Enterprise Branch & Region Hierarchy System (`BRANCH_REGION_HIERARCHY.md`)

> **Status:** Built
> **Implemented in:** `src/routes/hierarchy.ts`, `src/services/hierarchy.service.ts`, `src/components/hierarchy/`, `supabase/migrations/20260801020000_enterprise_branch_hierarchy.sql`
> **Last verified:** 2026-08-01

**Author:** Software Architect & CTO  
**Date:** August 1, 2026  


---

## ━━ 1. OVERVIEW & ARCHITECTURE ━━

The **Enterprise Branch / Region Hierarchy System** introduces multi-level organizational modeling into CallMind CRM for enterprise clients while remaining **100% optional** (Default = OFF).

When disabled, CallMind CRM operates in standard single-branch mode with zero UI clutter, extra columns, or performance overhead. When enabled via **Company Settings ➔ Organization & Structure**, enterprise tenants unlock multi-branch data isolation, city-to-branch lead auto-matching, regional filter scoping, and department routing.

---

## ━━ 2. HIERARCHY TOPOLOGY ━━

```
Company (Tenant)
  └─► Region (Optional: West, North, South)
        └─► State (Optional: Maharashtra, Gujarat)
              └─► Branch (Pune, Mumbai, Delhi)
                    └─► Department (Sales, Support, Operations)
                          └─► Team (Sales Pod A)
                                └─► Users (Telecallers, Managers, Admins)
```

---

## ━━ 3. DATABASE SCHEMA & RLS POLICIES ━━

- **Migration File:** `supabase/migrations/20260801020000_enterprise_branch_hierarchy.sql`
- **Tables Created:**
  - `regions` (`id`, `company_id`, `name`, `code`, `is_active`)
  - `states_hierarchy` (`id`, `company_id`, `region_id`, `name`, `code`, `is_active`)
  - `branches` (`id`, `company_id`, `region_id`, `state_id`, `name`, `code`, `city`, `address`, `is_main_branch`, `is_active`)
  - `departments` (`id`, `company_id`, `branch_id`, `name`, `code`, `is_active`)
- **Foreign Keys Added:**
  - `users` (`region_id`, `state_id`, `branch_id`, `department_id`)
  - `teams` (`branch_id`, `department_id`)
  - `leads` (`region_id`, `state_id`, `branch_id`, `department_id`)
  - `calls`, `invoices`, `tasks` (`branch_id`)
- **Multi-Tenant RLS Policies:**
  - `company_id = public.get_my_company_id()` enforced on all hierarchy tables.
- **Auto-Migration:**
  - `migrate_existing_company_branches()` function auto-creates a default "Main Branch" record for pre-existing company tenants to ensure zero broken references.

---

## ━━ 4. BACKEND & REST API ━━

- **Service:** `src/services/hierarchy.service.ts` (`HierarchyService`)
- **Router:** `src/routes/hierarchy.ts` (`/api/hierarchy`)
- **Endpoints:**
  - `GET /api/hierarchy` — Retrieves complete hierarchy tree for active tenant.
  - `PATCH /api/hierarchy/settings` — Toggles `enable_branch_management` state.
  - `POST /api/hierarchy/regions` — Creates region node.
  - `POST /api/hierarchy/branches` — Creates branch node with parent region validation.
  - `POST /api/hierarchy/departments` — Creates department node within a branch.

---

## ━━ 5. USER INTERFACE COMPONENTS ━━

1. **`OrganizationHierarchySettings.tsx`**:
   - Centralized hub tab inside `SettingsPage.tsx` under **"Organization & Structure"**.
   - Features Master Toggle switch, Tree Manager, and Branch/Region/Department modals.

2. **`HierarchyFilterBar.tsx`**:
   - Reusable top filter dropdown (`Region ➔ Branch`) mounted on `Dashboard.tsx`, `ReportsPage.tsx`, and `AnalyticsPage.tsx`.
   - Renders `null` when branch management is OFF.

3. **`LeadsPage.tsx`**:
   - Displays minimal `📍 Branch` badge on lead items when hierarchy is enabled.
   - Includes optional Branch column selection in table customizer.

4. **`LeadListScreen.tsx` (Mobile App)**:
   - Scopes telecaller lead lists and displays `📍 Branch` tag on mobile lead cards.

---

## ━━ 6. AUTOMATED TEST COVERAGE ━━

- **Test Suite:** `src/__tests__/hierarchy.test.ts`
- **Scenarios Tested:**
  - Feature toggle state (OFF vs ON)
  - Parent-child tree node creation & validation
  - City-to-Branch Auto-Matching engine (`autoMatchLeadBranch`)
  - Multi-tenant data isolation
