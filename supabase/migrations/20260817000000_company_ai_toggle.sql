-- Give the AI kill switch something to switch.
--
-- The AI Insights Hub renders a large toggle labelled "Master AI Kill Switch —
-- Instantly disable all AI processing across the platform". Its handler called
-- `updateFeatureFlags`, which was declared in the same component as
--
--     const updateFeatureFlags = (f: any) => {};
--
-- an empty function. It read from profile.featureFlags, a column no migration
-- creates, so the switch also always rendered as off. An administrator could
-- flip it, watch it animate, and change nothing at all.
--
-- The server does have a kill switch, but it is process.env.AI_ENABLED — a
-- platform-wide variable only an operator with deploy access can change, and
-- not what a customer pressing this button expects. This adds the per-company
-- one the UI has always implied.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.companies.ai_enabled IS
  'Per-company AI kill switch, set from the AI Insights Hub. Enforced in src/routes/ai.ts before any Gemini call. The platform-wide switch is process.env.AI_ENABLED.';

-- Only an admin may flip it.
--
-- The tenant UPDATE policy on companies is scoped by company, not by role, so
-- without this any telecaller could disable AI for their whole company from
-- devtools. protect_billing_columns already guards the plan columns the same
-- way; this is the same shape for the same reason.
CREATE OR REPLACE FUNCTION public.protect_ai_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ai_enabled IS NOT DISTINCT FROM OLD.ai_enabled THEN
    RETURN NEW;
  END IF;

  -- Service-role and webhook writes carry no JWT.
  IF current_setting('request.jwt.claims', true) IS NULL
     OR COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role'
  THEN
    RETURN NEW;
  END IF;

  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'sub_admin', 'founder') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Only an administrator can turn AI on or off for the company.',
      DETAIL  = '{"code":"FORBIDDEN","metric":"ai_enabled"}';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_ai_toggle ON public.companies;
CREATE TRIGGER trg_protect_ai_toggle
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_ai_toggle();
