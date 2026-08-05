# CALLMIND CRM — AUDIT & ACTIVITY FEED SYSTEM (`ACTIVITY_FEED.md`)

**Author:** Principal UI/UX Architect & CTO  
**Date:** July 31, 2026  
**Target System:** `lead_activity` PostgreSQL Table + Timeline UI Renderer

---

## ━━ 1. TIMELINE EVENT CLASSIFICATION ━━

The Activity Feed provides an immutable chronological stream of every interaction recorded for a lead record.

- **📞 Call Events:** Call initiated, call duration, SIM slot used, disposition outcome, AI call summary.
- **📝 Note Events:** Telecaller manual notes, voice dictations, manager instructions.
- **🔄 Status Events:** Stage changes (`New` ➔ `Assigned` ➔ `Contacted` ➔ `Won`).
- **📅 Meeting Events:** Demo scheduled, meeting link created, attendance marked (`Show` / `No Show`).
- **📄 Quotation Events:** Commercial proposal generated, PDF downloaded by prospect.

---

## ━━ 2. UI RENDERER & FILTERS ━━

- Rendered via `26_ActivityTimelineScreen.tsx` on Mobile & Lead Detail Drawer on Web CRM.
- Supports instant filtering by category: `Calls Only`, `Notes Only`, `Status Changes`.

---

**CTO Approval:** Activity Feed Architecture approved for production.
