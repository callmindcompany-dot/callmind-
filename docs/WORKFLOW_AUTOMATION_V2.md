# CALLMIND CRM — WORKFLOW AUTOMATION ENGINE V2 (`WORKFLOW_AUTOMATION_V2.md`)

**Author:** Principal Automation Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Supabase Deno Edge Functions + PostgreSQL Event Triggers

---

## ━━ 1. AUTOMATION PIPELINE ARCHITECTURE ━━

```
[System Event / Cron] ──► [Evaluate Rule JSON Conditions]
                                   │
                ┌──────────────────┴──────────────────┐
                ▼ (Conditions True)                   ▼ (Conditions False)
     [Execute Action Queue]                     [Log Ignored Event]
     ├── Action 1: WhatsApp Template
     ├── Action 2: Auto-Assign User
     └── Action 3: Audit Trail Log
```

---

## ━━ 2. CORE AUTOMATION RULES ━━

### Rule 101: Instant Welcome Drip
- **Trigger:** `lead.created`
- **Condition:** `source IN ('indiamart', 'facebook', 'website')`
- **Actions:** Dispatch WhatsApp welcome template + Email introduction brochure.

### Rule 102: Lead Rotting Auto-Reassignment
- **Trigger:** Scheduled Cron (Every 15 mins)
- **Condition:** `status = 'New' AND NOW() - created_at > INTERVAL '48 hours'`
- **Actions:** Reassign lead to next online agent in pod; notify Floor Manager.

### Rule 103: Overdue Callback Escalation
- **Trigger:** Scheduled Cron (Every 10 mins)
- **Condition:** `status = 'Call Back' AND callback_time < NOW() - INTERVAL '2 hours'`
- **Actions:** Flag lead `is_overdue = true`; alert Floor Manager via push notification.

### Rule 104: High-Value VIP Lead Escalation
- **Trigger:** `lead.created` OR `lead.updated`
- **Condition:** `deal_value >= 100000 INR`
- **Actions:** Assign lead directly to Senior Manager (`sub_admin`); trigger sound chime.

---

**CTO Approval:** Workflow Engine V2 spec locked for Deno Edge Function execution.
