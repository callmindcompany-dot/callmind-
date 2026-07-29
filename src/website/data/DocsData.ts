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
  content: string; // Markdown formatted text
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
    description: 'Quickstart guides for Business Admins and Telecallers to set up CallMind in 5 minutes.',
    iconName: 'Rocket',
    articles: [
      {
        id: 'admin-quickstart',
        slug: 'admin-quickstart',
        title: '5-Minute Admin Onboarding',
        category: 'getting-started',
        summary: 'Learn how to set up your business workspace, invite telecallers, and configure lead sources.',
        readTime: '3 min read',
        lastUpdated: '2026-07-29',
        tags: ['Admin', 'Onboarding', 'Workspace', 'Setup'],
        content: `
### Step 1: Create Your Workspace
After registering at [callmind.app/login](https://callmind.app/login), you will be prompted to create or join a **Company Workspace**. 
Your workspace automatically configures **Row-Level Security (RLS)** in PostgreSQL to ensure 100% data isolation from other accounts.

### Step 2: Invite Your Telecalling Team
1. Navigate to **Team Management** in your left navigation bar.
2. Click **+ Invite Team Member** or generate a 6-digit **Workspace Join Code**.
3. Telecallers can download the **CallMind Mobile App** from the Play Store and enter your Join Code to connect automatically.

### Step 3: Connect Lead Sources
Go to **Integrations** to activate auto-sync for **IndiaMART**, **TradeIndia**, or **Justdial**. Leads will begin streaming into your workspace in real-time.
        `
      },
      {
        id: 'telecaller-mobile-setup',
        slug: 'telecaller-mobile-setup',
        title: 'Telecaller Mobile App Guide',
        category: 'getting-started',
        summary: 'Step-by-step instructions for telecallers to download, grant permissions, and start dialing.',
        readTime: '4 min read',
        lastUpdated: '2026-07-29',
        tags: ['Mobile App', 'Android', 'Telecaller', 'Call Log'],
        content: `
### Downloading the Android App
The CallMind Telecaller App is built for low-end to high-end Android devices (Android 8.0+).

### Required Permissions
To automatically log client call durations and sync records with the CRM dashboard, grant the following permissions:
1. **Call Logs Permission**: Allows CallMind to capture start time, end time, and duration of outbound sales calls.
2. **Phone State Permission**: Detects active call status (On-Call, Idle, Ringing).
3. **Background Location (Optional)**: Required if your organization enables GPS attendance tracking.

### Battery Saver Bypass
To prevent Android from killing the background call sync service:
- Open **Settings ➔ Apps ➔ CallMind ➔ Battery**.
- Change setting from **Optimized** to **Unrestricted**.
        `
      }
    ]
  },
  {
    id: 'guides',
    title: '📱 Feature Guides',
    description: 'Deep dive into Round-Robin lead routing, attendance tracking, and AI Gemini call summaries.',
    iconName: 'Smartphone',
    articles: [
      {
        id: 'round-robin-routing',
        slug: 'round-robin-routing',
        title: 'Round-Robin Lead Assignment Rules',
        category: 'guides',
        summary: 'Automate fair distribution of incoming leads among active telecallers.',
        readTime: '4 min read',
        lastUpdated: '2026-07-29',
        tags: ['Leads', 'Automation', 'Round Robin', 'Routing'],
        content: `
### How Round-Robin Assignment Works
CallMind assigns incoming web leads (IndiaMART, TradeIndia, Meta Ads) to telecallers in a sequential cycle:

1. **Active Telecaller Check**: The system filters only telecallers whose status is set to **Active** and checked in via **Attendance Punch-In**.
2. **Sequential Distribution**: If Telecaller A received Lead #101, Lead #102 is assigned to Telecaller B, and Lead #103 to Telecaller C.
3. **Fallback Queue**: If no telecaller is checked in, the lead enters the **Unassigned Pool** and triggers an Admin alert.

### Configuring Round-Robin
Navigate to **Settings ➔ Lead Routing Rules** to toggle between **Equal Round-Robin**, **Performance-Based Ratio**, or **Manual Claim**.
        `
      },
      {
        id: 'ai-call-summaries',
        slug: 'ai-call-summaries',
        title: 'AI Gemini Call Intelligence',
        category: 'guides',
        summary: 'Automatic call transcript summarization and customer sentiment extraction powered by Google Gemini AI.',
        readTime: '5 min read',
        lastUpdated: '2026-07-29',
        tags: ['AI', 'Gemini', 'Summaries', 'Analytics'],
        content: `
### AI Analysis Pipeline
CallMind leverages Google Gemini AI (\`gemini-flash-latest\`) to analyze call logs and notes:

- **Key Highlights**: Extract main customer requirements in 2 bullets.
- **Sentiment Score**: Categorize customer intent as **Hot**, **Warm**, or **Cold**.
- **Next Follow-up Action**: Auto-suggest follow-up dates and reminders.

### Privacy & Token Safety
All prompt payloads sent to Gemini are sanitized to remove confidential payment information. Tokens are cached per workspace to minimize billing consumption.
        `
      }
    ]
  },
  {
    id: 'integrations',
    title: '🔌 B2B Lead Integrations',
    description: 'Setup guides for IndiaMART, TradeIndia, Justdial, WhatsApp Business, and Google Ads Forms.',
    iconName: 'Zap',
    articles: [
      {
        id: 'indiamart-integration',
        slug: 'indiamart-integration',
        title: 'IndiaMART Lead Sync Guide',
        category: 'integrations',
        summary: 'Connect your IndiaMART CRM API key to auto-fetch buy leads every 5 minutes.',
        readTime: '3 min read',
        lastUpdated: '2026-07-29',
        tags: ['IndiaMART', 'B2B', 'Integration', 'API Key'],
        content: `
### Prerequisites
- Active IndiaMART Seller Account.
- IndiaMART CRM Key (Generate from *IndiaMART Seller Panel ➔ Settings ➔ CRM API*).

### Configuration Steps
1. In CallMind, go to **Integrations ➔ IndiaMART**.
2. Paste your **IndiaMART CRM Key**.
3. Set your desired sync interval (Default: 5 minutes).
4. Click **Save & Test Connection**.

### Deduplication
CallMind automatically deduplicates leads based on phone number. If a customer inquires twice within 24 hours, the lead details are appended without creating duplicate CRM rows.
        `
      },
      {
        id: 'tradeindia-integration',
        slug: 'tradeindia-integration',
        title: 'TradeIndia Lead Sync Guide',
        category: 'integrations',
        summary: 'Sync TradeIndia buy inquiries directly into your sales pipeline.',
        readTime: '3 min read',
        lastUpdated: '2026-07-29',
        tags: ['TradeIndia', 'B2B', 'Integration'],
        content: `
### Configuration Steps
1. Navigate to **Integrations ➔ TradeIndia**.
2. Enter your **User ID**, **Profile ID**, and **TradeIndia Key**.
3. Enable **Auto Round-Robin** to assign leads instantly to online agents.
4. Click **Activate Integration**.
        `
      }
    ]
  },
  {
    id: 'api-reference',
    title: '💻 REST API Reference',
    description: 'Complete API endpoints for managing leads, logging calls, tracking attendance, and handling webhooks.',
    iconName: 'Code',
    articles: [
      {
        id: 'api-create-lead',
        slug: 'api-create-lead',
        title: 'Create Lead (POST /api/leads)',
        category: 'api-reference',
        summary: 'Endpoint to programmatically inject a new lead into CallMind CRM.',
        readTime: '4 min read',
        lastUpdated: '2026-07-29',
        tags: ['API', 'Leads', 'POST', 'Developer'],
        content: `
### Endpoint Specification
Use this endpoint to push leads from external websites, landing page forms, or custom CRMs into CallMind.

### Authorization
Include your Workspace API Key in the HTTP Request Header:
\`\`\`http
Authorization: Bearer cm_live_98a7b6c5d4e3f2a1
Content-Type: application/json
\`\`\`
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
            source: "Website Form",
            custom_data: {
              budget: "₹50,000",
              requirement: "Bulk Telecalling Software"
            }
          }, null, 2),
          responseBody: JSON.stringify({
            success: true,
            lead_id: "lead_89f7a2b1c4e",
            assigned_to: "usr_telecaller_04",
            status: "New",
            created_at: "2026-07-30T00:30:00Z"
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
    "source": "Website Form"
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
    source: 'Website Form'
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
    "source": "Website Form"
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
        summary: 'Fetch paginated leads list with optional status and telecaller filters.',
        readTime: '3 min read',
        lastUpdated: '2026-07-29',
        tags: ['API', 'Leads', 'GET'],
        content: `
### Query Parameters
- \`status\`: Filter by lead status (\`New\`, \`Contacted\`, \`Interested\`, \`Closed\`).
- \`limit\`: Number of records to return (Default: 50, Max: 250).
- \`offset\`: Pagination offset index.
        `,
        apiSpec: {
          method: 'GET',
          path: '/api/leads?status=New&limit=10',
          description: 'Returns a list of leads for the authenticated workspace.',
          headers: {
            'Authorization': 'Bearer <YOUR_WORKSPACE_API_KEY>'
          },
          responseBody: JSON.stringify({
            total: 142,
            page: 1,
            limit: 10,
            data: [
              {
                id: "lead_99a8b7",
                name: "Anil Sharma",
                phone: "+919811223344",
                status: "New",
                source: "IndiaMART",
                assigned_to_name: "Priya V"
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
      }
    ]
  },
  {
    id: 'security',
    title: '🛡️ Security & DPDP Compliance',
    description: 'Multi-tenant PostgreSQL Row-Level Security, data encryption, and DPDP compliance right-to-be-forgotten APIs.',
    iconName: 'Shield',
    articles: [
      {
        id: 'multi-tenant-rls',
        slug: 'multi-tenant-rls',
        title: 'PostgreSQL Row-Level Security (RLS)',
        category: 'security',
        summary: 'How CallMind enforces cryptographic data separation across organization workspaces.',
        readTime: '4 min read',
        lastUpdated: '2026-07-29',
        tags: ['Security', 'PostgreSQL', 'RLS', 'Multi-tenant'],
        content: `
### Data Isolation Guarantee
Every table in CallMind containing client data (\`leads\`, \`calls\`, \`attendance_logs\`, \`audit_logs\`) contains a mandatory \`company_id\` foreign key.

### RLS Function Definition
Database security is managed at the PostgreSQL kernel level using \`SECURITY DEFINER\` functions:

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
        title: 'India DPDP & GDPR Purge Protocol',
        category: 'security',
        summary: 'Automated data deletion endpoints compliant with India’s Digital Personal Data Protection Act.',
        readTime: '3 min read',
        lastUpdated: '2026-07-29',
        tags: ['Compliance', 'DPDP', 'GDPR', 'Data Deletion'],
        content: `
### Purging User & Customer Data
CallMind includes an automated Deno Edge Function (\`purge-user-data\`) to perform complete cascade deletions when requested by a customer under DPDP compliance rules:

1. Deletes customer lead profile and custom JSON payload.
2. Anonymizes past call duration records while preserving aggregate company stats.
3. Emits an immutable audit log entry documenting data erasure.
        `
      }
    ]
  },
  {
    id: 'troubleshooting',
    title: '❓ Troubleshooting & Errors',
    description: 'HTTP status code error matrix, API rate-limiting rules, and call sync diagnostic steps.',
    iconName: 'HelpCircle',
    articles: [
      {
        id: 'error-codes-matrix',
        slug: 'error-codes-matrix',
        title: 'HTTP Status Codes & Resolution Matrix',
        category: 'troubleshooting',
        summary: 'Comprehensive list of API error response codes and resolution steps.',
        readTime: '4 min read',
        lastUpdated: '2026-07-29',
        tags: ['Troubleshooting', 'Error Codes', 'HTTP', 'Rate Limit'],
        content: `
### Standard API Response Matrix

| Status Code | Meaning | Cause | Action |
|---|---|---|---|
| \`200 OK\` | Success | Request succeeded | Process returned JSON |
| \`401 Unauthorized\` | Invalid API Token | Missing or invalid \`Authorization\` header | Verify your API key in workspace settings |
| \`403 Forbidden\` | Permission Denied | Role gate restriction (e.g. Telecaller accessing Admin endpoint) | Upgrade user role to \`founder\` or \`admin\` |
| \`429 Rate Limit\` | Too Many Requests | Exceeded 30 requests per minute ceiling | Implement exponential backoff retry |
| \`500 Internal Error\` | System Exception | Unexpected backend issue | Check CallMind status page or retry |

### Handling 429 Rate Limits
CallMind enforces a strict rate limit of **30 requests / minute** per workspace API key. When exceeded, the API returns:
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
