# 🔌 CallMind: Web App Structure & Web-to-Mobile Integration Architecture

**प्रोजेक्ट:** CallMind CRM  
**उद्देश्य:** सध्याच्या Web App चे पूर्ण मॅपिंग आणि Web App व Mobile App मधील रिअल-टाईम तांत्रिक जोडणी (Data Sync & Realtime Bridge).

---

## 💻 १. सध्याच्या Web App मध्ये काय काय बनलेले आहे? (Existing Web App Inventory)

आपल्या सध्याच्या Web App मध्ये खालील १० मुख्य मॉड्यूल्स (Components & Features) पूर्णपणे कार्यरत आहेत:

| Module / Screen | File Reference | Web App मधील मुख्य कामे |
| :--- | :--- | :--- |
| **१. Master Dashboard & Analytics** | [`Dashboard.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/Dashboard.tsx), [`AnalyticsPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AnalyticsPage.tsx) | एकूण लीड्स, कॉल्सची संख्या, कन्व्हर्जन रेट, हीटमॅप्स आणि डेली परफॉर्मन्स चार्ट्स. |
| **२. Leads Engine & Kanban Board** | [`LeadsPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/LeadsPage.tsx), [`PipelineBoard.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/PipelineBoard.tsx) | लीड्सची यादी, कानबान बोर्ड (Drag & Drop), CSV Smart Import, कस्टम फिल्ड्स आणि कॉलर अलॉटमेंट. |
| **३. Lead Sources & Integrations** | [`IntegrationsPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/IntegrationsPage.tsx), `integrations/*` | IndiaMART, TradeIndia, Justdial, Facebook Lead Ads, Google Ads आणि Webhook Credentials सेटअप. |
| **४. Team & Target Management** | [`TeamPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/TeamPage.tsx), [`TeamTargetsSection.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/TeamTargetsSection.tsx) | कॉलींग टीम मेंबर्स ॲड करणे, रोल सेट करणे, डेली/मंथली कॉल टार्गेट्स सेट करणे. |
| **५. Attendance & Punch Tracking** | [`AttendanceSection.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AttendanceSection.tsx) | सर्व टेलिकॉलर्सचे Punch-In / Punch-Out टाईमस्टॅम्प्स व हजेरी रिपोर्ट्स. |
| **६. Calls & History Log** | [`CallsPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/CallsPage.tsx) | सर्व कॉल्सची हिस्टरी, कॉल कालावधी (Duration), कॉल स्टेटस (Completed, Missed, Busy) आणि नोट्स. |
| **७. Live Agent Monitor** | [`AgentLiveMonitor.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AgentLiveMonitor.tsx) | टेलिकॉलर्स सध्या Active आहेत, On Call आहेत की Offline आहेत याचे लाईव्ह मॉनिटरिंग. |
| **८. Automations & Drips** | [`AutomationPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AutomationPage.tsx), [`SequencesPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/SequencesPage.tsx) | व्हॉट्सॲप टेम्पलेट्स, ऑटोमॅटिक फॉलो-अप रूल्स आणि सिक्वेन्सेस. |
| **९. AI Training & Insights** | [`AITrainingPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AITrainingPage.tsx), [`AIInsightsHub.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AIInsightsHub.tsx) | Gemini 1.5 Flash AI द्वारे कॉल समरी, ऑटो FAQ जनरेशन आणि सेंटीमेंट ॲनालिसिस. |
| **१०. Founder Hub & Audit** | [`FounderDashboard.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/FounderDashboard.tsx), [`AuditLogPage.tsx`](file:///c:/Users/vrushabh/Downloads/callmind%20%284%29/src/components/AuditLogPage.tsx) | Multi-tenant Workspace मॅनेजमेंट, सिस्टम ऑडिट लॉग्ज आणि DPDP/GDPR रिमोट डेटा वाईप. |

---

## 🔄 २. Web App आणि Mobile App मधील रिअल-टाईम कनेक्शन कसे होईल? (Web-to-Mobile Architecture)

Web App आणि Mobile App एकमेकांशी **३ मुख्य मार्गांनी (3 Communication Channels)** रिअल-टाईम जोडले जातील:

```
                      +---------------------------------------+
                      |   SHARED SUPABASE POSTGRES DATABASE   |
                      |   (Tables: leads, calls, users, etc.) |
                      +-------------------+-------------------+
                                          |
                +-------------------------+-------------------------+
                | Realtime WebSockets                               | Realtime WebSockets
                v                                                   v
   +--------------------------+                         +--------------------------+
   |   WEB APP (Browser)      |                         |   MOBILE APP (Android)   |
   |   (Founder & Admin)      |                         |   (Telecallers)          |
   |                          |                         |                          |
   | • View Live Dashboard    |                         | • Today's Lead Queue     |
   | • Configure Integrations |                         | • 1-Click SIM Dialer     |
   | • Assign Leads           |                         | • Post-Call Disposition  |
   | • Live Agent Monitor     |                         | • Push Notifications     |
   +------------+-------------+                         +------------+-------------+
                |                                                    |
                +-------------------- REST API ----------------------+
                                         |
                                         v
                      +---------------------------------------+
                      |   EXPRESS BACKEND SERVER (server.ts)  |
                      |   - Automated Round-Robin Engine      |
                      |   - Webhooks Ingestion Loop           |
                      |   - Expo Push Notification Trigger    |
                      +---------------------------------------+
```

---

### 📡 १. Shared Database & Row-Level Security (RLS) Bridge:
* **एकच डेटाबेस:** Web App आणि Mobile App दोन्ही एकाच Supabase PostgreSQL डेटाबेसला जोडलेले असतील.
* **रोल आयसोलेशन (Security):**
  * जेव्हा ॲडमिन Web App वरून लॉगिन करतो (`role = founder/admin`), तेव्हा त्याला संपूर्ण कंपनीचा डेटा दिसतो.
  * जेव्हा कॉलर Mobile App वरून लॉगिन करतो (`role = user`), तेव्हा Supabase RLS Policy मुळे त्याला **फक्त त्याच्या नावावर असाईन झालेले लीड्स (`assigned_to = user.id`)** दिसतात.

---

### ⚡ २. Supabase Realtime WebSockets (झटपट डेटा अपडेट):
* **Web to Mobile (नवीन लीड मिळाला):**  
  ॲडमिनने Web App वर नवीन लीड ॲड केला किंवा पोर्टलमधून (IndiaMART/FB) ऑटो-लीड आला ➔ Supabase WebSocket द्वारे मोबाईल ॲपवर रिअल-टाईम अपडेट जातो ➔ मोबाईलवर स्क्रीन न रिफ्रेश करता नवीन लीड दिसतो.
* **Mobile to Web (कॉल झाला):**  
  टेलिकॉलरने मोबाईलवर कॉल केला आणि Disposition (उदा. *Interested*) सेव्ह केले ➔ मोबाईल ॲप `calls` टेबलमध्ये एंट्री टाकतो ➔ Web App च्या ॲडमिन डॅशबोर्डवर १ सेकंदात कॉल काउंट आणि आलेखात बदल दिसतो!

---

### 🔔 ३. Push Notification Engine (नवीन लीडचे अलर्ट्स):
1. IndiaMART किंवा Facebook वरून नवीन लीड एक्सप्रेस सर्व्हरवर येतो.
2. `processInboundLead()` इंजिन Round-Robin पद्धतीने कॉलर ठरवते.
3. Express Server **Expo Push Notification API** द्वारे टेलिकॉलरच्या मोबाईलवर त्वरित मेसेज पाठवतो:  
   *"🔔 नवीन लीड: अमोल पाटील - ३ BHK चौकशी"*.

---

## 🎯 ३. सारांश (Executive Summary)

1. **वेबॲप = कंट्रोल रूम (Control Tower):** जिथे ॲडमिन लीड पोर्टल्स जोडतो, रूल्स बनवतो आणि रिपोर्ट्स पाहतो.
2. **मोबाईल ॲप = कॉलींग गन (Execution Tool):** जिथे टेलिकॉलर १-क्लिकमध्ये कॉल्स करतो आणि रिझल्ट्स सेव्ह करतो.
3. **कनेक्शन = Supabase Realtime + Express Backend:** दोघेही एकाच डेटाबेसवर चालत असल्यामुळे मॅन्युअली काहीही सिंक करण्याची गरज नाही; डेटा **१ सेकंदात आपोआप सिंक** होतो!

---
*अहवाल तयार केला: Principal Solutions Architect & CEO, CallMind Product Strategy Group*
