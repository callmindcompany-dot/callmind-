-- Give integration credentials somewhere to live, and somewhere safe.
--
-- Saving any integration is impossible today, for two stacked reasons. Probed
-- against the live database as a signed-in founder:
--
--   INSERT team_settings (company_id, indiamart_config)
--       -> 42703 column "indiamart_config" of relation "team_settings" does not exist
--   INSERT team_settings (company_id, assignment_mode)
--       -> 42501 new row violates row-level security policy for table "team_settings"
--
-- The first is the one the customer meets: useIntegrationSettings upserts
-- facebook_config, indiamart_config, justdial_config, tradeindia_config,
-- googleads_config, whatsapp_config, email_config, webhook_config and
-- field_aliases, and team_settings has none of those columns. It has ten, and
-- they are all lead/team preferences. The second waits behind it: the table has
-- RLS enabled and not one policy, so every browser write is refused and every
-- browser read returns nothing.
--
-- WHY A NEW TABLE RATHER THAN NINE NEW COLUMNS
--
-- The obvious fix is to add the columns to team_settings and give it tenant
-- policies. That would leak every credential to every employee.
--
-- team_settings is read by SettingsPage, and SettingsPage is not admin-gated --
-- App.tsx wraps Team and Integrations in <RoleGate requireAdmin> and renders
-- Settings for anyone. A telecaller opening Settings legitimately needs
-- hide_phone_numbers, leads_statuses, default_stage, device_limit and
-- rotting_threshold from that row. If the company's IndiaMART API key and Meta
-- access token were columns on the same row, the same SELECT would hand them
-- over, and a telecaller could pull the company's whole lead book straight from
-- IndiaMART.
--
-- So the split is by sensitivity, not by subject:
--
--   team_settings              company preferences. Members read, admins write.
--   integration_credentials    secrets. Admins only, both ways.
--
-- Row per provider rather than a column per provider, so adding the ninth
-- source is an INSERT and not a migration, and so each one carries its own
-- is_active without nine booleans on one row.

CREATE TABLE IF NOT EXISTS public.integration_credentials (
  company_id  TEXT        NOT NULL,
  provider    TEXT        NOT NULL,
  -- The vendor's own shape: apiKey, mobile, listingId, pageId, token, secret.
  -- JSONB because every vendor wants different fields and none of them is
  -- queried -- this column is read whole by the poller that owns it.
  config      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, provider),
  CONSTRAINT integration_credentials_provider_check CHECK (
    provider IN (
      'facebook', 'indiamart', 'justdial', 'tradeindia',
      'googleads', 'whatsapp', 'email', 'webhook'
    )
  )
);

COMMENT ON TABLE public.integration_credentials IS
  'Per-provider integration secrets. Admin/founder only -- deliberately not on team_settings, which any employee can read through the Settings page.';

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

-- Same shape as the integration_health policies in 20260808000000, which is the
-- nearest neighbour and the same trust level.
DROP POLICY IF EXISTS "tenant_select_integration_credentials" ON public.integration_credentials;
CREATE POLICY "tenant_select_integration_credentials"
ON public.integration_credentials
FOR SELECT
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
);

DROP POLICY IF EXISTS "tenant_write_integration_credentials" ON public.integration_credentials;
CREATE POLICY "tenant_write_integration_credentials"
ON public.integration_credentials
FOR ALL
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
);

CREATE INDEX IF NOT EXISTS idx_integration_credentials_company
  ON public.integration_credentials(company_id);


-- ---------------------------------------------------------------------------
-- team_settings: the preferences half.
--
-- It has had RLS on with zero policies, which is why SettingsPage and TeamPage
-- have been reading an empty row and writing nothing. Members read; admins
-- write, because these are company-wide settings and a telecaller changing
-- leads_statuses would change them for everybody.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "tenant_select_team_settings" ON public.team_settings;
CREATE POLICY "tenant_select_team_settings"
ON public.team_settings
FOR SELECT
TO authenticated
USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "tenant_write_team_settings" ON public.team_settings;
CREATE POLICY "tenant_write_team_settings"
ON public.team_settings
FOR ALL
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.get_my_role() IN ('founder', 'admin')
);

-- Field aliases are a mapping, not a secret, and they belong with the other
-- lead preferences rather than behind the admin wall.
ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS field_aliases JSONB NOT NULL DEFAULT '{}'::jsonb;

-- assignment_rule is NOT added. team_settings already has assignment_mode, and
-- that is the column processInboundLead actually reads when it decides between
-- Manual and RoundRobin. A second column for the same idea is how this schema
-- ended up with member_limit beside seat_limit; the client is changed to use
-- assignment_mode instead.
--
-- routing_overflow_hours is NOT added either. Nothing could honour it: it would
-- need a job that reassigns leads left untouched for N hours, and pg_cron is
-- not installed on this database. It is removed from the panel in the same
-- change, rather than stored where it would look like a working setting.
