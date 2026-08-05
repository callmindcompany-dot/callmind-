# CALLMIND CRM — NOTIFICATION CENTER SPECIFICATION (`NOTIFICATION_CENTER.md`)

**Author:** Principal Realtime Architect & CTO  
**Date:** July 31, 2026  
**Target System:** Supabase Realtime + Expo Push + In-App Bell Center

---

## ━━ 1. MULTI-CHANNEL DISPATCH ARCHITECTURE ━━

```
[System Event] ──► [Notification Dispatch Engine]
                          ├── Channel 1: Expo Push Alert (Mobile Device)
                          ├── Channel 2: Realtime Web Socket Toast (Web CRM)
                          ├── Channel 3: Meta WhatsApp Business API (Customer)
                          └── Channel 4: SMTP Email Gateway
```

---

## ━━ 2. NOTIFICATION TYPES & PREFERENCES ━━

- **Lead Assignment Alerts:** Push + Bell Toast (Priority: High).
- **Callback Reminders:** Push + Sound Chime at T-10 mins (Priority: High).
- **VIP Lead Intake:** Sound Chime + Red Toast to Managers (Priority: Critical).
- **Deal Won Announcement:** Celebration Confetti Banner in `TeamAnnouncementsSection.tsx`.

---

**CTO Approval:** Notification Center specification locked for Web & Mobile builds.
