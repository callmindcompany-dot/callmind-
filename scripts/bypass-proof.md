# Bypass proof

The acceptance test for "hard enforcement". Every plan limit in this product was
once enforced only in React, so any of them could be stepped around from the
devtools console. This proves that is no longer true — and, since the same
console is the fastest way to test tenant isolation, that a customer cannot read
another customer's rows either.

Run it in the browser, signed in as a real user, using the app's own
authenticated client. That matters: `supabase-js` in the page carries the user's
JWT, which is exactly what an attacker would have. Running these as service role
proves nothing, because service role bypasses RLS by design.

## Setup

Open the app, sign in, open devtools, and confirm the client is reachable:

```js
const sb = window.supabase;
const { data: { session } } = await sb.auth.getSession();
const me = session.user;
const myCompany = me.app_metadata.company_id;
console.log({ email: me.email, myCompany, role: me.app_metadata.role });
```

`company_id` must come from `app_metadata`. If it is only in `user_metadata`,
stop — that is client-writable and the tenancy model is broken before any of
these tests matter.

## A. Plan limits cannot be stepped around

Use a tenant sitting at its seat limit. `usePlan()` in the UI will already be
blocking; the point is that the database blocks too.

```js
// A1 — seats
await sb.from('users').insert({
  id: crypto.randomUUID(),
  company_id: myCompany,
  email: `bypass-${Date.now()}@example.test`,
  role: 'Telecaller',
  status: 'active'
});
```

Expect `error.code === 'P0001'` and a message naming the limit. `error.details`
should parse as `{"code":"PLAN_LIMIT","metric":"seats",...}` — that is what
`src/lib/planErrors.ts` reads to open the right upgrade modal.

```js
// A2 — leads, one row
await sb.from('leads').insert({
  id: crypto.randomUUID(),
  company_id: myCompany,
  name: 'bypass single',
  phone: '0000000000'
});

// A3 — leads, a bulk insert that straddles the limit.
// This is the one that matters: a per-row trigger would let part of the batch
// through. The statement-level trigger must reject the whole array.
const batch = Array.from({ length: 500 }, (_, i) => ({
  id: crypto.randomUUID(),
  company_id: myCompany,
  name: `bypass bulk ${i}`,
  phone: '0000000000'
}));
await sb.from('leads').insert(batch);

// Then confirm nothing landed:
const { count } = await sb.from('leads')
  .select('*', { count: 'exact', head: true })
  .like('name', 'bypass bulk%');
console.log('rows that got through (must be 0):', count);
```

```js
// A4 — automation rules
await sb.from('automation_rules').insert({
  company_id: myCompany, name: 'bypass', trigger_type: 'lead_created'
});
```

## B. The plan itself cannot be edited

If a customer can write `companies.plan`, every trigger above is decoration.

```js
await sb.from('companies').update({ plan: 'pro' }).eq('id', myCompany);
await sb.from('companies').update({ seat_limit: 999 }).eq('id', myCompany);
await sb.from('companies').update({ plan_status: 'active', plan_expires_at: '2030-01-01' }).eq('id', myCompany);
```

All three must fail, or update 0 rows. A silent success returning `count: 0` is
not good enough to assume — re-read the row:

```js
const { data } = await sb.from('companies')
  .select('plan, seat_limit, plan_status').eq('id', myCompany).single();
console.log(data);
```

```js
// plan_limits is the price and limit table itself.
await sb.from('plan_limits').update({ max_seats: 9999 }).eq('id', 'starter');
await sb.from('plan_limits').insert({ id: 'free_for_me', name: 'x', monthly_price: 0, annual_price: 0 });
```

Both must fail. `plan_limits` is written by migrations only.

## C. Tenant isolation

The whole point of the RLS work. Every one of these must return **zero rows** —
not an error necessarily, zero rows, because RLS filters rather than throws.

```js
const tables = [
  'leads', 'calls', 'callbacks', 'users', 'invoices', 'subscriptions',
  'support_tickets', 'support_chat_history', 'company_settings',
  'announcements', 'announcement_reads', 'automation_logs', 'import_logs',
  'message_templates', 'join_requests', 'invites', 'agent_status',
  'cleanup_logs', 'cleanup_settings', 'cofounders', 'notifications',
  'documents', 'audit_logs', 'trial_events', 'webhook_logs'
];

for (const t of tables) {
  const { data, error, count } = await sb
    .from(t)
    .select('company_id', { count: 'exact' })
    .neq('company_id', myCompany)
    .limit(3);
  console.log(
    (count ?? 0) === 0 ? 'PASS' : 'LEAK',
    t.padEnd(24),
    error ? error.message : `${count ?? 0} foreign rows`,
    data?.length ? data : ''
  );
}
```

Any `LEAK` line is a cross-tenant read. Note the table and stop — that is a live
data exposure, not a test failure to work around.

```js
// C2 — the two views that read across tables
for (const v of ['organization_tenants_view', 'company_stats_view', 'platform_stats_view',
                 'agent_performance', 'conversion_funnel', 'lead_source_yield']) {
  const { data, error } = await sb.from(v).select('*').limit(50);
  console.log(v.padEnd(28), error ? error.message : `${data.length} rows`);
}
```

For a normal customer, `organization_tenants_view` must return exactly one row —
their own company. More than one means `security_invoker` is not set and the
view is reading straight through RLS.

## D. Writing into someone else's tenant

Reading is one half. A customer must not be able to plant rows in another
company either. Use any company id that is not yours.

```js
const otherCompany = 'PUT_ANOTHER_COMPANY_ID_HERE';

await sb.from('leads').insert({
  id: crypto.randomUUID(), company_id: otherCompany, name: 'cross tenant', phone: '0000000000'
});
await sb.from('announcements').insert({
  company_id: otherCompany, title: 'cross tenant', content: 'x',
  category: 'Update', target_role: 'all'
});
await sb.from('audit_logs').insert({
  company_id: otherCompany, action: 'FORGED', details: 'x'
});
```

All must fail on the `WITH CHECK`.

```js
// D2 — and not delete or edit theirs
await sb.from('leads').delete().eq('company_id', otherCompany);
await sb.from('announcements').update({ title: 'defaced' }).eq('company_id', otherCompany);
```

Both must affect 0 rows.

## E. Platform content

These have no `company_id` and are readable by everyone on purpose. Reading is
fine; writing is not.

```js
await sb.from('legal_pages').update({ content: 'defaced' }).eq('slug', 'terms');
await sb.from('legal_pages_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
await sb.from('feature_flags').update({ enabled: false }).neq('id', '');
await sb.from('video_tutorials').delete().neq('id', '');
await sb.from('plan_limits').update({ monthly_price: 1 }).eq('id', 'pro');
```

All five must fail. `feature_flags` is the one to watch — whatever it gates, a
customer flipping it changes the product for every other customer.

## F. Platform-owner surfaces

`role === 'founder'` is a tenant role. Every customer gets it at signup, so it
must not open anything platform-wide. Run these as an ordinary customer whose
role is `founder`:

```js
await sb.functions.invoke('impersonate-company', { body: { companyId: otherCompany } });
```

Must be rejected. The check is the `INTERNAL_TEAM_EMAILS` allow-list, not the
role.

## Recording the result

Save the console output to `reports/bypass-proof-<date>.md`, including the
failures verbatim — an error code and message is the evidence. A run where
everything "seemed blocked" without captured output proves nothing.

If any check passes when it should fail, that is a finding to fix before this
document is filed, not a note to add to it.
