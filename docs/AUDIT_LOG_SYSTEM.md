# CALLMIND CRM — COMPREHENSIVE AUDIT LOG SYSTEM (`AUDIT_LOG_SYSTEM.md`)

**Author:** Principal Security Architect & CTO  
**Date:** July 31, 2026  
**Target System:** `audit_logs` Table + `AuditLogPage.tsx` Platform Viewer

---

## ━━ 1. AUDIT LOG SCHEMA & TRAIL ━━

Every administrative, security, bulk operation, and financial event logs an immutable JSON audit entry.

```json
{
  "id": "uuid",
  "company_id": "tenant-uuid",
  "actor_id": "user-uuid",
  "actor_role": "sub_admin",
  "action": "LEAD_BULK_EXPORT",
  "target_entity": "leads",
  "metadata": { "record_count": 1500, "ip": "103.21.12.4" },
  "created_at": "2026-07-31T20:25:00Z"
}
```

---

## ━━ 2. MONITORED AUDIT ACTIONS ━━

- `AUTH_IMPERSONATE_LOGIN` (Super Admin tenant login).
- `LEAD_BULK_IMPORT` & `LEAD_BULK_EXPORT`.
- `LEAD_HARD_PURGE` (DPDP Right to be Forgotten).
- `SETTINGS_API_KEY_UPDATE` (IndiaMART, Gemini, Razorpay keys).
- `BILLING_PLAN_UPGRADE` & `DISCOUNT_APPROVED`.

---

**CTO Approval:** Audit Log System specification approved for compliance auditing.
