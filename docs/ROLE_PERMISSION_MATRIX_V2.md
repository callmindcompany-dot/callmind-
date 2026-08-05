# CALLMIND CRM — ROLE & PERMISSION MATRIX V2 (`ROLE_PERMISSION_MATRIX_V2.md`)

**Author:** Principal Security Architect & CTO  
**Date:** July 31, 2026  
**Target System:** CallMind Multi-Tenant AI CRM Monorepo  
**Security Standard:** Enterprise Class RBAC & Field-Level Security (FLS)

---

## ━━ 1. FIVE-TIER ROLE HIERARCHY OVERVIEW ━━

CallMind enforces strict multi-tenant Row-Level Security (RLS) across 5 distinct user roles:

1. **`founder`**: Tenant Owner / Executive Admin with unrestricted company data & financial permissions.
2. **`sub_admin`**: Operations Lead / Co-Admin with manager-level administrative privileges.
3. **`floor_manager`**: Sales Floor Supervisor overseeing pods, telecallers, attendance, & SLAs.
4. **`team_lead`**: Pod Leader managing a specific squad of telecallers.
5. **`telecaller`**: Frontline Mobile SIM Agent handling lead calls, callbacks, & post-call dispositions.

---

## ━━ 2. GRANULAR CRUD & ACTION PERMISSION MATRIX ━━

| Capability / Module | Founder | Sub Admin | Floor Manager | Team Lead | Telecaller |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`leads:create` (Single)** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Quick Create Only |
| **`leads:import_csv` (Bulk)**| ✅ Full | ✅ Full | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`leads:read_all`** | ✅ Company-wide| ✅ Company-wide| ✅ Floor Pool | ✅ Pod Pool | ❌ Assigned Only |
| **`leads:update_status`** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Assigned Only |
| **`leads:reassign`** | ✅ Any User | ✅ Any User | ✅ Floor Agents | ✅ Pod Agents | ❌ Blocked |
| **`leads:export_csv`** | ✅ Full | ✅ Full | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`leads:delete_soft`** | ✅ Allowed | ✅ Allowed | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`leads:purge_hard`** | ✅ Allowed | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`calls:dial` (SIM Intent)** | ✅ Web Link | ✅ Web Link | ✅ Web Link | ✅ Native SIM | ✅ Native SIM |
| **`calls:view_logs`** | ✅ Company-wide| ✅ Company-wide| ✅ Floor Logs | ✅ Pod Logs | ❌ Personal Only |
| **`team:manage_users`** | ✅ Full | ✅ Full | ❌ Read Only | ❌ Read Only | ❌ Blocked |
| **`billing:manage_plan`** | ✅ Full | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`audit_logs:read`** | ✅ Full | ✅ Full | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`reports:view_executive`**| ✅ Full | ✅ Full | ✅ Summary | ❌ Blocked | ❌ Blocked |
| **`ai:configure_keys`** | ✅ Full | ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| **`documents:upload`** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Upload Only (Presign) |
| **`documents:read_url`** | ✅ Full Presigned | ✅ Full Presigned | ✅ Full Presigned | ✅ Full Presigned | ❌ Blocked (Status Only) |
| **`documents:review_queue`**| ✅ Full Review | ✅ Full Review | ✅ Pod Review | ❌ Blocked | ❌ Blocked |
| **`documents:download_bundle`**| ✅ Full PDF Bundle| ✅ Full PDF Bundle| ❌ Blocked | ❌ Blocked | ❌ Blocked (403 Error) |
| **`founder_hub:access`** | ❌ Blocked (Client)| ❌ Blocked | ❌ Blocked | ❌ Blocked | ❌ Blocked |

---

## ━━ 3. FIELD-LEVEL SECURITY (FLS) & DATA MASKING ━━

- **Phone Number Masking:** Telecallers view masked phone numbers (`+91 98*** **210`) on Web CRM to prevent data theft. Numbers unmask automatically during native SIM dialing on mobile.
- **Deal Amount Visibility:** Telecallers view deal category (`Low`, `Medium`, `High`); numerical value (`₹1,50,000`) is restricted to Team Leads and above.
- **Razorpay Credentials:** Encryption keys stored in `integrations` table accessible ONLY via Server-side Service Role.

---

## ━━ 4. SAAS PLATFORM PROVIDER FOUNDER HUB RESTRICTION ━━

> [!CAUTION]
> **STRICT SECURITY RULE — SAAS PROVIDER OWNER EXCLUSIVITY:**
> - **`FounderHub` (`/founder-hub`)** is exclusively reserved for the **SaaS Platform Provider Company Owners (Founders & Co-Founders)** who built and own the CallMind CRM application.
> - **Zero Client Company Access:** No client company user — including Client Tenant Founders, Sub-Admins, Managers, or Telecallers — is permitted access to `FounderHub`.
> - **Access Guard:** Enforced via `hasFounderHubAccess` (`isSuperFounder = true`) check in `ProtectedRoute.tsx`, `AuthModal.tsx`, `Sidebar.tsx`, and `App.tsx`.
> - Client Tenant Founders are restricted to their own tenant workspace (`/dashboard`) and cannot access platform-level MRR, multi-tenant analytics, system audit logs, or testing labs.

---

**CTO Approval:** Certified and locked for production deployment across Supabase RLS policies and UI component `<ProtectedRoute>` wrappers.
