-- The post-call form, as data a company owns rather than chips in the app.
--
-- Every option on that form is written into mobile source today: five
-- outcomes, three interest levels, four follow-up presets. An admin cannot
-- rename one, cannot add one, cannot use their own language, and cannot say
-- which of their own stages an interested lead should move to.
--
-- One row per option rather than a JSONB blob per company, for one reason: the
-- rule below has to be enforced by Postgres, and a row-level trigger can do it
-- while diffing an array cannot.
--
--
-- THE RULE
--
-- `value` is what gets stored in calls.outcome and calls.interest. `label` is
-- what the telecaller sees. They are separate columns and value can never be
-- edited after insert.
--
-- This is not tidiness. Three SQL objects match calls.outcome literally --
-- agent_performance, call_outcome_summary and get_comparison_metrics all look
-- for the exact string 'Connected'. If renaming a chip to "बोलणं झालं" changed
-- what is stored, connect rate would fall to zero across every report and
-- nothing anywhere would raise an error. The charts would simply say nobody
-- connected to anyone.
--
-- With the split, an admin can rename every chip into any language and not one
-- number moves.
--
--
-- DELETING
--
-- Refused, by trigger. Deactivating hides an option from the phone and keeps
-- every historical row that used it readable. Deleting would orphan them: last
-- month's chart would quietly change shape, and the value would still be
-- sitting in calls.outcome with nothing to explain it.


CREATE TABLE IF NOT EXISTS public.post_call_form_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- 'outcome'  — did the phone get picked up
  -- 'interest' — what they said, only asked when it did
  -- 'followup' — a one-tap callback offset
  kind        TEXT NOT NULL CHECK (kind IN ('outcome', 'interest', 'followup')),

  -- Written to the database. Immutable; see the trigger below.
  value       TEXT NOT NULL CHECK (btrim(value) <> ''),
  -- Shown on the phone. Any language, changeable at any time.
  label       TEXT NOT NULL CHECK (btrim(label) <> ''),

  -- Hex, validated, because an unparseable colour silently renders as black on
  -- black in one of the two themes.
  color       TEXT CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$'),

  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,

  -- Which of the company's own stages this interest moves the lead to.
  --
  -- Deliberately not a foreign key and not constrained against
  -- team_settings.leads_statuses. A company must stay free to rename a stage,
  -- and a constraint here would block that rename or cascade a rewrite of
  -- history. leadStageMapping.decideStage already ignores a mapping whose
  -- stage no longer exists and falls back to matching, so a stale value is
  -- handled rather than fatal.
  maps_to_stage TEXT,

  -- Minutes from now, for kind = 'followup'. 120 is "in 2 hours".
  offset_minutes INTEGER CHECK (offset_minutes IS NULL OR offset_minutes > 0),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Two chips storing the same value would make the chart ambiguous: one slice
  -- with two labels and no way to say which the caller meant.
  UNIQUE (company_id, kind, value),

  -- Each kind uses exactly the columns that mean something for it. Without
  -- this an outcome could carry a stage mapping that nothing would ever read,
  -- and a follow-up preset with no offset would render as a button that does
  -- nothing.
  CONSTRAINT followup_needs_offset CHECK (
    (kind = 'followup' AND offset_minutes IS NOT NULL) OR
    (kind <> 'followup' AND offset_minutes IS NULL)
  ),
  CONSTRAINT only_interest_maps_a_stage CHECK (
    kind = 'interest' OR maps_to_stage IS NULL
  )
);

CREATE INDEX IF NOT EXISTS post_call_form_options_company_kind_idx
  ON public.post_call_form_options (company_id, kind, sort_order);


-- ---------------------------------------------------------------------------
-- value is write-once.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_call_option_value_is_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.value IS DISTINCT FROM OLD.value THEN
    RAISE EXCEPTION
      'The stored value of a post-call option cannot be changed. Rename the label instead.'
      USING ERRCODE = 'P0001',
            DETAIL  = json_build_object(
              'code', 'IMMUTABLE_VALUE',
              'kind', OLD.kind,
              'was',  OLD.value,
              'tried', NEW.value
            )::text;
  END IF;

  IF NEW.kind IS DISTINCT FROM OLD.kind THEN
    -- Same reasoning: the kind decides which column the value is written to,
    -- so moving an option between kinds silently re-points existing history.
    RAISE EXCEPTION 'The kind of a post-call option cannot be changed.'
      USING ERRCODE = 'P0001',
            DETAIL  = '{"code":"IMMUTABLE_KIND"}';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_call_option_immutable ON public.post_call_form_options;
CREATE TRIGGER post_call_option_immutable
  BEFORE UPDATE ON public.post_call_form_options
  FOR EACH ROW EXECUTE FUNCTION public.post_call_option_value_is_immutable();


-- ---------------------------------------------------------------------------
-- Deleting is refused; deactivate instead.
--
-- Service-role is allowed through, so a company being deleted still cascades
-- and support can repair a mistake. A tenant cannot.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_call_option_no_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER, deliberately. This function only raises, so it needs no
-- elevated rights -- and as DEFINER it was useless: current_user inside a
-- SECURITY DEFINER function is the owner, so the escape hatch below matched
-- itself and let every caller delete. The proof caught it only after a
-- permissive DELETE policy was added to reach the trigger at all.
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- current_user only, deliberately not session_user. PostgREST connects as
  -- `authenticator` and does SET ROLE, so session_user says nothing useful
  -- about who is asking; and a superuser who has done SET ROLE authenticated
  -- is acting as a tenant on purpose and should meet the same wall.
  --
  -- Account deletion cascades from companies, and that path runs as
  -- service_role, which is why it is listed.
  IF current_setting('role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION
    'Post-call options cannot be deleted, because reports built on past calls still use them. Turn it off instead.'
    USING ERRCODE = 'P0001',
          DETAIL  = '{"code":"DEACTIVATE_INSTEAD"}';
END;
$$;

DROP TRIGGER IF EXISTS post_call_option_no_delete ON public.post_call_form_options;
CREATE TRIGGER post_call_option_no_delete
  BEFORE DELETE ON public.post_call_form_options
  FOR EACH ROW EXECUTE FUNCTION public.post_call_option_no_delete();


-- ---------------------------------------------------------------------------
-- Tenancy. Members read; admins write.
--
-- get_my_company_id() and get_my_role() read public.users in this database --
-- checked, not assumed; the comment in 20260718_secure_rls.sql describing them
-- as reading the JWT is wrong.
-- ---------------------------------------------------------------------------
ALTER TABLE public.post_call_form_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_post_call_form_options ON public.post_call_form_options;
CREATE POLICY tenant_select_post_call_form_options
  ON public.post_call_form_options FOR SELECT
  TO authenticated
  USING (company_id = public.get_my_company_id());

DROP POLICY IF EXISTS tenant_insert_post_call_form_options ON public.post_call_form_options;
CREATE POLICY tenant_insert_post_call_form_options
  ON public.post_call_form_options FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('founder', 'admin', 'Admin', 'Founder')
  );

DROP POLICY IF EXISTS tenant_update_post_call_form_options ON public.post_call_form_options;
CREATE POLICY tenant_update_post_call_form_options
  ON public.post_call_form_options FOR UPDATE
  TO authenticated
  USING (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('founder', 'admin', 'Admin', 'Founder')
  )
  -- WITH CHECK as well as USING: without it an admin could move a row into
  -- another company by updating company_id, and USING alone only guards which
  -- rows may be selected for update, not what they may become.
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND public.get_my_role() IN ('founder', 'admin', 'Admin', 'Founder')
  );

GRANT SELECT, INSERT, UPDATE ON public.post_call_form_options TO authenticated;


-- ---------------------------------------------------------------------------
-- Give a company the current form, so nothing changes until they change it.
--
-- The values are exactly the strings the mobile app writes today. That is the
-- point: an existing company gets a config that reproduces its present
-- behaviour, every past call still matches, and no report moves.
--
-- Colours come from the palette validated for deuteranopia and protanopia in
-- both themes (src/lib/callOutcomes.ts).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_post_call_form_defaults(p_company_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
  -- GET DIAGNOSTICS assigns, it does not evaluate an expression, so the two
  -- inserts are counted separately and added afterwards.
  v_batch    INTEGER := 0;
BEGIN
  INSERT INTO public.post_call_form_options
    (company_id, kind, value, label, color, sort_order, offset_minutes)
  VALUES
    (p_company_id, 'outcome', 'Connected',      'Connected',      '#0d9488', 1, NULL),
    (p_company_id, 'outcome', 'No Answer',      'No Answer',      '#b45309', 2, NULL),
    (p_company_id, 'outcome', 'Busy',           'Busy',           '#9333ea', 3, NULL),
    (p_company_id, 'outcome', 'Invalid Number', 'Invalid Number', '#e11d48', 4, NULL),
    (p_company_id, 'outcome', 'Wrong Number',   'Wrong Number',   '#2563eb', 5, NULL),

    (p_company_id, 'followup', 'in_2_hours',   'In 2 hours',   NULL, 1, 120),
    (p_company_id, 'followup', 'tomorrow_10',  'Tomorrow 10am',NULL, 2, 1440),
    (p_company_id, 'followup', 'in_3_days',    'In 3 days',    NULL, 3, 4320),
    (p_company_id, 'followup', 'next_week',    'Next week',    NULL, 4, 10080)
  ON CONFLICT (company_id, kind, value) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- Interests carry a stage mapping, so they are inserted separately and the
  -- mapping is left NULL. It is not guessed here: decideStage already matches
  -- against the company's own stage names when no mapping is set, and writing
  -- a guess into the table would turn it into something an admin has to notice
  -- and undo rather than something they choose.
  INSERT INTO public.post_call_form_options
    (company_id, kind, value, label, color, sort_order)
  VALUES
    (p_company_id, 'interest', 'Interested',      'Interested',      '#0d9488', 1),
    (p_company_id, 'interest', 'Call Back Later', 'Call Back Later', '#b45309', 2),
    (p_company_id, 'interest', 'Not Interested',  'Not Interested',  '#e11d48', 3)
  ON CONFLICT (company_id, kind, value) DO NOTHING;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  RETURN v_inserted + v_batch;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_post_call_form_defaults(TEXT) TO authenticated;


-- Every company that exists today gets the defaults, so the settings screen has
-- something to show the first time it is opened.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.ensure_post_call_form_defaults(r.id);
  END LOOP;
END $$;
