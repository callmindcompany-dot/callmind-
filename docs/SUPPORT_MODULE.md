# CALLMIND CRM — CUSTOMER SUPPORT MODULE (`SUPPORT_MODULE.md`)

**Author:** Principal Support Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Support Desk, Ticket Routing, & CSAT Analytics

---

## ━━ 1. TICKET LIFECYCLE & SLA ENGINE ━━

- **Intake Channels:** In-app chat (`ChatInbox.tsx`) & Support Desk (`SupportPage.tsx`).
- **SLA Response Target:** First response < 15 minutes; Resolution < 4 hours.
- **AI Self-Help:** Gemini AI suggests relevant Knowledge Base articles automatically.
- **Escalation Rules:** Unresolved tickets > 2 hours automatically escalate to `sub_admin`.

---

**CTO Approval:** Support Module specification approved.
