# CallMind End-to-End Lead Lifecycle Workflow

Technical specification of how leads are ingested, sanitized, deduplicated, routed, dialed, and resolved within CallMind.

---

## ━━ 1. LEAD INGESTION VECTORS ━━

Leads enter the CallMind CRM through 5 primary channels:

1. **API Webhooks (`/v1/webhooks/incoming/:companyId`):**
   * Custom website landing pages, WordPress forms, Elementor.
2. **B2B Marketplace Polling:**
   * **IndiaMART:** `indiamart-poll` Edge Function, using vendor API keys.
   * **JustDial:** `justdial-poll` Edge Function extracts lead pushes.
   * **TradeIndia:** `tradeindia-poll` Edge Function fetches inquiry streams.

   These run on a schedule **only once polling has been switched on** —
   `pg_cron` calls them through `public.run_integration_poll()`, and the setup
   steps are at the bottom of
   `supabase/migrations/20260819000200_integration_poll_schedule.sql`. Until
   then they run only when somebody presses Sync Now.

   This section used to say the IndiaMART function "runs every 10 mins". It did
   not: nothing scheduled any of them, and `pg_cron` was not installed. Do not
   restate an interval here — `public.integration_sync_status()` reports the
   real one, and the hub reads it from there.
3. **Social Media Ads:**
   * **Meta Lead Ads:** currently polled by `facebook-poll` on the same
     schedule, not pushed. The receiver in `receive-whatsapp-webhook` is for
     WhatsApp and is not connected; a Meta *leadgen* webhook would remove the
     need to poll and is the better shape, but it is not built.
4. **Bulk CSV Upload (`SmartImportModal.tsx`):**
   * Admins upload CSVs. Gemini AI maps erratic column names (e.g. "Mobile Num" -> `phone`).
5. **Manual Entry (`LeadForm.tsx`):**
   * Single lead creation via Web or Mobile App.

---

## ━━ 2. SANITIZATION & E.164 NORMALIZATION ━━

Before database insertion, all lead phone numbers are processed by `phoneSanitizer.ts`:
1. Strips non-numeric characters (spaces, dashes, parentheses).
2. Enforces Indian country code prefix (+91) if 10 digits are provided.
3. Example: `098765-43210` -> `+919876543210`.

---

## ━━ 3. SMART DEDUPLICATION WINDOW ━━

Implemented in `deduplication.service.ts`:
- **Lookup Query:** Checks for existing lead in `leads` matching `company_id` AND `phone`.
- **Match Found (Duplicate):**
  * Does NOT create a duplicate lead record.
  * Appends new inquiry details, source, and timestamps to the existing lead's `custom_data` array.
  * Updates lead status back to `New` if previously marked `Not Required`.
  * Logs a `duplicate_inquiry_received` event in `lead_activity`.
- **No Match Found:** Proceeds to Auto-Assignment.

---

## ━━ 4. AUTOMATED ROUND-ROBIN ROUTING ━━

Managed by `/v1/routing/auto-assign` and `founder_configs`:

1. **Active Agent Selection:**
   * Queries `agent_status` where `company_id` matches AND `status IN ('online', 'break')`.
   * Filters out agents marked `is_approved = FALSE` or on leave.
2. **Round-Robin Pointer:**
   * Retrieves `last_assigned_agent_index` from `founder_configs`.
   * Computes next agent: `next_index = (last_index + 1) % active_agents.length`.
3. **Assignment Execution:**
   * Updates `leads.assigned_to = selected_agent_id`.
   * Realtime Supabase broadcast alerts the telecaller's Android app immediately.

---

## ━━ 5. AGENT EXECUTION & TIMELINE AUDIT ━━

1. **Queue Placement:** Lead appears at top of agent's mobile list marked `is_unseen = TRUE`.
2. **First Call Attempt:**
   * Tapping "Call" changes `is_unseen = FALSE`.
   * Post-call disposition creates a row in `call_logs`.
   * Inserts row into `lead_activity`:
     ```json
     {
       "activity_type": "call_logged",
       "actor_id": "agent_uuid",
       "metadata": { "duration": 145, "outcome": "connected", "status_to": "Interested" }
     }
     ```

---

## ━━ 6. RESOLUTION & CHURN ANALYSIS ━━

Leads progress through pipeline stages until reaching a final state:
- **`Won` (Converted):**
  * Requires entering `deal_value` (e.g. ₹50,000).
  * Included in Revenue Pipeline reports and Leaderboard statistics.
- **`Lost` (Dropped):**
  * Mandates selecting a `lost_reason` (Price, Competitor, No Requirement, Unresponsive).
  * Feeds into Churn Analytics for product/pricing strategy evaluation.
