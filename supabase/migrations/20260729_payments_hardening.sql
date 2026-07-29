-- Payment verification hardening.
--
-- routes/payments.ts has always written razorpay_order_id / razorpay_payment_id /
-- razorpay_signature back to billing_intents, but the columns were never declared
-- in a migration (they were added by hand in the dashboard). Declare them so the
-- schema is reproducible from the repo.
--
-- The unique index on razorpay_payment_id is the durable half of the replay guard:
-- a Razorpay signature never expires, so without it the same signed payment could
-- be POSTed to /api/payments/verify repeatedly, each time extending the
-- subscription by another durationMonths.

ALTER TABLE public.billing_intents
    ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS billing_intents_razorpay_payment_id_key
    ON public.billing_intents (razorpay_payment_id)
    WHERE razorpay_payment_id IS NOT NULL;

-- Supports the replay lookup in /verify.
CREATE INDEX IF NOT EXISTS billing_intents_company_status_idx
    ON public.billing_intents (company_id, status);
