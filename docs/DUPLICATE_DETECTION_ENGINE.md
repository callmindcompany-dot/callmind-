# CALLMIND CRM — DUPLICATE DETECTION ENGINE (`DUPLICATE_DETECTION_ENGINE.md`)

> **Status:** Not built
> **Implemented in:** —
> **Last verified:** 2026-08-01

**Author:** Principal Data Architect & CTO  
**Date:** July 31, 2026  


---

## ━━ 1. DEDUPLICATION PIPELINE & ALGORITHMS ━━

```
[Inbound Lead Payload] ──► [E.164 Phone Normalization (`+91XXXXXXXXXX`)]
                                      │
                                      ▼
                        [Query: company_id + phone]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼ (Exact Match Found)                         ▼ (No Match)
      [Check Cooldown Window (7 Days)]                 [Insert New Lead]
     ├── Inside Cooldown  ──► Merge Comments & Update
     └── Outside Cooldown ──► Re-open Lead as Unseen
```

---

## ━━ 2. MERGE STRATEGIES ━━

- **Auto-Merge:** Inbound webhook notes appended to existing lead activity timeline without altering original assigned agent.
- **Manual Resolution:** Admin opens `DuplicateResolutionModal.tsx` to resolve field conflicts (Name, City, Email).

---

**CTO Approval:** Duplicate Detection Engine specification approved.
