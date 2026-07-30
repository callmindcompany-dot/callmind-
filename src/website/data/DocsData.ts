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
  content: string;
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
    title: 'Getting Started',
    description: 'Setup guides for Business Admins and Telecallers.',
    iconName: 'Rocket',
    articles: [
      {
        id: 'admin-quickstart',
        slug: 'admin-quickstart',
        title: 'Admin Workspace Setup',
        category: 'getting-started',
        summary: 'Set up your company workspace, generate join codes, invite telecallers, and configure lead pipelines.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Admin', 'Setup', 'Workspace'],
        content: `
### Workspace Initialization
When you register an account, CallMind creates a tenant workspace bound to your \`company_id\`. All customer data, leads, and call logs are cryptographically isolated in PostgreSQL using Row-Level Security (RLS).

---

### Inviting Telecallers
1. Navigate to **Team Management** in the web dashboard.
2. Generate a **6-Digit Join Code** or click **+ Invite Member**.
3. Telecallers enter this 6-digit code in the **CallMind Mobile App** to pair their mobile device with your workspace.

---

### Role-Based Access Control
* **Founder / Admin**: Uses the Web Dashboard (\`callmind.app\`) to monitor call attendance, assign leads, view reports, and manage billing.
* **Telecaller / Team Lead**: Uses the Mobile App to dial assigned leads, log call dispositions, and record voice notes.
        `
      },
      {
        id: 'telecaller-mobile-setup',
        slug: 'telecaller-mobile-setup',
        title: 'Telecaller Mobile App Setup',
        category: 'getting-started',
        summary: 'Install the Android app, grant required telephony and call log permissions, and configure battery settings.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Mobile App', 'Android', 'Permissions'],
        content: `
### Installation & Requirements
The CallMind Telecaller App is built for Android smartphones running Android 8.0 or higher.

---

### Mandatory Android Permissions
To ensure call durations and dispositions log accurately into the CRM:

1. **CALL_PHONE**: Enables one-tap direct dialing from lead cards.
2. **READ_CALL_LOG**: Reads call start, end, and duration metrics to log agent call output.
3. **ACCESS_FINE_LOCATION**: Validates GPS coordinates during attendance clock-in.
4. **CAMERA**: Captures selfie verification during morning attendance punch-in.

---

### Disabling Android Battery Optimization
Android OS power management may suspend background sync tasks if left on default settings:

1. Open Android **Settings ➔ Apps ➔ CallMind**.
2. Select **Battery**.
3. Set background usage option to **Unrestricted**.
        `
      }
    ]
  },
  {
    id: 'guides',
    title: 'Core Features',
    description: 'Lead routing rules, Gemini AI summaries, and GPS attendance.',
    iconName: 'Smartphone',
    articles: [
      {
        id: 'round-robin-routing',
        slug: 'round-robin-routing',
        title: 'Lead Routing & Assignment Rules',
        category: 'guides',
        summary: 'Understand automated round-robin distribution and smart deduplication cooldown rules.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Routing', 'Leads', 'Automation'],
        content: `
### Round-Robin Distribution Protocol
CallMind routes incoming web leads (IndiaMART, TradeIndia, Webhooks) sequentially among active telecallers:

1. **Active Filter**: Only telecallers checked in via Attendance Punch-In are included in the rotation pool.
2. **Atomic Index Pointer**: Updates the \`routing_state\` table index atomically to prevent concurrent double-assignments.
3. **Unassigned Fallback**: If no agent is online, leads enter the Unassigned Pool and trigger an admin notification.

---

### Smart Cooldown Deduplication
If a phone number re-inquires within 7 days:
- The system merges the new note into the existing lead history.
- Flags the lead as **Unseen** to alert the assigned agent.
- Prevents duplicate CRM rows while maintaining complete inquiry timelines.
        `
      },
      {
        id: 'ai-call-summaries',
        slug: 'ai-call-summaries',
        title: 'Gemini AI Call Intelligence',
        category: 'guides',
        summary: 'Automatic call note summarization, buying intent classification, and next-action suggestions.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['AI', 'Gemini', 'Analytics'],
        content: `
### AI Analysis Features
CallMind integrates Google Gemini AI (\`gemini-flash-latest\`) to analyze sales notes:

* **Key Highlights**: Extracts customer budget and core requirements.
* **Intent Rating**: Classifies lead interest level as **Hot**, **Warm**, or **Cold**.
* **Follow-up Suggestion**: Recommends callback timing and discount pitch strategies.
        `
      },
      {
        id: 'attendance-geofencing',
        slug: 'attendance-geofencing',
        title: 'Attendance & GPS Verification',
        category: 'guides',
        summary: 'Track telecaller clock-in times, geolocation coordinates, and selfie verification photos.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Attendance', 'GPS', 'Verification'],
        content: `
### Dual Verification
Telecallers clock in on their mobile app via two checks:
1. **GPS Geolocation**: Captures exact latitude & longitude coordinates.
2. **Selfie Photo**: Captures live selfie image to prevent proxy clock-ins.
        `
      }
    ]
  },
  {
    id: 'integrations',
    title: 'Lead Integrations',
    description: 'Setup guides for IndiaMART, TradeIndia, and Meta Facebook Ads.',
    iconName: 'Zap',
    articles: [
      {
        id: 'indiamart-integration',
        slug: 'indiamart-integration',
        title: 'IndiaMART Integration Guide',
        category: 'integrations',
        summary: 'Connect your IndiaMART Seller CRM API key to auto-fetch inquiries every 5 minutes.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['IndiaMART', 'B2B', 'Integration'],
        content: `
### Setup Instructions
1. Log into your **IndiaMART Seller Panel** (\`seller.indiamart.com\`).
2. Go to **Settings ➔ CRM API** and copy your **IndiaMART CRM Key**.
3. In CallMind, navigate to **Integrations ➔ IndiaMART**.
4. Paste the key and click **Save & Test Connection**.

The system polls IndiaMART every 5 minutes and routes incoming leads to active telecallers automatically.
        `
      },
      {
        id: 'tradeindia-integration',
        slug: 'tradeindia-integration',
        title: 'TradeIndia Integration Guide',
        category: 'integrations',
        summary: 'Connect TradeIndia User ID and Profile ID to ingest trade buy leads.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['TradeIndia', 'B2B', 'Integration'],
        content: `
### Setup Instructions
1. In CallMind, open **Integrations ➔ TradeIndia**.
2. Enter your **User ID**, **Profile ID**, and **TradeIndia Key**.
3. Click **Activate Integration**.
        `
      },
      {
        id: 'meta-facebook-webhooks',
        slug: 'meta-facebook-webhooks',
        title: 'Meta Facebook Lead Ads Webhook',
        category: 'integrations',
        summary: 'Connect Facebook Lead Forms to ingest lead data in real-time.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['Meta Ads', 'Webhooks', 'Real-time'],
        content: `
### Webhook Endpoint
Configure your Meta App webhook setting to:
\`\`\`http
POST https://callmind.app/v1/webhooks/facebook
\`\`\`

Include your workspace API Key header:
\`\`\`http
x-callmind-key: YOUR_WORKSPACE_API_KEY
\`\`\`
        `
      }
    ]
  },
  {
    id: 'api-reference',
    title: 'REST API Reference',
    description: 'API endpoints for managing leads, logging calls, and payment verification.',
    iconName: 'Code',
    articles: [
      {
        id: 'api-auth-headers',
        slug: 'api-auth-headers',
        title: 'API Authentication & Bearer Tokens',
        category: 'api-reference',
        summary: 'Authenticate API requests using Workspace Bearer Tokens.',
        readTime: '2 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Auth', 'Bearer Token'],
        content: `
### Authentication Header
Pass your Workspace API Key in the \`Authorization\` HTTP header:

\`\`\`http
Authorization: Bearer YOUR_WORKSPACE_API_KEY
Content-Type: application/json
\`\`\`
        `
      },
      {
        id: 'api-create-lead',
        slug: 'api-create-lead',
        title: 'Create Lead (POST /api/leads)',
        category: 'api-reference',
        summary: 'Endpoint to inject a new lead into your CallMind workspace queue.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Leads', 'POST'],
        content: `
### Overview
Use this endpoint to push leads from landing pages or external systems into CallMind.
        `,
        apiSpec: {
          method: 'POST',
          path: '/api/leads',
          description: 'Pushes a new lead into the workspace queue.',
          headers: {
            'Authorization': 'Bearer YOUR_WORKSPACE_API_KEY',
            'Content-Type': 'application/json'
          },
          requestBody: JSON.stringify({
            name: "Rajesh Kumar",
            phone: "+919876543210",
            email: "rajesh@example.com",
            source: "Website Form",
            city: "Mumbai"
          }, null, 2),
          responseBody: JSON.stringify({
            success: true,
            lead_id: "lead_89f7a2b1c4e",
            assigned_to: "usr_telecaller_04",
            status: "New",
            created_at: "2026-07-30T10:30:00Z"
          }, null, 2),
          snippets: [
            {
              language: 'bash',
              label: 'cURL',
              code: `curl -X POST https://callmind.app/api/leads \\
  -H "Authorization: Bearer YOUR_WORKSPACE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@example.com",
    "source": "Website Form",
    "city": "Mumbai"
  }'`
            },
            {
              language: 'javascript',
              label: 'JavaScript / Fetch',
              code: `const response = await fetch('https://callmind.app/api/leads', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_WORKSPACE_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Rajesh Kumar',
    phone: '+919876543210',
    email: 'rajesh@example.com',
    source: 'Website Form',
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

url = "https://callmind.app/api/leads"
headers = {
    "Authorization": "Bearer YOUR_WORKSPACE_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@example.com",
    "source": "Website Form",
    "city": "Mumbai"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
            }
          ]
        }
      },
      {
        id: 'api-list-leads',
        slug: 'api-list-leads',
        title: 'List Leads (GET /api/leads)',
        category: 'api-reference',
        summary: 'Fetch paginated leads list with status and agent filters.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Leads', 'GET'],
        content: `
### Parameters
- \`status\`: Filter by status (\`New\`, \`Contacted\`, \`Interested\`, \`Closed\`).
- \`limit\`: Items per page (Default: 50, Max: 250).
        `,
        apiSpec: {
          method: 'GET',
          path: '/api/leads?status=New&limit=10',
          description: 'Returns a list of leads for the workspace.',
          headers: {
            'Authorization': 'Bearer YOUR_WORKSPACE_API_KEY'
          },
          responseBody: JSON.stringify({
            total: 142,
            data: [
              {
                id: "lead_99a8b7c6",
                name: "Anil Sharma",
                phone: "+919811223344",
                status: "New",
                source: "IndiaMART",
                assigned_to_name: "Priya Sharma"
              }
            ]
          }, null, 2),
          snippets: [
            {
              language: 'bash',
              label: 'cURL',
              code: `curl -X GET "https://callmind.app/api/leads?status=New&limit=10" \\
  -H "Authorization: Bearer YOUR_WORKSPACE_API_KEY"`
            },
            {
              language: 'javascript',
              label: 'JavaScript',
              code: `const response = await fetch('https://callmind.app/api/leads?status=New&limit=10', {
  headers: { 'Authorization': 'Bearer YOUR_WORKSPACE_API_KEY' }
});
const data = await response.json();`
            }
          ]
        }
      },
      {
        id: 'api-log-call',
        slug: 'api-log-call',
        title: 'Log Call (POST /api/calls/log)',
        category: 'api-reference',
        summary: 'Log call duration, disposition outcome, interest rating, and notes.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Calls', 'Logging'],
        content: `
### Endpoint Overview
Records completed call details from telecallers or automated dialers.
        `,
        apiSpec: {
          method: 'POST',
          path: '/api/calls/log',
          description: 'Records a completed sales call entry.',
          headers: {
            'Authorization': 'Bearer YOUR_WORKSPACE_API_KEY',
            'Content-Type': 'application/json'
          },
          requestBody: JSON.stringify({
            lead_id: "lead_89f7a2b1c4e",
            phone: "+919876543210",
            duration: 184,
            status: "connected",
            interest_level: "hot",
            ai_summary: "Client requested quote for 15 seats."
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
              code: `curl -X POST https://callmind.app/api/calls/log \\
  -H "Authorization: Bearer YOUR_WORKSPACE_API_KEY" \\
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
        title: 'Razorpay Order & Verification (POST /api/payments/*)',
        category: 'api-reference',
        summary: 'Create Razorpay payment orders and verify HMAC SHA-256 signatures.',
        readTime: '4 min read',
        lastUpdated: '2026-07-30',
        tags: ['API', 'Razorpay', 'Payments'],
        content: `
### Razorpay Payment Flow
1. **Create Order** (\`POST /api/payments/create-order\`): Creates signed order with notes.
2. **Verify Signature** (\`POST /api/payments/verify\`): Verifies HMAC SHA-256 signature using constant-time string comparison (\`safeEqual\`) and updates subscription.
        `,
        apiSpec: {
          method: 'POST',
          path: '/api/payments/create-order',
          description: 'Creates a signed Razorpay payment order for subscription upgrade.',
          headers: {
            'Authorization': 'Bearer USER_SESSION_TOKEN',
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
            keyId: "rzp_test_TJbhOtTceUKc5D"
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
    title: 'Security & Compliance',
    description: 'PostgreSQL Row-Level Security and DPDP compliance data erasure.',
    iconName: 'Shield',
    articles: [
      {
        id: 'multi-tenant-rls',
        slug: 'multi-tenant-rls',
        title: 'PostgreSQL Row-Level Security (RLS)',
        category: 'security',
        summary: 'How CallMind enforces cryptographic data isolation across tenant workspaces.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Security', 'PostgreSQL', 'RLS'],
        content: `
### Data Isolation Guarantee
Every table in CallMind containing customer data (\`leads\`, \`calls\`, \`attendance_logs\`, \`audit_logs\`) includes a \`company_id\` column.

Database isolation is enforced using PostgreSQL \`SECURITY DEFINER\` functions:

\`\`\`sql
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()::text;
$$;
\`\`\`

Queries executed by authenticated users are restricted to matching \`company_id\` rows automatically.
        `
      },
      {
        id: 'dpdp-right-to-be-forgotten',
        slug: 'dpdp-right-to-be-forgotten',
        title: 'DPDP & GDPR Data Purge Protocol',
        category: 'security',
        summary: 'Automated data deletion edge function compliant with Digital Personal Data Protection standards.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Compliance', 'DPDP', 'GDPR'],
        content: `
### Purging Customer Data
CallMind provides a Deno Edge Function (\`purge-user-data\`) to delete user and lead records upon request:

1. Deletes customer lead records and custom JSON metadata.
2. Anonymizes past call duration entries while preserving company metrics.
3. Records an audit log entry documenting data erasure.
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting & Errors',
    description: 'HTTP status codes, rate limits, and common resolution steps.',
    iconName: 'HelpCircle',
    articles: [
      {
        id: 'error-codes-matrix',
        slug: 'error-codes-matrix',
        title: 'HTTP Status Codes Matrix',
        category: 'troubleshooting',
        summary: 'API error response codes and troubleshooting steps.',
        readTime: '3 min read',
        lastUpdated: '2026-07-30',
        tags: ['Troubleshooting', 'Error Codes', 'HTTP'],
        content: `
### Status Code Matrix

| Code | Status | Meaning | Resolution |
|---|---|---|---|
| \`200\` | OK | Request succeeded | Process returned JSON |
| \`400\` | Bad Request | Invalid JSON payload or parameters | Verify request parameters |
| \`401\` | Unauthorized | Missing or invalid Bearer token | Check your API key in workspace settings |
| \`403\` | Forbidden | Permission gate restriction | Check user role in Team Settings |
| \`409\` | Conflict | Duplicate resource or payment replay | Check lead status or payment ID |
| \`429\` | Too Many Requests | Exceeded 30 requests / minute rate limit | Retry request after backoff delay |
| \`500\` | Internal Error | Server exception | Contact support or retry |

---

### Rate Limit Policy
API requests are limited to **30 requests per minute** per workspace key. Exceeding this limit returns HTTP 429.
        `
      }
    ]
  }
];
