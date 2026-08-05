# CALLMIND CRM — CUSTOMER LIFECYCLE ARCHITECTURE (`CUSTOMER_LIFECYCLE.md`)

**Author:** Principal CRM Solution Architect & CTO  
**Date:** July 31, 2026  
**Target System:** CallMind Multi-Tenant AI CRM Monorepo  
**Standard:** Enterprise Class Customer Lifecycle Governance

---

## ━━ 1. LIFECYCLE STATE FLOW DIAGRAM ━━

```
 [1. Ingested] ──► [2. Assigned] ──► [3. Contacted] ──► [4. Follow-up] ──► [5. Demo Scheduled]
                                                                                   │
 [10. Renewal] ◄── [9. Active Customer] ◄── [8. Closed Won] ◄── [7. Negotiation] ◄── [6. Proposal Sent]
       │
       ├── (Churned) ──► [11. Account Paused]
       └── (Re-engaged) ──► [12. Referral / Upsell]
```

---

## ━━ 2. STAGE DEFINITIONS & TRANSITION RULES ━━

### Stage 1: Ingested (`New`)
- **Trigger:** Webhook intake (IndiaMART, JustDial, Meta) or CSV import.
- **Rules:** E.164 phone normalization, 24-hour duplicate check.
- **Target SLA:** Assignment within 30 seconds.

### Stage 2: Assigned (`Assigned`)
- **Trigger:** Round-Robin router or manual supervisor assignment.
- **Rules:** Active online agent verification (`agent_status`).
- **Target SLA:** First call attempt within 15 minutes (Speed-to-Lead).

### Stage 3: Contacted (`Contacted` / `In Progress`)
- **Trigger:** Native Android SIM dial completed + Post-Call Disposition submitted.
- **Rules:** Outcome classification (`connected`, `busy`, `no_answer`).
- **AI Action:** Gemini AI generates 2-sentence call summary.

### Stage 4: Follow-Up (`Call Back`)
- **Trigger:** Telecaller schedules callback date & time.
- **Rules:** Push alert dispatched 10 minutes prior to callback.
- **Escalation:** Overdue > 2 hours alerts Floor Manager.

### Stage 5: Demo Scheduled (`Demo Scheduled`)
- **Trigger:** Meeting date, time, & URL logged.
- **Rules:** Automated WhatsApp & Email calendar invite sent.

### Stage 6: Proposal Sent (`Quotation`)
- **Trigger:** Commercial pricing & scope PDF generated.
- **Rules:** Stored in Supabase Storage with trackable link.

### Stage 7: Commercial Negotiation (`Negotiation`)
- **Trigger:** Prospect requests price adjustments.
- **Rules:** Discounts > 15% require Founder digital sign-off.

### Stage 8: Closed Won (`Converted` / `Won`)
- **Trigger:** Proposal accepted; Payment/Invoice created.
- **Rules:** Confetti animation on mobile; Lead locked from edits.

### Stage 9: Active Customer (`Customer`)
- **Trigger:** Invoice marked `Paid`.
- **Rules:** Subscription seats activated; CSAT survey sent.

### Stage 10: Renewal & Retention (`Renewal`)
- **Trigger:** Subscription validity <= 30 days remaining.
- **Rules:** Automated T-30, T-15, T-7, T-1 renewal drips.

---

**CTO Approval:** Customer Lifecycle Architecture approved for state machine implementation.
