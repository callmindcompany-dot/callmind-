-- An agent may write their own presence, and only their own.
--
-- agent_status carried two policies from 20260731999998_rls_policies.sql: a
-- SELECT scoped to the company, and
--
--   CREATE POLICY "agent_status_all_own_company"
--     ON agent_status FOR ALL
--     USING (company_id = auth_company_id());
--
-- FOR ALL with a company-wide predicate means any member of a company could
-- update any other member's row. A telecaller could mark a colleague offline,
-- or mark themselves on a call for the rest of the afternoon and then set
-- everyone else the same way. The admin's live monitor reads this table, so the
-- table is the thing being reported on -- it should not be writable by the
-- people it reports on, beyond their own line.
--
-- SELECT stays company-wide, because that monitor is the point of the table.
-- Writes narrow to the caller's own row. `id` holds the user id: useAgentMonitor
-- matches it against calls.created_by, which is the user id, so this is the
-- existing meaning of the column rather than a new one.

DROP POLICY IF EXISTS "agent_status_all_own_company" ON public.agent_status;

DROP POLICY IF EXISTS "agent_status_insert_own_row" ON public.agent_status;
CREATE POLICY "agent_status_insert_own_row"
  ON public.agent_status FOR INSERT
  WITH CHECK (id = auth.uid()::text AND company_id = public.auth_company_id());

DROP POLICY IF EXISTS "agent_status_update_own_row" ON public.agent_status;
CREATE POLICY "agent_status_update_own_row"
  ON public.agent_status FOR UPDATE
  USING (id = auth.uid()::text AND company_id = public.auth_company_id())
  WITH CHECK (id = auth.uid()::text AND company_id = public.auth_company_id());

-- No DELETE policy. Presence history is not the agent's to erase, and
-- delete_my_account() removes the row as a definer function when the account
-- itself goes. Fail closed: an absent rule means nobody, not everybody.
