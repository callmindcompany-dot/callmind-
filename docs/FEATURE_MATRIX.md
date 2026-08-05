# CallMind Feature Capability Matrix

Detailed comparison of functionality supported across the CallMind Web Portal (Admin/CRM) and the Android Mobile Application (Telecaller App).

---

## ━━ 1. LEAD INGESTION & MANAGEMENT ━━

| Feature | Web App (Desktop) | Mobile App (Android) | Technical Notes |
| :--- | :--- | :--- | :--- |
| View Company Leads | ✅ Full Table & Kanban | ❌ Restricted | Mobile only displays leads assigned to logged-in user. |
| View Assigned Leads | ✅ | ✅ Cards & Lists | Synced in real-time via Supabase WebSockets. |
| Create Lead (Single) | ✅ Modal Form | ✅ Quick Create | Both sanitize phone numbers to E.164. |
| Bulk CSV Import | ✅ Drag & Drop | ❌ | Web includes AI Column Auto-Mapper. |
| Smart Deduplication | ✅ Background Check | ✅ Background Check | Prevents duplicate leads within 24hr window. |
| Lead Re-assignment | ✅ Single & Bulk | ❌ | Restricted to Founder, Sub-Admin, and Team Lead. |
| Custom CRM Fields | ✅ Define & Edit | ✅ View & Edit | Rendered dynamically from `custom_field_definitions`. |
| Lead Soft/Hard Delete | ✅ Admin Only | ❌ | Telecallers cannot delete lead records. |
| Activity Timeline | ✅ Full History | ✅ Summary Cards | Complete log of status changes, calls, and notes. |

---

## ━━ 2. TELECOMMUNICATION & DISPOSITION ━━

| Feature | Web App (Desktop) | Mobile App (Android) | Technical Notes |
| :--- | :--- | :--- | :--- |
| Native SIM Calling | ❌ | ✅ One-Tap Intent | Launches native Android phone dialer (`tel:` intent). |
| Dual SIM Card Selector| ❌ | ✅ Slot 1 / Slot 2 | Agent can toggle preferred carrier SIM card. |
| Click-to-WhatsApp | ✅ Web WhatsApp | ✅ Native App Launch| Opens WhatsApp chat with pre-filled message template. |
| Post-Call Disposition | ❌ | ✅ Auto Popup Sheet | Triggered immediately when returning from phone call. |
| Voice Note Recording | ❌ | ✅ Speech-to-Text | Agent can dictate notes instead of typing. |
| AI Call Summarization | ✅ View Summaries | ✅ Trigger Summary | Sends raw notes to Gemini API via Express server. |
| Scheduled Callbacks | ✅ View Reminders | ✅ Push Alerts | Fires local device notification at scheduled time. |

---

## ━━ 3. ATTENDANCE & TEAM MANAGEMENT ━━

| Feature | Web App (Desktop) | Mobile App (Android) | Technical Notes |
| :--- | :--- | :--- | :--- |
| GPS Location Clock-in | ❌ | ✅ Camera + GPS | Enforces physical presence verification at shift start. |
| Selfie Punch Verification| ❌ | ✅ Front Camera | Uploads image to Supabase Storage bucket. |
| Real-time Agent Status| ✅ Online/Offline Grid| ✅ Toggle Status | Shows who is currently calling, on break, or offline. |
| Team Invite Code Gen | ✅ 6-Digit Join Code | ❌ Enter Join Code | Agent enters code on mobile; Admin approves on web. |
| Remote Device Logout | ✅ One-Click Wipe | ❌ | Instantly invalidates JWT token on target mobile device. |

---

## ━━ 4. ANALYTICS & REPORTING ━━

| Feature | Web App (Desktop) | Mobile App (Android) | Technical Notes |
| :--- | :--- | :--- | :--- |
| Executive Dashboard | ✅ High Level KPIs | ❌ | Total Leads, Conversion Rate, Pipeline Value. |
| Telecaller Leaderboard | ✅ Full Company | ✅ Personal Rank | Compares daily total calls, talk time, and wins. |
| Speed-to-Lead (TAT) | ✅ Detailed Graph | ❌ | Tracks duration between lead creation and 1st call. |
| Churn Reason Analytics | ✅ Pie Breakdown | ❌ | Aggregates `lost_reason` selections across team. |
| AI Manager Insights | ✅ Monthly Report | ❌ | AI generates natural language team health audit. |
| Custom Report Builder | ✅ Save & Export | ❌ | Export to Excel / CSV / PDF. |

---

## ━━ 5. BILLING & SYSTEM CONFIGURATION ━━

| Feature | Web App (Desktop) | Mobile App (Android) | Technical Notes |
| :--- | :--- | :--- | :--- |
| Subscription Upgrades | ✅ Razorpay Checkout| ❌ | Managed strictly by Founder role. |
| GST Tax Invoice Download| ✅ PDF Storage Link | ❌ | Generates compliant B2B tax invoice. |
| Integrations Setup | ✅ API Key Manager | ❌ | IndiaMART, JustDial, Meta Lead Ads configuration. |
| Automation Rules Builder| ✅ Canvas Workflow | ❌ | Setup triggers, conditions, and actions. |

---

## ━━ 6. ENTERPRISE HIERARCHY & MULTI-TENANT MANAGEMENT ━━

| Feature | Web App (Desktop) | Mobile App (Android) | Technical Notes |
| :--- | :--- | :--- | :--- |
| Enterprise Branch Management | ✅ Hierarchy Hub | ✅ Branch Tag Badges | 100% Optional (Default = OFF). Multi-branch data isolation. |
| Region & State Topology | ✅ Tree Manager | ❌ | Define Region ➔ State ➔ Branch ➔ Department ➔ Team topology. |
| City-to-Branch Auto-Match | ✅ Auto Engine | ❌ | Matches lead creation city to active branch location automatically. |
| Hierarchy Filter Bar | ✅ Scope Dropdown | ❌ | Filter Dashboard, Reports, and Analytics by Region and Branch. |
| Unified Organization Settings| ✅ Settings Hub Tab | ❌ | Centralized tab in SettingsPage for managing all enterprise structures. |

