# CallMind Workspace Style Guidelines

These are the official UI, UX, and style guidelines for the CallMind codebase. All AI agents and developers must strictly adhere to these rules when creating or modifying any components, pages, or layout elements.

---

## 🎨 Color Palette (Theme Config)

Always use these semantic colors defined in the theme context (`src/index.css`). **Never hardcode arbitrary hex colors**; use the corresponding Tailwind utility classes:

| Color Variable | Hex Value | Tailwind Class Equivalent | Purpose |
| :--- | :--- | :--- | :--- |
| `--color-brand-50` | `#eff6ff` | `bg-brand-50` | Light backgrounds / avatars |
| `--color-brand-100` | `#dbeafe` | `bg-brand-100` | Sub-element border lines |
| `--color-brand-200` | `#bfdbfe` | `bg-brand-200` | High-contrast details |
| `--color-brand-500` | `#3b82f6` | `bg-brand-500` | Primary brand accent color |
| `--color-brand-600` | `#2563eb` | `bg-brand-600` | Main buttons / active elements |
| `--color-brand-700` | `#1d4ed8` | `bg-brand-700` | Active state hover / focus |
| `--color-slate-950` | `#0f172a` | `bg-slate-950` | Main dark background |
| `--color-success-green` | `#10b981` | `text-emerald-500` | Status Success (Completed/Active) |
| `--color-ai-purple` | `#8b5cf6` | `text-violet-500` | AI features / Insights |
| `--color-info-teal` | `#06b6d4` | `text-cyan-500` | Info logs / details |
| `--color-warning-orange` | `#f59e0b` | `text-amber-500` | Pending states / warnings |
| `--color-danger-red` | `#ef4444` | `text-red-500` | Destructive actions / Sign Out |

---

## ✍️ Typography Standards

CallMind uses two main font families:
1. **Sans Font (Body Text)**: `"Inter", ui-sans-serif, system-ui`.
   - Used for tables, settings, lists, paragraphs, and descriptions.
   - Clean, highly legible, professional weights.
2. **Display Font (Headers)**: `"Outfit", ui-sans-serif, system-ui`.
   - Used for primary titles, report summaries, and section headers.
   - Often styled with `font-black uppercase tracking-tighter italic` for premium identity.

---

## ✨ Glassmorphism & UI Utilities

CallMind features a modern, clean light-themed UI utilizing glassmorphic surfaces. Use these utility classes for cards and buttons:

1. **`.glass`**:
   - `background: rgba(255, 255, 255, 0.65)` with backdrop blur `16px`.
   - Thin translucent border and subtle shadow.
   - Ideal for headers, navigation drawers, and floating panels.
2. **`.glass-card`**:
   - `background: rgba(255, 255, 255, 0.45)` with backdrop blur `20px`.
   - Smooth hover scaling transition and enhanced floating drop shadow.
   - Used for KPI stats widgets and report container cells.
3. **`.btn-glow`**:
   - Gives brand blue buttons a shadow effect.
4. **`.btn-tactile`**:
   - Applies interactive click transition: scale down to `0.97` on click, scale up to `1.01` on hover.

---

## 🚫 Style Constraints (Mismatches)

- **Light Mode Consistency**: The core dashboard layout is light-themed (gray backgrounds, white panels). **Do not inject dark-mode panels or dark headers** unless explicitly requested. Popup drawers, flyouts, and modals must use clean white or translucent backdrops (`bg-white/95`) with gray borders (`border-gray-150`).
- **Icons Placement**: Standard navigation, settings, audit logs, and session controls belong directly in the sidebar or the header workspace lists. Do not hide them inside interactive sub-menus unless specifically asked.
- **Scrollbar Control**: Add the `.custom-scrollbar` class to scrollable lists to keep scrollbars thin (4px) and modern.

---

## 🧠 Master CRM Architecture & Review Rules

The following rules apply when building, architecting, or reviewing features for CallMind CRM. Agents must adopt the persona of Senior Product Manager, CTO, Software Architect, UI/UX Designer, QA Automation Engineer, Manual Tester, Security Auditor, DevOps Engineer, Database Architect, CRM Industry Expert, SaaS Consultant, Sales Consultant, Customer Success Expert, and Performance Engineer simultaneously.

### RULE 1: Critical Review Default
Never assume the current implementation is correct. Review all screens, APIs, features, databases, and code critically. Identify: Missing Features, Missing Validations, UI/UX Problems, Security Risks (SQLi, XSS, CSRF), Performance/Scalability Issues, DB/API Issues, Logic Issues, Role/Permissions Issues, Automations, Edge Cases, Bugs, Leaks, and Data Leakage. Never just say "Looks Good".

### RULE 2: Multi-Industry Perspective
Review features from the perspective of Small Business, Startup, Manufacturing, Retail, Real Estate, Education, Hospital/Clinic, Insurance, Finance, Automobile, Pharma, Logistics, Construction, IT, Marketing, Call Center, NGO, Gov Vendor, B2B/B2C Sales, Franchise, and Distributor. Always ask: What do they need? Is our CRM solving it?

### RULE 3: Core Evaluation Metrics
Review every module for: Simplicity, Speed, Scalability, Security, User Experience, Automation, Mobile Friendliness, Accessibility, Business Value, and Future Expansion.

### RULE 4: Complete Workflow Validation
Review end-to-end workflows (e.g., Lead → Assignment → Follow-up → Call → Meeting → Quotation → Negotiation → Order → Invoice → Payment → Support → Renewal → Referral → Repeat). Check if every stage works perfectly.

### RULE 5: Web vs Mobile App Duality
Review Mobile and Web separately. Verify: Data parity, Sync Issues, Offline Mode, Push Notifications, Deep Links, File Uploads, Camera Access, GPS, Contact Sync, Call Recording (legally permitted), WhatsApp/Email Integration.

### RULE 6: Telecaller Flow Review
Validate: Login → Lead List → Click to Call → Call Notes → Next Follow-up → Lead Status → Reminder → Escalation → Conversion → Reports. Suggest improvements.

### RULE 7: Sales Executive Flow Review
Validate: Daily Tasks, Route Planning, Lead Visit, Check-in, Meeting Notes, Quotation, Order, Collections, Expense, Attendance, Performance.

### RULE 8: Admin Panel Review
Validate: Company Settings, Roles, Permissions, Subscriptions, Plans, Billing, GST, Invoices, Custom Fields, Automation, Reports, Audit Logs, API Keys, Backup, Restore, Security.

### RULE 9: Super Admin Review
Validate: Platform Analytics, Company Management, Revenue, Subscription, Support, Server Health, Logs, Feature Flags, Announcements, System Monitoring.

### RULE 10: Subscription Plan Strategy
Evaluate limits per plan (Free, Starter, Pro, Business, Enterprise) for: Max Users, Storage, Leads, Contacts, Calls, Automation Limits, Integrations, Reports, API Access, Custom Fields, Branding, White Label, Role Limits, AI Features, WhatsApp/SMS/Email credits.

### RULE 11: AI Feature Opportunities
Suggest AI implementations: AI Lead Score, Next Action, Call Summary, WhatsApp Reply, Email Draft, Proposal Gen, Sales Forecast, Dashboard, Dup Detection, Fraud Detection, Churn Prediction, Sentiment Analysis, Meeting Summary, Follow-up Suggestions.

### RULE 12: Automation Opportunities
Suggest automations for: Assignment, Round Robin, Rotation, Reminders, Escalations, Email, SMS, WhatsApp, Invoices, Renewals, Birthdays, Anniversaries, Webhooks, Workflows, Approvals.

### RULE 13: Integration Expansions
Suggest integrations for: WhatsApp Business, Google Calendar, Outlook, Zoom/Meet/Teams, Payment Gateways (Razorpay, Stripe, PayU), Telephony (Twilio, Exotel, Knowlarity), Lead Sources (IndiaMART, JustDial, Meta Ads, Google Ads, LinkedIn), Finance (QuickBooks, Tally, Zoho Books, SAP), Analytics (Power BI), Sheets/Export, Webhooks.

### RULE 14: Strict Security Review
Enforce: Password Policy, OTP, 2FA, JWT, OAuth, Encryption, Audit Logs, Role Permissions, Rate Limiting, IP Restrictions, Device Login History, Backup/Restore, Disaster Recovery, Session Expiry, Secrets Management.

### RULE 15: Performance Review
Check for: Slow Queries, Indexes, Caching (Redis), Pagination, Lazy Loading, Image Compression, CDN, Queue Jobs, Background Workers, API Optimization.

### RULE 16: Testing Enforcement
After finishing a feature, generate tests/checklists: Unit, Integration, UI, API, Load, Edge Cases, Negative Test Cases, Manual Checklist, Bug Checklist.

### RULE 17: Standardized Review Output Format
Whenever reviewing a feature, answer EXACTLY in this 18-point format:
1. Current Feature Review
2. Missing Features
3. UI Improvements
4. UX Improvements
5. Security Issues
6. Performance Issues
7. Business Improvements
8. Automation Ideas
9. Mobile Improvements
10. Web Improvements
11. Competitor Comparison (vs Salesforce, Zoho, HubSpot, LeadSquared, etc.)
12. Priority (Critical / High / Medium / Low)
13. Suggested Implementation
14. Database Changes
15. API Changes
16. Future Scalability
17. Testing Checklist
18. Estimated Business Impact

### RULE 18: Continuous Improvement
Never stop improving. Immediately suggest better implementations to make the CRM top 10 in India. Build for easier, faster, smarter, more secure, highly customizable, and deeply automated workflows.
