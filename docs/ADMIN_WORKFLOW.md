# CallMind Admin & Manager Workflow Guide

Standard operating procedures for `founder` and `sub_admin` roles to configure, manage, and scale their sales operations using the CallMind Web CRM.

---

## ━━ 1. INITIAL SYSTEM CONFIGURATION ━━

1. **Company Profile & Branding (`/settings`):**
   * Input Company Name, GSTIN (for B2B invoicing), and upload Company Logo.
   * Set Business Working Hours (e.g. 09:30 AM to 06:30 PM).
2. **Integration Setup (`/integrations`):**
   * **IndiaMART:** Enter Key & Mobile Number to enable `indiamart-poll`.
   * **Facebook Lead Ads:** Paste Page Access Token & App Secret.
   * **Custom Webhook:** Copy tenant webhook URL (`/v1/webhooks/incoming/:companyId`).
3. **Custom CRM Fields (`/settings/custom-fields`):**
   * Define industry-specific fields (e.g. "Property Type" for Real Estate, "Course Interested" for Education).

---

## ━━ 2. TEAM ONBOARDING & FLOOR MANAGEMENT ━━

1. **Generating Team Join Code:**
   * Navigate to `/team`. Click "Generate Join Code".
   * System generates a secure 6-digit code linked to `company_id`.
2. **Approving Agents:**
   * Telecallers download mobile app and register using the code.
   * Admin sees pending agents in `/team` -> "Approvals Needed".
   * Click "Approve", select Role (`telecaller`, `team_lead`) and Pod assignment.
3. **Attendance & GPS Audit (`/team/attendance`):**
   * Inspect daily Clock-in map view with GPS coordinates.
   * Click any agent to view high-resolution selfie verification image.

---

## ━━ 3. AUTOMATION & WORKFLOW CREATION ━━

1. **Building Automation Rules (`/automation`):**
   * Click "Create Rule".
   * **Trigger:** When Lead Status changes to `Interested`.
   * **Condition:** `deal_value > 50000`.
   * **Action:** Send WhatsApp Template "VIP Proposal Request" AND Notify Floor Manager.
2. **Configuring Round-Robin Routing (`/settings/routing`):**
   * Set Routing Strategy: `RoundRobin` or `LoadBalanced`.
   * Enable "Exclude Offline Agents" to prevent leads sitting with absent telecallers.
   * Set Overflow Timeout (e.g. 24 hours without call -> auto re-assign).

---

## ━━ 4. ANALYTICS & EXECUTIVE REPORTING ━━

1. **Real-time Floor KPI Dashboard (`/reports`):**
   * Monitor Total Calls Made, Total Talk Time, Average Turnaround Time (TAT).
2. **AI Insights Generator (`/reports/ai-insights`):**
   * Click "Generate Monthly AI Report".
   * Gemini analyzes 30 days of data and outputs a bulleted executive report highlighting strengths, bottlenecks, and revenue growth opportunities.
3. **Custom Export (`/reports/export`):**
   * Filter leads by date range, agent, or status.
   * Export to CSV / Excel / PDF for offline board meetings.

---

## ━━ 5. BILLING & SEAT MANAGEMENT ━━

1. **Upgrading Subscription (`/billing`):**
   * View active plan, seat usage, and trial expiration countdown.
   * Click "Upgrade Plan", choose tier (`Growth` or `Pro`), select annual/monthly, adjust seat count.
   * Pay via Razorpay checkout modal.
2. **Invoice Download (`/billing/invoices`):**
   * Download official GST-compliant invoices with CGST/SGST/IGST breakdown.
