export interface CodeSnippet {
  language: string;
  label: string;
  code: string;
}

export interface ApiEndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  headers: Record<string, string>;
  requestBody?: string;
  responseBody: string;
  snippets: CodeSnippet[];
}

export interface DocArticle {
  id: string;
  slug: string;
  title: string;
  category: 'getting-started' | 'guides' | 'integrations' | 'api-reference' | 'security' | 'troubleshooting';
  summary: string;
  readTime: string;
  lastUpdated: string;
  tags: string[];
  content: string; // Rich Markdown text
  apiSpec?: ApiEndpointSpec;
}

export interface DocCategory {
  id: string;
  title: string;
  description: string;
  iconName: string;
  articles: DocArticle[];
}

export const DOCS_CATEGORIES: DocCategory[] = [
  {
    id: 'getting-started',
    title: '🚀 Getting Started',
    description: 'Quickstart guides for Business Admins and Telecallers to set up CallMind in under 5 minutes.',
    iconName: 'Rocket',
    articles: [
      {
        id: 'admin-quickstart',
        slug: 'admin-quickstart',
        title: '5-Minute Admin Onboarding Guide',
        category: 'getting-started',
        summary: 'Learn how to set up your business workspace, invite telecallers using join codes, and connect B2B lead sources.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Admin', 'Onboarding', 'Workspace', 'Setup'],
        content: `
### Welcome to CallMind CRM!
CallMind is an all-in-one telecalling CRM designed for business owners and telecalling teams in India. Follow this quick guide to launch your workspace in under 5 minutes.

> [!NOTE]
> All workspace data is isolated at the PostgreSQL database level using Row-Level Security (RLS). Other companies can never access your customer leads.

---

### Step 1: Create Your Business Workspace
1. Register your account at [callmind.app/login](https://callmind.app/login).
2. Enter your **Company Name** and select your primary industry (Real Estate, Manufacturing, Healthcare, Education, Services).
3. Your workspace is automatically provisioned with default lead status pipelines (*New*, *Contacted*, *Interested*, *Callback*, *Closed*).

---

### Step 2: Invite Telecallers & Team Members
1. Go to **Team Management** from the left navigation bar.
2. Click **+ Invite Team Member** or copy your unique **6-Digit Workspace Join Code**.
3. Have your telecallers download the **CallMind Mobile App** from the Play Store and enter the Join Code to pair instantly.

> [!TIP]
> Admin and Founder accounts use the web dashboard at \`callmind.ai\`, while Telecallers dial leads using the mobile app.

---

### Step 3: Connect Lead Sources
Navigate to **Integrations** to activate automated lead ingestion for **IndiaMART**, **TradeIndia**, **Justdial**, or **Meta Facebook Ads**. Leads will automatically stream into your pipeline and route to active agents.
        `
      },
      {
        id: 'telecaller-mobile-setup',
        slug: 'telecaller-mobile-setup',
        title: 'Telecaller Mobile App Setup Guide',
        category: 'getting-started',
        summary: 'Step-by-step instructions for telecallers to install the mobile app, grant call permissions, and disable battery optimization.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Mobile App', 'Android', 'Telecaller', 'Call Log', 'Permissions'],
        content: `
### Installing the Android Telecaller App
The CallMind Telecaller App is optimized for low-end to high-end Android smartphones (Android 8.0+).

---

### Step 1: Download & Sign In
1. Download **CallMind Telecaller App** from the Google Play Store or scan the QR code in your admin workspace.
2. Sign in using your registered mobile number or Google account.
3. Enter the **6-digit Workspace Join Code** provided by your business admin.

---

### Step 2: Grant Android Permissions
To automatically log client call durations, caller IDs, and attendance, grant the following permissions when prompted:

* **Call Logs Permission**: Allows CallMind to record call start time, end time, and duration.
* **Phone State Permission**: Detects active call status (Ringing, On-Call, Idle).
* **Location Permission**: Enables GPS-verified attendance punch-in/out.
* **Camera Permission**: Captures timestamped selfie verification during attendance clock-in.

---

### Step 3: Disable Battery Optimization (Critical)
To prevent Android from killing the background call sync engine when your phone screen turns off:

1. Open Android **Settings ➔ Apps ➔ CallMind Telecaller**.
2. Tap **Battery** or **Power Management**.
3. Change setting from **Optimized** to **Unrestricted** (or *No Restrictions*).

> [!WARNING]
> If battery saver is not set to Unrestricted, Android may delay syncing call durations until the app is reopened manually.
        `
      },
      {
        id: 'architecture-overview',
        slug: 'architecture-overview',
        title: 'CallMind System Architecture & Security',
        category: 'getting-started',
        summary: 'Technical architecture overview: Express backend, Supabase PostgreSQL RLS, Gemini AI, and mobile offline sync.',
        readTime: '5 min read',
        lastUpdated: '2026-07-30',
        tags: ['Architecture', 'PostgreSQL', 'RLS', 'Express', 'Gemini AI'],
        content: `
### System Architecture Blueprint
CallMind combines a high-performance Express backend with Supabase PostgreSQL RLS and Deno Edge Functions.

---

### Key System Layers:

1. **Web Dashboard (React 19 SPA)**: High-speed management console built with Vite, TypeScript, Vanilla CSS, and Framer Motion. Uses Virtual List Windowing (\`@tanstack/react-virtual\`) to render up to 100,000 lead rows at 60 FPS.
2. **Backend Server (Node.js Express)**: Manages API routing (\`/api/*\` and \`/v1/*\`), background cron polling loops (IndiaMART & TradeIndia every 5 minutes), and Razorpay payment verification.
3. **Database (Supabase PostgreSQL RLS)**: Enforces cryptographic data isolation per company workspace using \`SECURITY DEFINER\` helper functions (\`get_my_company_id()\`).
4. **Mobile Telecaller App (React Native Expo)**: Offline-first mobile app for Android devices featuring local AsyncStorage queueing (\`@callmind_unsynced_calls\`), floating active call overlays, and GPS selfie attendance.
5. **AI Engine (Google Gemini AI)**: Neural lead scoring, transcript summarization, and customer sentiment classification via \`gemini-flash-latest\`.
        `
      }
    ]
  },
  {
    id: 'guides',
    title: '📱 Feature & Operations Guides',
    description: 'Deep dives into Round-Robin lead distribution, AI Gemini call summaries, attendance tracking, and offline sync.',
    iconName: 'Smartphone',
    articles: [
      {
        id: 'round-robin-routing',
        slug: 'round-robin-routing',
        title: 'Round-Robin & Smart Lead Assignment',
        category: 'guides',
        summary: 'Automate fair distribution of incoming leads among active telecallers with skill and city matching.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Leads', 'Automation', 'Round Robin', 'Routing'],
        content: `
### How Round-Robin Assignment Works
CallMind assigns incoming web leads (IndiaMART, TradeIndia, Meta Ads, Webhooks) sequentially to telecallers:

1. **Active Telecaller Check**: Filters telecallers marked as **Active** and currently checked in via **Attendance Punch-In**.
2. **Skill & Location Filter**: Matches lead requirement keywords (e.g. *Villa*, *Commercial*, *Bulk Purchase*) and lead city against agent specialties.
3. **Sequential Rotation**: Rotates through eligible telecallers using an atomic \`routing_state\` index pointer to prevent concurrent race condition duplicates.
4. **Fallback Queue**: If no telecallers are online, the lead enters the **Unassigned Pool** and triggers an Admin push notification.

---

### Smart Cooldown Deduplication
When a customer inquires multiple times within 7 days:
- The system merges new notes into the existing lead record.
- Flags the lead as **Unseen** to notify the assigned agent.
- Prevents duplicate CRM rows while preserving full activity history.
        `
      },
      {
        id: 'ai-call-summaries',
        slug: 'ai-call-summaries',
        title: 'AI Gemini Call Intelligence & Summaries',
        category: 'guides',
        summary: 'Automatic transcript summarization, customer sentiment scoring, and next action recommendations powered by Google Gemini AI.',
        readTime: '5 min read',
        lastUpdated: '2026-07-30',
        tags: ['AI', 'Gemini', 'Summaries', 'Analytics'],
        content: `
### AI Analysis Pipeline
CallMind integrates Google Gemini AI (\`gemini-flash-latest\`) to analyze sales call notes and transcripts:

* **2-Bullet Key Highlights**: Extracts customer budget, specific product requirements, and decision timeline.
* **Sentiment Classification**: Categorizes customer intent as **Hot** (high buying intent), **Warm** (considering options), or **Cold** (low interest).
* **Next Action Suggestion**: Recommends callback date, discount pitch, or product brochure follow-up.

---

### Privacy & Token Safety
All prompt payloads sent to Gemini are sanitized to strip confidential credit card or authentication tokens. Prompt lengths are capped at 2,000 characters to ensure sub-500ms latency and cost optimization.
        `
      },
      {
        id: 'attendance-geofencing',
        slug: 'attendance-geofencing',
        title: 'GPS & Selfie Attendance Tracking',
        category: 'guides',
        summary: 'Monitor telecaller clock-in/out times, geolocation coordinates, and selfie verification photos in real-time.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Attendance', 'GPS', 'Selfie', 'Security'],
        content: `
### Dual-Verification Clock-In
Telecallers clock in on their mobile app via two mandatory security checks:

1. **GPS Coordinates**: Captures exact Latitude & Longitude to confirm office or field location.
2. **Timestamped Selfie**: Captures live camera selfie photo to prevent buddy punching.

---

### Shift Status Calculations
- **Present**: Clock-in completed on or before shift start time.
- **Late**: Clock-in completed > 15 minutes after shift start time.
- **Half Day**: Total work duration between 4 and 6 hours.
        `
      },
      {
        id: 'offline-call-logging',
        slug: 'offline-call-logging',
        title: 'Offline Call Queueing & Auto-Sync Engine',
        category: 'guides',
        summary: 'How telecallers work seamlessly in zero-network areas without losing call records or notes.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Offline Sync', 'AsyncStorage', 'Call Logs'],
        content: `
### Offline Architecture (\`sync.ts\`)
When telecallers make client calls in low-connectivity areas:

1. Call disposition, duration, notes, and callback dates are saved to local device storage under \`@callmind_unsynced_calls\`.
2. The **Offline Status Banner** displays the exact number of pending unsynced records.
3. When network connectivity restores, CallMind automatically executes batch insert queries to the Supabase \`calls\` database table.
        `
      }
    ]
  },
  {
    id: 'integrations',
    title: '🔌 B2B Lead Integrations',
    description: 'Connect IndiaMART, TradeIndia, Justdial, Meta Ads, and WhatsApp Business API.',
    iconName: 'Zap',
    articles: [
      {
        id: 'indiamart-integration',
        slug: 'indiamart-integration',
        title: 'IndiaMART Lead Sync Integration',
        category: 'integrations',
        summary: 'Connect your IndiaMART Seller CRM API key to auto-fetch buy inquiries every 5 minutes.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['IndiaMART', 'B2B', 'Integration', 'API Key'],
        content: `
### Step 1: Obtain IndiaMART CRM API Key
1. Log into your **IndiaMART Seller Panel** (\`seller.indiamart.com\`).
2. Go to **Settings ➔ CRM API**.
3. Generate and copy your **IndiaMART CRM Key**.

---

### Step 2: Configure in CallMind
1. Open CallMind Web Dashboard and navigate to **Integrations ➔ IndiaMART**.
2. Paste your **IndiaMART CRM Key**.
3. Enable **Auto Round-Robin Distribution**.
4. Click **Save & Test Connection**.

---

### Auto-Polling Loop
CallMind's Express backend runs a background cron loop every 5 minutes (\`https://utils.indiamart.com/api/detail\`) to fetch new inquiries, deduplicate phone numbers, and assign leads to active telecallers.
        `
      },
      {
        id: 'tradeindia-integration',
        slug: 'tradeindia-integration',
        title: 'TradeIndia Lead Sync Integration',
        category: 'integrations',
        summary: 'Stream TradeIndia buy trade leads into CallMind CRM automatically.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['TradeIndia', 'B2B', 'Integration'],
        content: `
### Configuration Steps
1. Navigate to **Integrations ➔ TradeIndia**.
2. Enter your **User ID**, **Profile ID**, and **TradeIndia Key**.
3. Select lead assignment preference (*Round-Robin* or *Unassigned Pool*).
4. Click **Activate Integration**.
        `
      },
      {
        id: 'justdial-integration',
        slug: 'justdial-integration',
        title: 'Justdial Inbound Lead Integration',
        category: 'integrations',
        summary: 'Poll and ingest Justdial lead inquiries into your telecaller workspace.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Justdial', 'Lead Intake', 'Polling'],
        content: `
### Configuration Steps
1. In CallMind, open **Integrations ➔ Justdial**.
2. Enter your **Justdial Mobile Number** and **Lead API Auth Token**.
3. Test connection to verify lead stream ingestion.
        `
      },
      {
        id: 'meta-facebook-webhooks',
        slug: 'meta-facebook-webhooks',
        title: 'Meta Facebook Lead Ads Webhook Setup',
        category: 'integrations',
        summary: 'Connect Facebook Instant Forms to push leads instantly to CallMind within 2 seconds of ad submission.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Meta Ads', 'Facebook', 'Webhooks', 'Real-time'],
        content: `
### Webhook Target URL
Use the following webhook endpoint in Meta Developer App Settings:
\`\`\`http
POST https://api.callmind.app/v1/webhooks/facebook
\`\`\`

### Header Parameters
Include your workspace API Key in the custom header or query string:
\`\`\`http
x-callmind-key: cm_live_98a7b6c5d4e3f2a1
\`\`\`
        `
      }
    ]
  },
  {
    id: 'api-reference',
    title: '💻 REST API Reference',
    description: 'Complete API endpoints for managing leads, logging calls, tracking attendance, and processing Razorpay payments.',
    iconName: 'Code',
    articles: [
      {
        id: 'api-auth-headers',
        slug: 'api-auth-headers',
        title: 'API Authentication & Bearer Tokens',
        category: 'api-reference',
        summary: 'How to authenticate REST API calls using Workspace API Keys and Bearer Tokens.',
        readTime: '2 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Auth', 'Bearer Token', 'Security'],
        content: `
### Authenticating API Requests
All requests to CallMind REST API endpoints must include your Workspace API Key in the HTTP \`Authorization\` header:

\`\`\`http
Authorization: Bearer cm_live_98a7b6c5d4e3f2a1
Content-Type: application/json
\`\`\`

> [!IMPORTANT]
> Keep your Workspace API Keys secret. Never commit API keys to public repositories or front-end client code.
        `
      },
      {
        id: 'api-create-lead',
        slug: 'api-create-lead',
        title: 'Create Lead (POST /api/leads)',
        category: 'api-reference',
        summary: 'Programmatically inject a new customer lead into your CallMind workspace.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Leads', 'POST', 'Developer'],
        content: `
### Endpoint Overview
Push leads from custom websites, landing page forms, web apps, or third-party CRMs directly into CallMind.
        `,
        apiSpec: {
          method: 'POST',
          path: '/api/leads',
          description: 'Pushes a new lead object into the company workspace queue.',
          headers: {
            'Authorization': 'Bearer <YOUR_WORKSPACE_API_KEY>',
            'Content-Type': 'application/json'
          },
          requestBody: JSON.stringify({
            name: "Rajesh Kumar",
            phone: "+919876543210",
            email: "rajesh@example.com",
            source: "Website Landing Page",
            city: "Mumbai",
            custom_data: {
              budget: "₹1,50,000",
              requirement: "Bulk Telecalling Software"
            }
          }, null, 2),
          responseBody: JSON.stringify({
            success: true,
            lead_id: "lead_89f7a2b1c4e",
            assigned_to: "usr_telecaller_04",
            assigned_agent_name: "Priya Sharma",
            status: "New",
            created_at: "2026-07-30T10:30:00Z"
          }, null, 2),
          snippets: [
            {
              language: 'bash',
              label: 'cURL',
              code: `curl -X POST https://api.callmind.app/api/leads \\
  -H "Authorization: Bearer cm_live_98a7b6c5d4e3f2a1" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@example.com",
    "source": "Website Landing Page",
    "city": "Mumbai"
  }'`
            },
            {
              language: 'javascript',
              label: 'JavaScript / Fetch',
              code: `const response = await fetch('https://api.callmind.app/api/leads', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer cm_live_98a7b6c5d4e3f2a1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Rajesh Kumar',
    phone: '+919876543210',
    email: 'rajesh@example.com',
    source: 'Website Landing Page',
    city: 'Mumbai'
  })
});
const data = await response.json();
console.log(data);`
            },
            {
              language: 'python',
              label: 'Python',
              code: `import requests

url = "https://api.callmind.app/api/leads"
headers = {
    "Authorization": "Bearer cm_live_98a7b6c5d4e3f2a1",
    "Content-Type": "application/json"
}
payload = {
    "name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@example.com",
    "source": "Website Landing Page",
    "city": "Mumbai"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
            },
            {
              language: 'dart',
              label: 'Flutter / Dart',
              code: `import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> createLead() async {
  final response = await http.post(
    Uri.parse('https://api.callmind.app/api/leads'),
    headers: {
      'Authorization': 'Bearer cm_live_98a7b6c5d4e3f2a1',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'name': 'Rajesh Kumar',
      'phone': '+919876543210',
      'source': 'Flutter Mobile App',
      'city': 'Mumbai',
    }),
  );
  print(response.body);
}`
            }
          ]
        }
      },
      {
        id: 'api-list-leads',
        slug: 'api-list-leads',
        title: 'List Leads (GET /api/leads)',
        category: 'api-reference',
        summary: 'Fetch paginated leads list with status, assigned agent, and date range filters.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Leads', 'GET'],
        content: `
### Query Parameters
- \`status\`: Filter by status (\`New\`, \`Contacted\`, \`Interested\`, \`Closed\`, \`Callback\`).
- \`limit\`: Number of records to return (Default: 50, Max: 250).
- \`offset\`: Pagination offset index.
        `,
        apiSpec: {
          method: 'GET',
          path: '/api/leads?status=New&limit=10',
          description: 'Returns a paginated list of leads for the workspace.',
          headers: {
            'Authorization': 'Bearer <YOUR_WORKSPACE_API_KEY>'
          },
          responseBody: JSON.stringify({
            total: 142,
            page: 1,
            limit: 10,
            data: [
              {
                id: "lead_99a8b7c6",
                name: "Anil Sharma",
                phone: "+919811223344",
                status: "New",
                source: "IndiaMART",
                assigned_to_name: "Priya Sharma",
                created_at: "2026-07-30T09:15:00Z"
              }
            ]
          }, null, 2),
          snippets: [
            {
              language: 'bash',
              label: 'cURL',
              code: `curl -X GET "https://api.callmind.app/api/leads?status=New&limit=10" \\
  -H "Authorization: Bearer cm_live_98a7b6c5d4e3f2a1"`
            },
            {
              language: 'javascript',
              label: 'JavaScript / Fetch',
              code: `const response = await fetch('https://api.callmind.app/api/leads?status=New&limit=10', {
  headers: { 'Authorization': 'Bearer cm_live_98a7b6c5d4e3f2a1' }
});
const leads = await response.json();`
            }
          ]
        }
      },
      {
        id: 'api-log-call',
        slug: 'api-log-call',
        title: 'Log Call (POST /api/calls/log)',
        category: 'api-reference',
        summary: 'Record sales call duration, disposition outcome, interest level, and AI notes.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Calls', 'Logging', 'POST'],
        content: `
### Endpoint Overview
Log call interaction details initiated by telecallers or automated dialer systems.
        `,
        apiSpec: {
          method: 'POST',
          path: '/api/calls/log',
          description: 'Records a completed sales call entry in the database.',
          headers: {
            'Authorization': 'Bearer <YOUR_WORKSPACE_API_KEY>',
            'Content-Type': 'application/json'
          },
          requestBody: JSON.stringify({
            lead_id: "lead_89f7a2b1c4e",
            phone: "+919876543210",
            duration: 184,
            status: "connected",
            interest_level: "hot",
            ai_summary: "Customer requested pricing quote for 15 telecaller seats. Follow up tomorrow at 2 PM.",
            callback_date: "2026-07-31T14:00:00Z"
          }, null, 2),
          responseBody: JSON.stringify({
            success: true,
            call_id: "call_77c8b9a0",
            logged_at: "2026-07-30T10:45:00Z"
          }, null, 2),
          snippets: [
            {
              language: 'bash',
              label: 'cURL',
              code: `curl -X POST https://api.callmind.app/api/calls/log \\
  -H "Authorization: Bearer cm_live_98a7b6c5d4e3f2a1" \\
  -H "Content-Type: application/json" \\
  -d '{
    "lead_id": "lead_89f7a2b1c4e",
    "phone": "+919876543210",
    "duration": 184,
    "status": "connected"
  }'`
            }
          ]
        }
      },
      {
        id: 'api-payments-order',
        slug: 'api-payments-order',
        title: 'Razorpay Orders & Verification (POST /api/payments/*)',
        category: 'api-reference',
        summary: 'Create Razorpay payment orders and verify cryptographic HMAC SHA-256 signatures.',
        readTime: '5 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Razorpay', 'Payments', 'Security'],
        content: `
### Razorpay Checkout Protocol

1. **Create Order (\`POST /api/payments/create-order\`)**:
   Generates a Razorpay Order ID with authoritative purchase notes (\`companyId\`, \`planId\`, \`seats\`, \`durationMonths\`).

2. **Verify Payment Signature (\`POST /api/payments/verify\`)**:
   Validates HMAC SHA-256 signature using constant-time string comparison (\`safeEqual\`), checks replay guard index on \`razorpay_payment_id\`, and upgrades the company subscription.
        `,
        apiSpec: {
          method: 'POST',
          path: '/api/payments/create-order',
          description: 'Creates a signed Razorpay payment order for subscription upgrade.',
          headers: {
            'Authorization': 'Bearer <USER_SESSION_TOKEN>',
            'Content-Type': 'application/json'
          },
          requestBody: JSON.stringify({
            amount: 2499,
            companyId: "cmp_99a8b7c6",
            planId: "professional",
            seats: 10,
            durationMonths: 12
          }, null, 2),
          responseBody: JSON.stringify({
            success: true,
            orderId: "order_Qz9a8b7c6d5e",
            amount: 249900,
            currency: "INR",
            keyId: "rzp_live_xxxxxxxxxxxxxx"
          }, null, 2),
          snippets: [
            {
              language: 'javascript',
              label: 'JavaScript / Fetch',
              code: `const response = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${userToken}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 2499,
    companyId: 'cmp_99a8b7c6',
    planId: 'professional',
    seats: 10,
    durationMonths: 12
  })
});
const order = await response.json();`
            }
          ]
        }
      }
    ]
  },
  {
    id: 'security',
    title: '🛡️ Security & DPDP Compliance',
    description: 'PostgreSQL Row-Level Security (RLS), HMAC SHA-256 payment hardening, and DPDP compliance APIs.',
    iconName: 'Shield',
    articles: [
      {
        id: 'multi-tenant-rls',
        slug: 'multi-tenant-rls',
        title: 'PostgreSQL Row-Level Security (RLS)',
        category: 'security',
        summary: 'How CallMind enforces cryptographic data separation across organization workspaces.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Security', 'PostgreSQL', 'RLS', 'Multi-tenant'],
        content: `
### Cryptographic Data Isolation
Every client organization is isolated at the database kernel layer using PostgreSQL Row-Level Security (RLS):

\`\`\`sql
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()::text;
$$;
\`\`\`

Even if an API parameter is manipulated, database queries cannot return rows belonging to a different \`company_id\`.
        `
      },
      {
        id: 'dpdp-right-to-be-forgotten',
        slug: 'dpdp-right-to-be-forgotten',
        title: 'India DPDP & GDPR Right-to-be-Forgotten',
        category: 'security',
        summary: 'Automated data deletion endpoints compliant with India’s Digital Personal Data Protection Act.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Compliance', 'DPDP', 'GDPR', 'Data Deletion'],
        content: `
### Purging Customer Data
CallMind provides an automated Deno Edge Function (\`purge-user-data\`) to execute complete cascade deletions under DPDP compliance rules:

1. Deletes customer lead profile and custom JSON payload.
2. Anonymizes past call duration records while preserving aggregate statistics.
3. Emits an immutable audit log entry documenting data erasure.
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: '❓ Troubleshooting & Error Matrix',
    description: 'HTTP status code matrix, rate-limiting rules (30 req/min), and call sync diagnostic steps.',
    iconName: 'HelpCircle',
    articles: [
      {
        id: 'error-codes-matrix',
        slug: 'error-codes-matrix',
        title: 'HTTP Status Codes & Resolution Matrix',
        category: 'troubleshooting',
        summary: 'Comprehensive list of API error response codes and step-by-step resolution steps.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Troubleshooting', 'Error Codes', 'HTTP', 'Rate Limit'],
        content: `
### Standard API Response Matrix

| Status Code | Meaning | Cause | Action |
|---|---|---|---|
| \`200 OK\` | Success | Request succeeded | Process returned JSON response |
| \`400 Bad Request\` | Invalid Payload | Missing required fields or invalid phone format | Check request JSON body structure |
| \`401 Unauthorized\` | Invalid API Token | Missing or invalid \`Authorization\` header | Verify Workspace API Key |
| \`403 Forbidden\` | Permission Denied | Role gate restriction (Telecaller accessing Admin API) | Upgrade user role in Team Settings |
| \`409 Conflict\` | Duplicate / Replay | Payment ID already redeemed or lead deduplicated | Check payment ID or lead status |
| \`429 Rate Limit\` | Too Many Requests | Exceeded 30 requests per minute ceiling | Implement exponential backoff retry |
| \`500 Internal Error\` | System Exception | Unexpected backend error | Check system status or retry |

---

### Handling 429 Rate Limits
CallMind enforces a rate limit of **30 requests / minute** per workspace API key. When exceeded, the API returns:
\`\`\`json
{
  "error": "Rate limit exceeded. Please try again in 60 seconds.",
  "retry_after": 60
}
\`\`\`
        `
      }
    ]
  }
];
