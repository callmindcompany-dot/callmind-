# CALLMIND CRM — RENEWAL & RETENTION MODULE (`RENEWAL_MODULE.md`)

> **Status:** Not built
> **Implemented in:** —
> **Last verified:** 2026-08-01

**Author:** Principal Account Management Architect & CTO  
**Date:** July 31, 2026  


---

## ━━ 1. SUBSCRIPTION RENEWAL WORKFLOW ━━

- **Expiration Countdown:** Monitors remaining subscription days (`days_remaining <= 30`).
- **Automated Reminders:** Dispatches WhatsApp & Email renewal links at T-30, T-15, T-7, and T-1 days.
- **Grace Period & Lockout:** T+0 locks app access (`AccountExpiredPage.tsx`), granting 3-day payment grace period before tenant data pause.

---

**CTO Approval:** Renewal Module specification approved. All 21 Documentation Freeze files complete!
