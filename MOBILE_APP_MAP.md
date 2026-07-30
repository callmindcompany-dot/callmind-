# CallMind Mobile App Component Map and Architecture Blueprint

This document is the **absolute source of truth** for the **CallMind Mobile App** (built with React Native & Expo). It maps every screen, service, navigation flow, native feature, offline-sync pipeline, and data state for telecallers, field agents, and sales representatives.

---

## 1. Core Product & Mobile App Profile

The CallMind Mobile App is an offline-first, telecaller-centric mobile CRM application designed for small business owners in India managing teams of 10 to 50 telecallers.

* **Target Users:** Telecallers, Field Agents, Sales Representatives, Team Leads.
* **Primary Objective:** Execute rapid dialing, auto-log call durations and dispositions, record voice notes, view AI objection-handling scripts, track daily punch-in attendance, and work seamlessly in low-connectivity areas.
* **Role Guard Enforcement:** Only users with `telecaller`, `team_lead`, or `floor_manager` roles can log into the mobile app. **Admin and Founder accounts are blocked** with an error message instructing them to use the Web Dashboard at `callmind.ai`.
* **Tech Stack:**
  * **Framework:** React Native + Expo (TypeScript)
  * **Icons:** `lucide-react-native`
  * **State & Auth:** `MobileAuthProvider` (`AuthContext.tsx`) + Supabase JS Client
  * **Offline Storage:** `@react-native-async-storage/async-storage`
  * **Native Capabilities:** Telephony (`Linking.openURL`), Push Notifications, Biometric Authentication, Device Info, Geolocation.

---

## 2. Navigation & Screen Flow Architecture

The mobile app employs a hybrid step-based Auth Router + Tab-based Main Application Navigator defined in `mobile/App.tsx`.

```
                  ┌─────────────────────────────────────────┐
                  │          App Launcher (App.tsx)         │
                  └────────────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │  Auth/Onboarding Flow │             │   Main App Tabs &     │
        │      (Step-Based)     │             │     Stack Router      │
        └───────────┬───────────┘             └───────────┬───────────┘
                    │                                     │
    ┌───────────────┼───────────────┐         ┌───────────┴───────────┐
    ▼               ▼               ▼         ▼                       ▼
SplashScreen  OnboardingSlides UserInfo  HomeScreen              LeadListScreen
                    │               │    (Dashboard & KPIs)      (Lead CRM & Dial)
                    ▼               ▼         │                       │
               Google Auth    JoinCompany     ├─ ActiveCallOverlay    ├─ LeadDetailScreen
                    │               │         ├─ PostCallFeedback     ├─ PostCallFeedback
                    ▼               ▼         ├─ DialPadScreen        └─ LeadFilterSheet
               Permissions   ApprovalPending  │                       
                                    │         ├─ CallbacksScreen      ├─ CallLogScreen
                                    ▼         ├─ AttendanceScreen     ├─ PerformanceScreen
                               JoinedSuccess  ├─ LeaderboardScreen    ├─ QualityAnalytics
                                              └─ SettingsScreen       └─ Inbox / Announce
```

---

## 3. Exhaustive Screen Inventory (All 53 Mobile Screens)

### 3.1. Authentication, Onboarding & Setup (8 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `01_SplashScreen.tsx` | Splash Screen | Displays CallMind brand animation, checks session initialization status, and routes to Onboarding or Main App. |
| `02_OnboardingSlides.tsx` | Onboarding Carousel | 4-slide feature introduction (Auto-Dialer, AI Call Summaries, Offline Sync, Real-time Leaderboards). |
| `03_ProfileSetup.tsx` | Profile Setup | Telecaller profile details input (Full Name, Phone Number, Designation, City, Primary Sales Target). |
| `04_OTPVerify.tsx` | Phone OTP Verification | Phone number verification via SMS OTP for high-security telecaller identification. |
| `05_JoinCompany.tsx` | Join Company | Allows telecallers to enter an 8-character Company Invitation Code to link their account to a company. |
| `06_ApprovalPending.tsx` | Approval Pending | Waiting screen displayed when an admin/founder has not yet approved the telecaller's join request. |
| `07_UserInfoCollection.tsx` | Extended Profile Info | Captures daily call targets, language preferences, experience level, and preferred calling hours. |
| `17_CompanyJoinedSuccess.tsx` | Join Success Screen | Celebration screen with company logo, assigned manager name, and instant access button. |

---

### 3.2. Telephony, Calling & Active Call Management (7 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `40_DialPadScreen.tsx` | Smart DialPad | Custom DTMF dialpad with instant phone number search, recent contacts, and direct SIM dial trigger. |
| `38_CallingScreen.tsx` | Calling Screen | Dedicated outgoing call screen displaying lead name, company, live call timer, and quick script button. |
| `39_ActiveCallOverlay.tsx` | Floating Call Overlay | Persistent floating widget over other screens allowing telecallers to access talk scripts mid-call. |
| `37_IncomingAssignedCallScreen.tsx` | Incoming Lead Alert | Full-screen alert when a live incoming lead or predictive auto-dialer assigns a call to the agent. |
| `PostCallFeedbackSheet.tsx` | Post-Call Disposition Sheet | Bottom sheet popping up post-call to record disposition status (Connected, Busy, Callback, Not Interested), interest level, notes, and callback schedule. |
| `42_CallCompletedCard.tsx` | Call Summary Card | Compact card showing talk duration, SIM call type (Incoming/Outgoing/Missed), and submission status. |
| `54_CallLogScreen.tsx` | Device Call Log Reader | Reads device SIM call history, displays call duration in formatted strings, sync status, and manual match with leads. |

---

### 3.3. Lead Management & CRM Pipeline (7 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `HomeScreen.tsx` | Agent Home Dashboard | Main landing tab with daily call progress counter, attendance status, assigned leads carousel, quick dialer, and activity summary. |
| `LeadListScreen.tsx` | Lead Directory | List of assigned leads with search, priority badges (Hot, Warm, Cold), status filters, one-tap call button, and WhatsApp trigger. |
| `LeadDetailScreen.tsx` | Lead Detail View | Comprehensive lead view with full interaction timeline, call logs history, notes feed, custom fields, AI lead score, and direct dial. |
| `LeadImportScreen.tsx` | Mobile Lead Import | Allows agents to import phone contacts or CSV files directly into their lead list from their mobile device. |
| `128_LeadFilterSheet.tsx` | Advanced Lead Filter | Bottom sheet filtering leads by status, interest level, creation date, city, and callback urgency. |
| `131_ScheduleCallbackSheet.tsx` | Schedule Callback | Date-time picker for setting automated callback reminders with notification alerts. |
| `CallbacksScreen.tsx` | Callbacks Queue | Dedicated tab for scheduled callbacks organized by Overdue, Today, and Upcoming with quick-dial actions. |

---

### 3.4. AI Sales Assistance & Intelligence (5 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `67_AITalkScriptScreen.tsx` | AI Talk Script Assistant | Dynamic battlecards and objection-handling scripts (Price objection, Competitor comparison, Not interested) tailored to product type. |
| `65_AILeadInsightScreen.tsx` | AI Lead Insights | Neural lead scoring, buying intent analysis, key talking points recommendation, and sentiment trends. |
| `64_AICallSummaryCard.tsx` | AI Call Summary | Generates automated key takeaways, action items, and summary bullet points from call notes. |
| `68_VoiceNotesModal.tsx` | Voice Notes Recorder | Audio recorder modal enabling telecallers to record voice notes post-call instead of typing text. |
| `QualityAnalyticsScreen.tsx` | Call Quality Analytics | Shows agent's call quality score, talk-to-listen ratio, script adherence percentage, and customer sentiment metrics. |

---

### 3.5. Performance, Attendance & Gamification (6 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `AttendanceScreen.tsx` | Punch IN / OUT Attendance | GPS-verified clock in/out with selfie photo verification, daily work hours tracker, and monthly attendance calendar. |
| `PerformanceScreen.tsx` | Agent Performance Metrics | Personal analytics dashboard showing Total Calls, Connected Rate %, Average Talk Time, and Conversion Ratio graphs. |
| `LeaderboardScreen.tsx` | Team Gamified Leaderboard | Daily/Weekly/Monthly agent rankings, top telecaller badges (Dial Master, Conversion Champ), and point scores. |
| `TargetScreen.tsx` | Sales Target Tracker | Progress bar towards monthly call and revenue targets, incentive commission calculator, and stretch goals. |
| `26_ActivityTimelineScreen.tsx` | Activity Feed | Chronological stream of all telecaller actions (calls made, notes added, callbacks scheduled, status updates). |
| `27_TrainingLearningScreen.tsx` | Sales Training Hub | Bite-sized sales training modules, product demo videos, script guidelines, and pitch quizzes. |

---

### 3.6. Inbox, Messaging & Broadcasts (4 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `59_InboxScreen.tsx` | Company Broadcast Inbox | List of company announcements, manager broadcast messages, incentive alerts, and system notices. |
| `61_AnnouncementDetailScreen.tsx` | Announcement View | Full detail view of company announcements with attached documents, image previews, and acknowledge button. |
| `AnnouncementDetailScreen.tsx` | Alternative Announcement | Full screen reader for executive broadcasts with rich text formatting. |
| `62_NotificationCenterScreen.tsx` | Notification Center | Central push notification feed (Lead reassignment, callback due in 15 mins, target milestone achieved). |

---

### 3.7. Security, Hardware & Device Management (5 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `11_AppPermissionsScreen.tsx` | App Permissions Manager | Visual checklist & permission requester for Phone Telephony, Call Logs, Contacts, Storage, and Notifications. |
| `25_DeviceManagementScreen.tsx` | Registered Device Info | Shows current phone model, IMEI/Unique Device Identifier, OS version, app version, and last active timestamp. |
| `86_BiometricLockScreen.tsx` | Biometric App Lock | Fingerprint / FaceID security screen protecting sensitive customer lead data when app is resumed. |
| `90_DeviceVerificationModal.tsx` | Single Device Enforcement | Modal warning if telecaller attempts to log in from an unauthorized second phone. |
| `SubscriptionLockScreen.tsx` | Subscription Lock | Displayed when the company's CallMind subscription expires, locking mobile telecallers until renewal. |

---

### 3.8. App Settings & Utility Utilities (11 Screens)

| Screen File | Name / Identifier | Purpose & Key Features |
| :--- | :--- | :--- |
| `SettingsScreen.tsx` | App Settings | Main settings hub: Profile edit, Language selector, Theme toggle, Offline sync status, Biometric settings, Help, Sign Out. |
| `08_ProfileEditScreen.tsx` | Edit Profile | Form to update name, avatar photo, phone number, city, and bio. |
| `10_LanguageSelectionScreen.tsx` | App Language Screen | Standardized single language viewer confirming English as the system default language. |
| `81_ThemeToggleScreen.tsx` | Visual Theme Customizer | Toggle between Light Mode, Dark Mode, and System Default with accent color choices. |
| `83_AboutAppScreen.tsx` | About CallMind App | App version info, build number, company details, copyright, and technology credits. |
| `84_PrivacyTermsWebView.tsx` | Privacy & Terms Viewer | In-app WebView displaying legal terms, data privacy policy, and PCI-DSS compliance information. |
| `91_OfflineSyncBanner.tsx` | Offline Sync Status Bar | Persistent top banner indicating offline status, unsynced call log count, and manual "Sync Now" button. |
| `28_RateAppScreen.tsx` | Rate App Modal | Feedback rating prompt for telecallers to rate app performance on Google Play Store. |
| `137_ConfirmDialogs.tsx` | Reusable Confirm Modals | Standardized alert dialogs for Sign Out confirmation, Clear Offline Cache, and Delete Lead confirmation. |
| `DocumentsScreen.tsx` | Company Documents | Repository of product brochures, price lists, and compliance documents accessible during calls. |
| `HelpCenterScreen.tsx` | Help & Founder Support | FAQ knowledgebase, chat support trigger, and direct call support link. |

---

## 4. Key Mobile Technical Engines & Services

### 4.1. Authentication Context (`mobile/src/services/AuthContext.tsx`)

* **Role Guard Logic:**
  ```typescript
  if (data.role === 'founder' || data.role === 'sub_admin') {
    setIsAdminBlocked(true);
    setAuthError('This account has admin access. Please use the web dashboard at callmind.ai');
    await supabase.auth.signOut();
    return null;
  }
  ```
* **Session Management:** Listens to `supabase.auth.onAuthStateChange`, fetches user profile from `users` table, and exposes `user`, `profile`, `isAuthenticated`, `isOnboarded`, `isApproved`.

---

### 4.2. Offline Synchronization Engine (`mobile/src/services/sync.ts`)

CallMind Mobile is **offline-first**. When telecallers make calls without internet access, disposition data is queued locally in AsyncStorage under `@callmind_unsynced_calls`.

* **Offline Queue Model (`UnsyncedCallLog`):**
  * `id`: Unique generated local call ID (`call_1722345678_a1b2`)
  * `leadId`: Associated lead ID
  * `phone`: Contact phone number
  * `duration`: Call duration in seconds
  * `outcome`: Call outcome / disposition (e.g., `connected`, `busy`, `no_answer`, `callback`)
  * `interestLevel`: Customer interest rating (`hot`, `warm`, `cold`)
  * `notes`: Telecaller notes & AI summary
  * `timestamp`: ISO timestamp of call completion
* **Sync Protocol (`syncPendingLogs`):**
  When internet connectivity restores, `syncPendingLogs()` iterates through local logs, executes batch `insert` queries into the Supabase `calls` table, removes successfully uploaded logs from AsyncStorage, and updates `OfflineSyncBanner`.

---

### 4.3. Attendance & GPS Verification Engine (`AttendanceScreen.tsx`)

* Telecallers clock in using a dual-verification mechanism:
  1. **GPS Geolocation:** Captures latitude & longitude coordinates to confirm field location.
  2. **Selfie Verification:** Captures timestamped selfie photo.
* Status calculation evaluates entry time against company shift start time:
  * On-time -> `Present`
  * > 15 mins late -> `Late`
  * Half day -> `Half Day`

---

## 5. Environment Variables & App Configuration (`mobile/app.json`)

The mobile application is configured via Expo `app.json` with the following parameters:

```json
{
  "expo": {
    "name": "CallMind CRM",
    "slug": "callmind-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.callmind.app",
      "permissions": [
        "CALL_PHONE",
        "READ_CALL_LOG",
        "READ_CONTACTS",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "RECORD_AUDIO",
        "VIBRATE"
      ]
    }
  }
}
```

---

## 6. Summary of Mobile App Strengths & Readiness

1. **Complete 53-Screen Coverage:** Every screen for authentication, onboarding, dialing, lead management, AI assistance, gamification, attendance, security, and settings is fully modularized and mapped.
2. **Robust Offline-First Architecture:** Telecallers never lose call logs or feedback notes even when working in zero-signal areas.
3. **Strict Security & Role Enforcements:** Admin/Founder accounts are blocked on mobile; telecallers are bound to single registered devices with biometric lock options.
4. **Seamless Supabase Integration:** Real-time data sync with the main web application database for instant visibility into telecaller attendance and call outcomes.
