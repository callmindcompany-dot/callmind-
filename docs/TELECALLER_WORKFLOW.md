# CallMind Telecaller Mobile App Workflow

Complete operating guide for front-line sales agents using the CallMind Android application.

---

## ━━ 1. SHIFT START (ATTENDANCE PUNCH-IN) ━━

1. **Launch App:** Open CallMind app on Android smartphone.
2. **Biometric Security:** Prompted for fingerprint / Face Unlock (if enabled).
3. **Attendance Verification:**
   * App displays full-screen Punch In modal.
   * Telecaller taps "Take Selfie". Front camera captures clear photo.
   * Device fetches high-accuracy GPS location (Latitude/Longitude).
   * Taps "Clock In" -> Status updated to `online` in `agent_status`.
4. **Daily Goals Screen:** Displays target for the day (e.g. "Goal: 60 Calls | 20 Wins").

---

## ━━ 2. MANAGING & CALLING LEADS ━━

1. **Access Queue:** Tap "My Leads" tab.
2. **Prioritization Badges:**
   * **`NEW` (Red):** Leads never called before.
   * **`CALLBACK` (Yellow):** Scheduled callbacks for today.
   * **`HOT` (Flame Icon):** High AI Lead Score.
3. **Dual SIM Card Selection:**
   * Choose preferred SIM slot (SIM 1 - Airtel, SIM 2 - Jio).
4. **Executing Call:**
   * Tap "Call" icon on target lead card.
   * Android system launches native dialer with phone number pre-filled.
   * Floating Callmind widget pops up over the dialer showing lead name, company, and past notes.

---

## ━━ 3. POST-CALL DISPOSITION SHEET ━━

Immediately upon call ending, CallMind auto-opens the **Post-Call Feedback Sheet**:

1. **Select Outcome:**
   * `Connected` | `Busy` | `No Answer` | `Invalid Number`
2. **Update Pipeline Status:**
   * Move status to `Interested`, `Call Back`, `Won`, or `Lost`.
3. **Capture Deal Data:**
   * If `Won`: Input Deal Value (e.g. ₹25,000).
   * If `Lost`: Select Lost Reason dropdown (Price, Competitor, Not Interested).
4. **Input Notes (Voice / Typing):**
   * Tap microphone icon to dictate notes via Voice-to-Text in Hindi, Marathi, or English.
5. **AI Summarization:**
   * Tap "Save & Complete".
   * Gemini AI converts voice notes into concise summary: *"Client wants brochure sent on WhatsApp. Follow up on Monday."*

---

## ━━ 4. SCHEDULING CALLBACKS & WHATSAPP DISPATCH ━━

1. **Scheduling Callback:**
   * Select Date and Time picker (e.g., Tomorrow at 11:00 AM).
   * App schedules local device push notification alert.
2. **Sending WhatsApp Template:**
   * Tap "WhatsApp" icon on lead card.
   * Select template: "Product Intro", "Pricing PDF", or "Meeting Link".
   * Launches native WhatsApp app with pre-formatted personalized text.

---

## ━━ 5. SHIFT END (PUNCH OUT) ━━

1. **Review Daily Leaderboard:** Check rank on team leaderboard (Calls Made, Total Talk Time).
2. **Clock Out:** Tap Profile -> "Clock Out". Status updated to `offline`. Shift ended.
