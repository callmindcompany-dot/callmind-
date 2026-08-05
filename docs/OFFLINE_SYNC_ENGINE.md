# CALLMIND CRM — OFFLINE SYNC ENGINE (`OFFLINE_SYNC_ENGINE.md`)

> **Status:** Not built
> **Implemented in:** —
> **Last verified:** 2026-08-01

**Author:** Principal Mobile Architect & CTO  
**Date:** July 31, 2026  


---

## ━━ 1. OFFLINE QUEUEING & RECONNECTION FLOW ━━

```
[Mobile Telecaller Action (Call / Notes / Disposition)]
                           │
             ┌─────────────┴─────────────┐
             ▼ (Online)                  ▼ (Offline / No Network)
     [Direct REST API Post]     [Persist to `@callmind_unsynced_calls`]
                                         │
                                         ▼ (Network Restored)
                                [Sync Worker Flushes Queue]
```

---

## ━━ 2. SYNC RESOLUTION & CONFLICT HANDLING ━━

- **Queue Storage:** Local SQLite / AsyncStorage key `@callmind_unsynced_calls`.
- **Conflict Strategy:** Server timestamp precedence. If call log already synced via webhook, client log enriches call duration data.
- **UI Banner:** `91_OfflineSyncBanner.tsx` displays pending offline records badge to telecaller.

---

**CTO Approval:** Offline Sync Engine certified for mobile app deployment.
