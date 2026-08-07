-- Add the three users columns the application writes and the table does not
-- have.
--
-- Queried against the live database rather than inferred: public.users has
-- twelve columns, and src/types/supabase.ts declares eighteen. Nine of the
-- declared ones do not exist. TypeScript believed the declaration, approved the
-- writes, and Postgres would have rejected them at runtime -- the same way
-- adding a lead by hand used to fail.
--
-- Three of the nine are genuinely written:
--
--   display_name  useTeam.useApproveRequest inserts it, and seventeen call
--                 sites read it as the preferred label before falling back to
--                 name and then email.
--   seat_active   set true on approval and false on disable/remove. Without it
--                 the approve insert fails outright, so no join request could
--                 ever be accepted, and the disable/remove update fails, so
--                 neither could a member be taken off a seat.
--   joined_via    records whether someone arrived by join code or QR.
--
-- The other six are not created here. photo_url, last_seen, assigned_leads,
-- calls_today, managed_by_admin_id and sub_admin_quota are read but never
-- written anywhere in the codebase, so creating them would produce the same
-- permanently-empty counters as companies.active_members_count and
-- subscriptions.mrr. assigned_leads and calls_today are derived from leads and
-- calls in useTeamMembers instead; the rest are removed from the type.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS seat_active  BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS joined_via   TEXT;

-- Existing rows predate display_name, so seed it from the name already there
-- rather than leaving every current member unlabelled.
UPDATE public.users SET display_name = name
 WHERE display_name IS NULL AND name IS NOT NULL;

-- Seat counting reads this alongside status.
CREATE INDEX IF NOT EXISTS idx_users_company_seat
  ON public.users (company_id, seat_active, status);
