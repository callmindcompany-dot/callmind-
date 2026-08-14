-- Let a WhatsApp send be recorded like any other integration run.
--
-- integration_runs.provider was constrained to the eight lead sources, because
-- when it was written WhatsApp did not send anything. send-whatsapp-message now
-- dispatches through the customer's BSP, and it opens a run so a failed send is
-- inspectable rather than living only in a function log.
--
-- Without this the CHECK rejects the insert, runLog swallows the error by
-- design -- bookkeeping must never break the work -- and the run silently does
-- not exist. Which is the shape of fault this whole sequence of migrations has
-- been removing.

ALTER TABLE public.integration_runs
  DROP CONSTRAINT IF EXISTS integration_runs_provider_check;

ALTER TABLE public.integration_runs
  ADD CONSTRAINT integration_runs_provider_check CHECK (
    provider IN (
      'facebook', 'indiamart', 'justdial', 'tradeindia',
      'googleads', 'webhook', 'website', 'csv',
      'whatsapp'
    )
  );
