import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../lib/logger';
import { db, auth, supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import {
  PRICING_PLANS,
  calculatePrice,
  isPurchasablePlanId,
  isAllowedTerm,
  ALLOWED_TERM_MONTHS,
  GST_RATE,
} from '../config/pricing';

const router = express.Router();

// Constant-time string comparison — a plain !== leaks signature bytes via timing.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a || '', 'utf8');
  const bufB = Buffer.from(b || '', 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Roles permitted to change a company's subscription state.
const BILLING_ROLES = ['admin', 'founder'];

// Razorpay Webhook Rate Limiter (Signature & IP scoped)
const razorpayWebhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyGenerator: (req: any) => {
    const sig = req.headers['x-razorpay-signature'] as string;
    if (sig && sig.trim()) {
      return `webhook_razorpay_sig_${sig.trim().slice(0, 16)}`;
    }
    return `webhook_razorpay_ip_${req.socket?.remoteAddress || req.ip || 'unknown'}`;
  },
  message: { error: 'Rate limit exceeded for payment webhooks.' },
  standardHeaders: true,
  legacyHeaders: false,
});

interface OrderQuote {
  planId: string;
  seats: number;
  durationMonths: number;
  /** Pre-tax total in rupees for the whole term. */
  subtotal: number;
  gst: number;
  /** What the customer is actually charged, GST included. */
  amount: number;
}

/**
 * Prices an order from src/config/pricing.ts.
 *
 * The client sends what it wants to buy; it does not get to say what that
 * costs. Every figure below comes from the same config that seeds
 * public.plan_limits, so the price charged, the price displayed and the limits
 * enforced cannot disagree.
 */
function quoteOrder(input: { planId?: unknown; seats?: unknown; durationMonths?: unknown }):
  OrderQuote | { error: string } {
  const planId = String(input.planId ?? '').toLowerCase();
  if (!isPurchasablePlanId(planId)) {
    return { error: 'Unknown plan.' };
  }

  const plan = PRICING_PLANS[planId];
  const seats = Number(input.seats ?? 1);
  const durationMonths = Number(input.durationMonths ?? 1);

  if (!Number.isInteger(seats) || seats < 1) {
    return { error: 'Seat count must be a whole number of at least 1.' };
  }
  if (seats > plan.maxSeats) {
    return { error: `The ${plan.name} plan covers up to ${plan.maxSeats} seats.` };
  }
  if (!isAllowedTerm(durationMonths)) {
    return { error: `Billing term must be one of ${ALLOWED_TERM_MONTHS.join(', ')} months.` };
  }

  // Only the 12-month term earns the annual rate. Quarterly and half-yearly
  // exist because Indian B2B buyers ask for them, not as a discount tier.
  const isAnnual = durationMonths === 12;
  const subtotal = calculatePrice(planId, seats, isAnnual).total * durationMonths;

  // GST is charged, not merely printed on the invoice afterwards. It used to
  // appear only on the generated invoice while Razorpay collected the pre-tax
  // figure, which meant the tax came out of our own margin.
  const gst = Math.round(subtotal * GST_RATE);

  return { planId, seats, durationMonths, subtotal, gst, amount: subtotal + gst };
}

/**
 * Authenticates the caller and confirms they may act on `companyId`.
 * Returns the decoded user on success, or null after having sent the response.
 * Same cross-tenant guard shape used by the routing override in routes/leads.ts.
 */
async function authorizeBillingActor(req: express.Request, res: express.Response, companyId: string) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return null;
  }

  const decodedUser = await auth.verifyIdToken(authHeader.split(' ')[1]);
  const userSnap = await db.collection('users').doc(decodedUser.uid).get();
  const profile = userSnap.exists ? userSnap.data() : null;

  if (!profile || profile.companyId !== companyId) {
    logger.warn('[Billing Security] Cross-tenant billing attempt blocked', {
      actor: decodedUser.uid,
      actorCompany: profile?.companyId,
      targetCompany: companyId,
    });
    res.status(403).json({ error: 'Forbidden: Cross-tenant access prohibited' });
    return null;
  }

  if (!BILLING_ROLES.includes(profile.role)) {
    res.status(403).json({ error: 'Forbidden: Only an admin or founder can change the subscription' });
    return null;
  }

  return decodedUser;
}

// Initialize Razorpay Client
const keyId = process.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder_key';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';

let razorpayInstance: Razorpay | null = null;
if (process.env.VITE_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.VITE_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    logger.info('[Razorpay] SDK initialized with configured API credentials.');
  } catch (err: any) {
    logger.error('[Razorpay Initialization Error]:', err.message);
  }
}

// 1. Create Razorpay Order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, companyId, planId, seats, durationMonths = 1 } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Invalid payment details' });
    }

    const decodedUser = await authorizeBillingActor(req, res, companyId);
    if (!decodedUser) return;

    // The price is derived here, from the same config the app and the database
    // use. It used to be taken from the request body, so a modified client
    // could have bought Pro for a rupee.
    const quote = quoteOrder({ planId, seats, durationMonths });
    if ('error' in quote) {
      return res.status(400).json({ error: quote.error });
    }

    // Reject a mismatch rather than silently overriding it -- if the client
    // and the server disagree about the price, the user is about to be shown
    // one number and charged another, and that should be loud.
    if (amount !== undefined && Math.round(Number(amount)) !== quote.amount) {
      logger.warn('[Billing] Client quoted a price the server does not agree with', {
        companyId, planId, seats, durationMonths, clientAmount: amount, serverAmount: quote.amount,
      });
      return res.status(400).json({
        error: 'The price shown has changed. Please refresh and try again.',
      });
    }

    const receipt = `rcpt_${companyId.slice(0, 8)}_${Date.now()}`;
    let orderId = `order_${Math.random().toString(36).substring(2, 15)}`;

    if (razorpayInstance && !isPlaceholder) {
      const orderOptions = {
        amount: quote.amount * 100, // amount in paise
        currency: 'INR',
        receipt,
        // These notes are the authoritative record of what was purchased.
        // /verify reads the plan back from here, never from the client body.
        notes: {
          companyId,
          planId: quote.planId,
          seats: String(quote.seats),
          durationMonths: String(quote.durationMonths),
          userId: decodedUser.uid,
        },
      };

      const rzpOrder = await razorpayInstance.orders.create(orderOptions);
      orderId = rzpOrder.id;
      logger.info(`[Razorpay Order Created] Order ID: ${orderId} for Company: ${companyId}`);
    } else {
      logger.info(`[Razorpay Test Mode] Generated mock Order ID: ${orderId} for Company: ${companyId}`);
    }

    res.json({
      success: true,
      orderId,
      amount: quote.amount * 100,
      currency: 'INR',
      keyId,
      companyId,
    });
  } catch (e: any) {
    logger.error('[Create Razorpay Order Error]:', e);
    res.status(500).json({ error: 'Failed to create payment order: ' + (e.message || 'Internal server error') });
  }
});

// 2. Verify Razorpay Payment Signature & Activate Plan
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Everything below is derived from the signed Razorpay order, never from the
    // request body — the body only supplies the payment identifiers.
    let companyId: string;
    let planId: string;
    let seats: number;
    let durationMonths: number;
    let amount: number;

    if (razorpayInstance && !isPlaceholder) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment identifiers. Verification failed.' });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        logger.error('[Razorpay Config Error] RAZORPAY_KEY_SECRET missing while SDK is live');
        return res.status(503).json({ error: 'Payment verification unavailable.' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (!safeEqual(expectedSignature, razorpay_signature)) {
        logger.error(`[Razorpay Security Alert] Signature mismatch for Order: ${razorpay_order_id}`);
        return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      }

      // Signature proves the pair is ours; the order tells us what was actually paid for.
      const order: any = await razorpayInstance.orders.fetch(razorpay_order_id);
      if (order.status !== 'paid') {
        logger.error(`[Razorpay Security Alert] Order ${razorpay_order_id} is '${order.status}', not paid`);
        return res.status(400).json({ error: 'Payment has not been captured for this order.' });
      }

      const notes = order.notes || {};
      companyId = notes.companyId;
      planId = notes.planId;
      seats = parseInt(notes.seats, 10);
      durationMonths = parseInt(notes.durationMonths, 10) || 1;
      amount = Number(order.amount) / 100;

      if (!companyId || !planId) {
        logger.error(`[Razorpay Data Error] Order ${razorpay_order_id} has no company/plan notes`);
        return res.status(400).json({ error: 'Order is missing subscription metadata.' });
      }
    } else {
      // Unconfigured Razorpay = local test mode. Never allow this to grant a plan in production.
      if (process.env.NODE_ENV === 'production') {
        logger.error('[Razorpay Config Error] Activation attempted with no Razorpay credentials in production');
        return res.status(503).json({ error: 'Payment provider is not configured.' });
      }

      ({ companyId, planId, seats, amount, durationMonths = 1 } = req.body);
      if (!companyId || !planId) {
        return res.status(400).json({ error: 'Missing required company or plan metadata' });
      }
      logger.warn('[Razorpay Test Mode] Activating plan without signature verification (non-production only)');
    }

    // The caller must be an admin/founder of the company the order was created for.
    const actor = await authorizeBillingActor(req, res, companyId);
    if (!actor) return;

    // Re-price the order from the config and confirm Razorpay captured that
    // amount. The notes are ours and the signature proves the order is ours,
    // but this catches a plan whose price changed between order and capture,
    // and any attempt to mint an order out of band.
    const verified = quoteOrder({ planId, seats, durationMonths });
    if ('error' in verified) {
      logger.error('[Billing] Paid order does not describe a sellable plan', {
        razorpay_order_id, planId, seats, durationMonths, reason: verified.error,
      });
      return res.status(400).json({ error: 'This order does not match any current plan.' });
    }

    if (Math.round(Number(amount)) !== verified.amount) {
      logger.error('[Billing Security Alert] Captured amount does not match the plan price', {
        razorpay_order_id, captured: amount, expected: verified.amount, planId, seats,
      });
      return res.status(400).json({ error: 'The amount paid does not match the selected plan.' });
    }

    planId = verified.planId;
    seats = verified.seats;
    durationMonths = verified.durationMonths;
    amount = verified.amount;

    // Replay guard: a signature stays valid forever, so the same payment must not
    // be redeemable twice for another `durationMonths` of subscription.
    if (razorpay_payment_id) {
      const { data: alreadyUsed } = await supabaseAdmin
        .from('billing_intents')
        .select('id')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .eq('status', 'completed')
        .maybeSingle();

      if (alreadyUsed) {
        logger.warn(`[Razorpay Replay Blocked] Payment ${razorpay_payment_id} was already redeemed`);
        return res.status(409).json({ error: 'This payment has already been applied to a subscription.' });
      }
    }

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + (durationMonths || 1));

    // Update Company subscription state in database
    const { error: companyUpdateErr } = await supabaseAdmin
      .from('companies')
      .update({
        plan: planId,
        seat_limit: seats,
        // `subscription_status` was written here but declared in no migration,
        // and every reader looks at `plan_status`. See
        // 20260802000000_plan_columns_consolidation.sql.
        plan_status: 'active',
        billing_cycle: durationMonths === 12 ? 'annual' : 'monthly',
        plan_expires_at: expirationDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (companyUpdateErr) {
      // The customer's money has already been captured at this point. Throwing
      // returned a 500 and told them the payment failed, which is both wrong
      // and the worst possible moment to be wrong. Record it for reconciliation
      // and tell them the truth instead.
      logger.error('[Billing] Payment captured but the plan could not be activated', {
        companyId, planId, razorpay_payment_id, error: companyUpdateErr,
      });

      await supabaseAdmin.from('billing_intents').insert([{
        user_id: actor.uid,
        user_email: actor.email || '',
        company_id: companyId,
        plan_id: planId,
        seats,
        duration_months: durationMonths,
        total_amount: amount,
        status: 'needs_reconciliation',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        created_at: new Date().toISOString(),
      }]).then(({ error }) => {
        if (error) logger.error('[Billing] Could not record the failed activation either', error);
      });

      return res.status(202).json({
        success: false,
        error: 'Your payment went through, but we could not activate the plan automatically. '
             + 'Our team has been notified and will apply it shortly.',
      });
    }

    // Insert Invoice Record
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const { error: invoiceErr } = await supabaseAdmin
      .from('invoices')
      .insert([{
        company_id: companyId,
        invoice_number: invoiceNumber,
        amount: verified.subtotal,
        status: 'paid',
        billing_period_start: new Date().toISOString(),
        billing_period_end: expirationDate.toISOString(),
        created_at: new Date().toISOString(),
      }]);

    if (invoiceErr) {
      logger.warn('[Razorpay Invoice Log Notice] Failed to insert invoice log:', { error: invoiceErr.message });
    }

    // Record the redemption. This must happen on every successful activation, not
    // just when a pending intent happens to exist — the row carrying
    // razorpay_payment_id is what makes the replay guard above (and the unique
    // index behind it) effective.
    const { data: closedIntents } = await supabaseAdmin
      .from('billing_intents')
      .update({
        status: 'completed',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .select('id');

    if (!closedIntents?.length && razorpay_payment_id) {
      // Normal checkout never pre-registers an intent, so write the completed
      // record ourselves. A duplicate payment id trips the unique index here.
      const { error: intentErr } = await supabaseAdmin
        .from('billing_intents')
        .insert([{
          user_id: actor.uid,
          user_email: actor.email || '',
          company_id: companyId,
          plan_id: planId,
          seats,
          duration_months: durationMonths,
          total_amount: amount,
          status: 'completed',
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        }]);

      if (intentErr) {
        logger.warn('[Razorpay Intent Log Notice] Failed to record billing intent:', { error: intentErr.message });
      }
    }

    logger.info(`[Razorpay Payment Success] Company ${companyId} upgraded to ${planId} (${seats} seats). Expires: ${expirationDate.toISOString()}`);

    res.json({
      success: true,
      message: 'Payment verified and subscription activated successfully!',
      plan: planId,
      seatsLimit: seats,
      invoiceNumber,
      expiresAt: expirationDate.toISOString(),
    });
  } catch (e: any) {
    logger.error('[Razorpay Verify Error]:', e);
    res.status(500).json({ error: 'Payment verification failed: ' + (e.message || 'Server error') });
  }
});

// 3. Razorpay Webhook Ingestion (Excluded from CSRF)
router.post('/webhooks/razorpay', razorpayWebhookLimiter, async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Fail closed: this endpoint is unauthenticated, so the signature is the only
  // thing standing between the public internet and a free plan upgrade.
  if (!webhookSecret) {
    logger.error('[Razorpay Webhook Error] RAZORPAY_WEBHOOK_SECRET is not configured — rejecting');
    return res.status(503).json({ error: 'Webhook processing unavailable' });
  }

  if (!signature) {
    logger.error('[Razorpay Webhook Error] Missing x-razorpay-signature header');
    return res.status(400).json({ error: 'Missing webhook signature' });
  }

  // Razorpay signs the exact bytes it sent. Re-serialising the parsed body with
  // JSON.stringify does not reliably reproduce them, so use the captured raw body.
  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    logger.error('[Razorpay Webhook Error] Raw body unavailable — cannot verify signature');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (!safeEqual(expectedSignature, signature)) {
    logger.error('[Razorpay Webhook Error] Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  logger.info(`[Razorpay Webhook Event Received]: ${event}`);

  if (event === 'payment.captured' || event === 'subscription.charged') {
    const payload = req.body.payload?.payment?.entity || req.body.payload?.subscription?.entity;
    const companyId = payload?.notes?.companyId;

    // These used to default to 'growth' and 10 seats, so a webhook carrying no
    // notes silently granted a plan nobody bought. Validate instead.
    const quoted = quoteOrder({
      planId: payload?.notes?.planId,
      seats: payload?.notes?.seats,
      durationMonths: payload?.notes?.durationMonths,
    });

    if (companyId && !('error' in quoted)) {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + quoted.durationMonths);

      await supabaseAdmin
        .from('companies')
        .update({
          plan: quoted.planId,
          seat_limit: quoted.seats,
          plan_status: 'active',
          billing_cycle: quoted.durationMonths === 12 ? 'annual' : 'monthly',
          plan_expires_at: expirationDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      logger.info(`[Razorpay Webhook Auto-Upgrade] Successfully updated company ${companyId} via webhook.`);
    } else if (companyId) {
      logger.error('[Razorpay Webhook] Ignoring a captured payment whose notes do not describe a sellable plan', {
        companyId, notes: payload?.notes, reason: (quoted as { error: string }).error,
      });
    }
  }

  res.json({ status: 'ok' });
});

export default router;
