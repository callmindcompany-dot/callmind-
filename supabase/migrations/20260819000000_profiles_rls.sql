-- Close the last table in this database with row-level security switched off.
--
-- public.profiles holds six rows of name, phone and email. RLS was disabled on
-- it, which in a product whose browser holds an authenticated supabase-js
-- client means any signed-in user of any tenant could read all six from
-- devtools. Every other table in the schema has RLS on.
--
-- Four policies were already defined on it. They had no effect at all, because
-- policies are inert until RLS is enabled -- so the table looked protected to
-- anyone reading the SQL and was open in the database. That is the exact
-- failure mode AGENTS.md describes: verify against the database, not the file
-- that claims to configure it.
--
-- Two of those four were also wrong on their own terms:
--
--   "Allow admins to view all profiles in their organization"
--   "Allow admins to approve profiles in their organization"
--       USING (organization_id = (SELECT organization_id FROM profiles
--                                  WHERE id = auth.uid()))
--
--   Neither checks a role. "Admin" is in the name and nowhere in the
--   predicate, so every user would have been an admin over their whole
--   organization -- including the UPDATE one. They are dropped rather than
--   repaired, because this table has no working tenancy to repair them
--   against: organization_id is NULL on all six rows and public.organizations
--   is empty.
--
--   "Allow users to update their own profile"
--       USING (auth.uid() = id)   -- and no WITH CHECK
--
--   USING decides which rows you may update; WITH CHECK decides what they may
--   become. Without it a user could update their own row and set role or
--   organization_id to anything, which is the tenancy escape AGENTS.md warns
--   about in its own words: tenancy must never come from something the user
--   can write.
--
-- What is left is a single own-row SELECT. Nothing in this repository reads or
-- writes public.profiles -- not the web app, not the Expo app, not one edge
-- function; the application's user table is public.users, keyed on company_id.
-- So no write policy is granted: the only writer is the service role, which
-- bypasses RLS, and that is all account deletion needs
-- (20260818000000_account_deletion.sql deletes from here).
--
-- NOT ADDRESSED HERE, and it needs a decision: if this table really is dead,
-- the DPDP Act's storage-limitation principle says personal data should not be
-- kept once its purpose has gone. Closing the hole is the safe step and does
-- not require deleting anyone's record; dropping the table does, and that is
-- not reversible, so it is left to a person.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to view all profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to approve profiles in their organization" ON public.profiles;

-- A person may read their own record and nothing else.
-- Dropped first because CREATE POLICY has no IF NOT EXISTS, and a migration
-- that fails on its second run is a migration nobody can safely re-apply.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

COMMENT ON TABLE public.profiles IS
  'Legacy. Superseded by public.users, which is keyed on company_id; this table is keyed on organization_id and public.organizations is empty. No application code reads or writes it. RLS is on and only own-row SELECT is granted; writes are service-role only. Review whether the rows should still exist at all.';
