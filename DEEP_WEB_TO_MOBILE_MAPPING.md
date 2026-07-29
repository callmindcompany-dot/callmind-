# 🔌 CallMind Deep Feature Architecture: Web App to Android Mobile App Specification

**प्रोजेक्ट:** CallMind Multi-Tenant CRM  
**आर्किटेक्चर दर्जा:** Google-Grade Enterprise Standards (10,000 Engineers Scale)  
**लक्ष्य:** १००+ टेलिकॉलर्स एकाच वेळी अँड्रॉइड ॲपवरून कॉलिंग करत असताना सिस्टीम १००% स्टेबल, डेटा-सुरक्षित आणि रिअल-टाईम सिंक ठेवणे.  
**तांत्रिक फोकस:** १००% केवळ Android OS (Expo / React Native + Custom Android Kotlin Bridge).  
**ऑडिओ पॉलिसी:** Zero Audio Storage Policy (कॉल ऑडिओ रेकॉर्डिंग केले जात नाही. केवळ कॉलचा कालावधी (Duration in seconds) आणि आउटकम ट्रॅक केले जातात).

---

## 🏗️ PART 1: CORE SYSTEM ARCHITECTURE & DATA ISOLATION

### 1.1 Multi-Tenancy & Row-Level Security (RLS) Bridge
* **डेटाबेस:** Web App आणि Android Mobile App दोन्ही एकाच Supabase PostgreSQL डेटाबेसला जोडलेले आहेत.
* **रोल आयसोलेशन:** ॲडमिनला (`role = founder/admin`) संपूर्ण कंपनीचा डेटा दिसतो. टेलिकॉलरला (`role = user/telecaller`) Supabase RLS Policy (`assigned_to = auth.uid()`) मुळे **केवळ स्वतःला असाईन झालेले लीड्स** दिसतात.
* **कस्टम क्लेम्स:** `get_my_company_id()` ही `SECURITY DEFINER` फंक्शन द्वारे थेट कॉलरची कंपनी आयसोलेट करते.

### 1.2 Realtime WebSockets & Push Notifications
* **Inbound Lead Sync:** IndiaMART / Meta वरून नवीन लीड सर्व्हरवर येताच Supabase Realtime WebSocket द्वारे अँड्रॉइड ॲपच्या लीड लिस्टवर १ सेकंदात अपडेट होतो.
* **Firebase Cloud Messaging (FCM):** नवीन लीड असाईन झाल्यावर किंवा ॲडमिनने ब्रॉडकास्ट मेसेज पाठवल्यास Expo Push Notification इंजिनद्वारे मोबाईलवर अलार्म वाजतो.

---

## 📱 PART 2: COMPLETE TELECALLER ANDROID APP SCREEN BLUEPRINT

इमेज विश्लेषणावर आधारित (imges/ फोल्डर) अँड्रॉइड ॲपच्या सर्व स्क्रीन्सचे अचूक मॅपिंग:

```
📱 CallMind Telecaller Android App Structure
│
├── 🔓 1. AUTH & ONBOARDING FLOW
│   ├── 01_SplashScreen            ← ब्रँड ॲनिमेशन व वर्कस्पेस लोडिंग
│   ├── 02_OnboardingSlides        ← वैशिष्ट्यांची तोंडओळख (Manage Leads, Call & Log, Track Performance)
│   ├── 03_ProfileSetup            ← नाव, फोन, ईमेल, भाषा व Android Device ID रजिस्ट्रेशन
│   ├── 04_OTPVerify               ← SMS 6-Digit OTP पडताळणी
│   ├── 05_JoinCompany             ← 📷 Admin QR Scan किंवा 🔢 6-Digit Join Code इनपुट
│   └── 06_ApprovalPending         ← "Request Sent" - ॲडमिन मंजुरीची प्रतीक्षा स्क्रीन
│
├── 🏠 2. MAIN APP (ॲडमिनने अप्रूव्ह केल्यानंतर)
│   ├── HomeScreen                 ← डॅशबोर्ड
│   │   ├── Top Bar: कंपनीचे नाव, पंच-इन स्टेटस दिवा, "Punch In/Out" बटण
│   │   ├── Target Bar: "18 / 50 Calls Completed Today (36%)" प्रगती पट्टी
│   │   ├── Stats Cards: Leads Connected (12), Conversions (3), Pending Follow-ups (7), Avg. Duration (04:32)
│   │   ├── Quick Actions: My Leads, Call Log, WhatsApp, Add Note
│   │   ├── CTA Button: "🔥 Get Next Hot Lead" (सर्वात महत्त्वाचा कॉल त्वरित लावण्यासाठी)
│   │   └── Floating Action Button: Dial Pad (निळा वर्तुळाकार आयकॉन)
│   │
│   ├── LeadListScreen             ← असाईन झालेल्या लीड्सची यादी
│   │   ├── Search Bar (नाव, फोन किंवा शहराने शोधा)
│   │   ├── Status Filter Tabs (All, New, Contacted, Interested, Follow-up)
│   │   ├── Sort Dropdown (Sort by AI Score / Sort by Date)
│   │   └── Lead Cards:
│   │       ├── Avatar initials, नाव, शहर, Intent Tag (Hot/Warm/Cold), Timestamp
│   │       ├── Phone Masking Active (`hidePhoneNumbers = true` असल्यास `+91 98XXX XXXXX` स्टार-मास्क)
│   │       └── Card Action Buttons: Call, WhatsApp, Add Note
│   │
│   ├── LeadDetailScreen           ← लीडची संपूर्ण माहिती
│   │   ├── Header: नाव, मास्क केलेला फोन नंबर, Hot/Warm Badge, Star/Favorite
│   │   ├── Quick Action Row: Call Now (SIM), WhatsApp, Schedule Callback, Edit Note
│   │   ├── Lead Info: Email, City, Source, Assigned To, Custom Fields (उदा. Loan Amount, Vehicle Model)
│   │   ├── Activity Timeline: यापूर्वी झालेले कॉल्स, सेव्ह केलेल्या नोट्स आणि स्टेटस चेंज हिस्टरी
│   │   └── Status Bar: "Current Status: Interested" + "Change Status" बटण
│   │
│   ├── PostCallFeedbackSheet      ← कॉल संपल्यानंतर आपोआप उघडणारी बॉटम शीट
│   │   ├── Call Status Badge: "Call Ended - Duration 02:34"
│   │   ├── Outcome Buttons: Connected | Not Connected | Wrong Number
│   │   ├── Interest Level: Interested | Not Interested | Call Back Later
│   │   ├── Schedule Callback: Date & Time Picker (उदा. 22 May 2024, 11:00 AM)
│   │   ├── Notes Box: ग्राहकाशी झालेल्या संभाषणाची टीप (Text Area)
│   │   └── Main CTA: "Save Feedback"
│   │
│   ├── CallLogScreen              ← वैयक्तिक कॉल हिस्टरी
│   │   ├── Tabs: All | Today | Missed | Scheduled
│   │   └── Call Rows: Inbound/Outbound/Missed दिशा दर्शवणारा बाण, कॉल वेळ, सेकंद आणि आउटकम टॅग
│   │
│   ├── CallbackScreen             ← शेड्युल केलेले कॉलबॅक्स
│   │   ├── Date Groups: Today / Tomorrow / Upcoming
│   │   └── Callback Cards: वेळ, ग्राहकाचे नाव, नोट आणि "Call Now" / "Reschedule" बटणे
│   │
│   ├── AttendanceScreen           ← हजेरी ट्रॅकिंग
│   │   ├── Today's Punch Status: "Punched In 09:02 AM - Pune, Maharashtra"
│   │   ├── Live Working Hours: "05h 47m 32s" चा जिवंत काउंटर
│   │   ├── Action Buttons: Punch In (हिरवे) / Punch Out (लाल)
│   │   └── Recent History: गेल्या काही दिवसांची हजेरी वेळ आणि एकूण तास
│   │
│   ├── PerformanceScreen          ← वैयक्तिक परफॉर्मन्स
│   │   ├── Filter Tabs: Daily | Weekly | Monthly
│   │   ├── Target vs Actual Charts: Calls Made (42/60), Connected (28/40), Conversions (8/15)
│   │   └── Performance Metrics: Connect Rate %, Conversion Rate %, Avg Duration
│   │
│   ├── TeamLeaderboardScreen      ← टीम परफॉर्मन्स बोर्ड (Motivation View)
│   │   ├── Podium View: Top 3 Performers (#1, #2, #3 अवतार व कॉल आकडे)
│   │   ├── Rank List: #4 ते #10 रँक्स
│   │   └── Personal Rank Banner: "Keep it up! You are #1 in Calls Made this week 💪"
│   │
│   ├── AnnouncementsScreen        ← ॲडमिनचे ब्रॉडकास्ट मेसेज
│   │   └── Announcement Cards: हेडलाईन, मेसेज, तारीख आणि "Mark as Read"
│   │
│   ├── DocumentsScreen            ← प्रॉडक्ट माहिती व ट्रेनिंग
│   │   ├── Documents List: Call Scripts (DOCX), Product Guides (PDF), Calculator Sheets (XLSX)
│   │   └── Video Tutorials: "How to Handle Objections", "Product Knowledge Training" (थंबनेलसह)
│   │
│   ├── HelpCenterScreen           ← सपोर्ट सेंटर
│   │   ├── Help Search & Popular Topics (Getting Started, Troubleshooting)
│   │   ├── Raise Ticket Form & Ticket Status ("App not syncing leads - Open")
│   │   └── FAQs List
│   │
│   └── ProfileSettingsScreen      ← ॲप मधील सेटिंग्ज
│       ├── Profile Card: Avatar, Name, Phone, Role: Telecaller
│       ├── Default SIM Selector: [ SIM 1 (Jio) | SIM 2 (Airtel) ] (कॉल लावण्यासाठी सिम निवड)
│       ├── Push Notifications: Enable/Disable Alert Sounds
│       ├── SQLite Sync Hub: Unsynced local logs count + "Force Sync Now" बटण
│       ├── Security: Biometric Lock (Fingerprint Toggle) & Auto Lock Timeout
│       ├── Language: English / Marathi / Hindi Selector
│       └── Action: "Logout / Switch Workspace"
│
└── 🛠️ 3. SYSTEM & UTILITY SCREENS
    ├── OfflineSyncProgress        ← "65% Syncing... Please don't close the app"
    ├── SyncCompletedSuccess       ← "All Synced! Data updated successfully"
    ├── SubscriptionExpiredOverlay  ← 🚨 "Workspace Suspended / Subscription Expired" Block Screen
    ├── NoInternetScreen           ← "No Internet Connection - Go Offline Mode"
    ├── PermissionRequiredScreen   ← Camera / Storage / Read Call Log Permissions Request
    └── BiometricLoginScreen       ← "Use Fingerprint to Unlock CallMind"
```

---

## 🚫 PART 3: EXCLUDED ADMIN SCREENS (SECURITY GATE)

सुरक्षितता, रोल आयसोलेशन आणि ॲपचे डिझाईन कॉलर-फोकस्ड ठेवण्यासाठी खालील ८ स्क्रीन्स **मोबाईल ॲपमधून पूर्णपणे वगळल्या (Blocked) आहेत**:

1. ❌ **Team Management (`TeamManagement`):** इतर टेलिकॉलर्सचे रोल्स, परमिशन किंवा टीम मेंबर्स ॲड/रिमूव्ह करण्याचे पर्याय मोबाईलमध्ये नसतील.
2. ❌ **Attendance Approval (`AttendanceApproval`):** इतर कर्मचाऱ्यांचे हजेरी अर्ज अप्रूव्ह किंवा रिजेक्ट करण्याचे काम केवळ वेब ॲपवर ॲडमिन करेल.
3. ❌ **Pending Join Requests (`PendingJoinRequests`):** कंपनीत येणाऱ्या नवीन टेलिकॉलर्सना कामावर मंजुरी देण्याचे काम ॲडमिन वेबवरून करेल.
4. ❌ **Import & Distribution (`ImportDistribution`):** CSV/Excel फाईल अपलोड करणे आणि राउंड-रॉबिन अलॉटमेंट रूल्स बदलणे मोबाईलवर नसेल.
5. ❌ **Reports Dashboard (Admin View):** संपूर्ण कंपनीचा एकत्रित वित्तीय किंवा टीम रिपोर्ट ॲडमिन वेबवरून पाहेल (मोबाईलवर कॉलरला फक्त स्वतःचा वैयक्तिक रिपोर्ट दिसेल).
6. ❌ **Storage & Backup (`StorageBackup`):** डेटाबेस बॅकअप, सिस्टम कॅशे पर्ज किंवा क्लाउड स्टोरेज सेटिंग्ज मोबाईलमध्ये नसतील.
7. ❌ **Bulk Actions (`BulkActions`):** शेकडो लीड्स एकाच वेळी Reassign करणे किंवा Delete करणे मोबाईलवर नसेल.
8. ❌ **Admin Analytics (`AdminAnalytics`):** कंपनीच्या सर्व एजंट्सचे ऑर्गनायझेशनल आकडे मोबाईल ॲपमध्ये उघड होणार नाहीत.

---

## ⏱️ PART 4: ANDROID TECHNICAL IMPLEMENTATION SPECIFICATIONS

### 4.1 SIM Dialing via Android Intent (`ACTION_CALL` / `ACTION_DIAL`)
* जेव्हा कॉलर 'Call Now' दाबतो:
  - ॲप Android Native Intent `Intent.ACTION_CALL` (किंवा `ACTION_DIAL`) ट्रिगर करतो.
  - युजरने Settings मध्ये निवडलेल्या **SIM 1 किंवा SIM 2** च्या `telephonySubscriptionId` नुसार कॉलिंग कार्ड ऑटो-सिलेक्ट केले जाते.
  - `hidePhoneNumbers = true` असल्यास, मोबाईलच्या Lead Detail वर नंबर स्टार-मास्क (`+91 98XXX XXXXX`) दिसेल. 

### 4.2 Zero Audio Call Logging (`READ_CALL_LOG` Provider)
* **ऑडिओ रेकॉर्डिंग नाही:** कॉल ऑडिओ रेकॉर्ड केला जात नाही.
* **कॉल संपल्याची पडताळणी:**
  - Android `PhoneStateListener` / `TelephonyManager` कॉल कट झाल्याची स्थिती (`EXTRA_STATE_IDLE`) डिटेक्ट करते.
  - ॲप Android च्या अधिकृत `ContentProvider` (`content://call_log/calls`) ला `READ_CALL_LOG` परमिशनद्वारे क्वेरी करतो.
  - ही क्वेरी कॉलचा **नेमका कालावधी (Duration in seconds)**, **वेळ (Timestamp)** आणि **आउटगोइंग नंबर** कॅप्चर करते.
  - हा डेटा स्थानिक **SQLite Database (`pending_calls`)** मध्ये सेव्ह केला जातो.
  - तात्काळ ॲपवर **PostCallFeedbackSheet** आपोआप उघडते.

### 4.3 Billing & Subscription Lockout Overlay
* ॲप उघडताना `companies` टेबलमधील युजरच्या कंपनीचे `subscription_status` चेकिंग होते.
* जर स्टेटस `'paused'` किंवा `'expired'` असेल:
  - ॲपवर एक **Non-Dismissible Full Screen Overlay Modal** उघडेल.
  - **मजकूर:** *"🚨 अकाऊंट स्थगित / सबस्क्रिप्शन संपले आहे. कृपया तुमच्या कंपनीच्या ॲडमिनशी संपर्क साधा."*
  - युजरला डॅशबोर्ड, लीड्स किंवा कॉल बटणाचा ॲक्सेस मिळणार नाही. केवळ "Logout" पर्याय असेल.

---

## 🚀 PART 5: STEP-BY-STEP MOBILE APP BUILDING ROADMAP

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Expo Foundation & Auth (Weeks 1-2)                             │
│ • Setup `mobile/` Expo React Native TypeScript project                 │
│ • Build Auth screens: Splash (01), Onboarding (02), ProfileSetup (03), │
│   OTPVerify (04), JoinCompany (05), ApprovalPending (06)               │
│ • Implement Supabase Auth & Android Device ID registration             │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Core Execution Hub (Weeks 3-4)                                │
│ • Build HomeScreen with Target Progress Bar & Punch In/Out             │
│ • Build LeadListScreen & LeadDetailScreen (with Phone Masking)         │
│ • Build SIM Dialer Intent & PostCallFeedbackSheet                      │
│ • Connect SQLite Local Queue & READ_CALL_LOG android reader            │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Notifications, Offline & Polish (Weeks 5-6)                   │
│ • Integrate Firebase Cloud Messaging (FCM Push Alerts)                 │
│ • Build Callbacks, Inbox, Attendance, and Performance Screens          │
│ • Build SettingsScreen (SIM selector, Biometrics, Force Sync)          │
│ • Build Subscription Expired Lockout Overlay                           │
│ • Run full end-to-end integration tests with Supabase DB              │
└────────────────────────────────────────────────────────────────────────┘
```

---
*अहवाल संपूर्ण तांत्रिक अचूकतेसह अद्ययावत केला: Android Lead Architect & CEO, CallMind Engineering Council*  
*सर्व 18 डिझाईन इमेजेसचे सखोल विश्लेषण पूर्ण: 20 Telecaller Screens mapped, 8 Admin Screens Excluded.*
