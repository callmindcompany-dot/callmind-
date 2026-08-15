-- Two columns the Team page reads and writes, which the live database does not
-- have.
--
-- Found by correcting src/types/supabase.ts against information_schema. That
-- file declared six team_settings columns the table lacks and omitted four it
-- has; once it matched reality, TypeScript immediately pointed at
-- TeamPage.tsx:1143 reading allow_qr and allow_code.
--
-- Both are declared in 20260700000000_base_tables.sql, which the live database
-- never received -- team_settings there also has custom_fields and gemini_keys,
-- and lacks assignment_mode, leads_statuses, default_stage and field_aliases,
-- so the live table came from a different lineage. Only the two the UI actually
-- depends on are added here; adding the others would be adding columns nothing
-- reads.
--
-- What this fixes: the two toggles previously read a missing column and fell
-- back to `true`, so they always displayed as on, and switching one off sent an
-- UPDATE naming a column that does not exist.
--
-- What this does NOT fix, and must not be read as fixing: nothing enforces
-- either setting. Grepping the whole repository finds them only in the type,
-- the Team page, the Settings page and that base migration -- no join path
-- consults them. After this the toggles persist, and a company that turns QR
-- joining off can still be joined by QR.

ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS allow_qr   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_code BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.team_settings.allow_qr IS
  'Shown on the Team page. Not yet enforced by the join flow.';
COMMENT ON COLUMN public.team_settings.allow_code IS
  'Shown on the Team page. Not yet enforced by the join flow.';
