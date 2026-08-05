import { describe, it, expect } from 'vitest';
import {
  PRICING_PLANS,
  calculatePrice,
  isPurchasablePlanId,
  isAllowedTerm,
  GST_RATE,
} from '../config/pricing';

/**
 * `quoteOrder` in src/routes/payments.ts is not exported (the module pulls in
 * the Razorpay SDK and the server db adapter at import time). These tests pin
 * the rules it implements against the same config it reads, so a change to the
 * pricing model that would break order validation fails here.
 *
 * The behaviour under test matters because /create-order used to take the
 * amount straight from the request body: a modified client could have bought
 * the Pro plan for one rupee.
 */

interface QuoteInput { planId?: unknown; seats?: unknown; durationMonths?: unknown }

/** Mirror of the server rule set. Keep in step with payments.ts:quoteOrder. */
function quote(input: QuoteInput): { subtotal: number; gst: number; amount: number } | { error: string } {
  const planId = String(input.planId ?? '').toLowerCase();
  if (!isPurchasablePlanId(planId)) return { error: 'Unknown plan.' };

  const plan = PRICING_PLANS[planId];
  const seats = Number(input.seats ?? 1);
  const durationMonths = Number(input.durationMonths ?? 1);

  if (!Number.isInteger(seats) || seats < 1) return { error: 'bad seats' };
  if (seats > plan.maxSeats) return { error: 'too many seats' };
  if (!isAllowedTerm(durationMonths)) return { error: 'bad term' };

  const subtotal = calculatePrice(planId, seats, durationMonths === 12).total * durationMonths;
  const gst = Math.round(subtotal * GST_RATE);
  return { subtotal, gst, amount: subtotal + gst };
}

const subtotalOf = (r: ReturnType<typeof quote>) =>
  'subtotal' in r ? r.subtotal : NaN;

describe('order pricing rules', () => {
  it('prices a monthly order at the per-seat monthly rate', () => {
    expect(subtotalOf(quote({ planId: 'growth', seats: 4, durationMonths: 1 })))
      .toBe(PRICING_PLANS.growth.monthlyPrice * 4);
  });

  it('charges GST on top of the plan price', () => {
    // GST used to appear only on the generated invoice while Razorpay
    // collected the pre-tax figure, so the tax came out of our own margin.
    const r = quote({ planId: 'starter', seats: 10, durationMonths: 1 }) as any;
    expect(r.subtotal).toBe(6990);
    expect(r.gst).toBe(1258);
    expect(r.amount).toBe(8248);
  });

  it('prices an annual order at twelve times the annual per-seat rate', () => {
    expect(subtotalOf(quote({ planId: 'pro', seats: 2, durationMonths: 12 })))
      .toBe(PRICING_PLANS.pro.annualPrice * 2 * 12);
  });

  it('gives the annual rate only on the 12-month term', () => {
    // Quarterly and half-yearly exist for Indian B2B buyers who ask for them,
    // not as a discount tier -- they bill at the monthly rate.
    expect(subtotalOf(quote({ planId: 'growth', seats: 1, durationMonths: 6 })))
      .toBe(PRICING_PLANS.growth.monthlyPrice * 6);
    expect(subtotalOf(quote({ planId: 'growth', seats: 1, durationMonths: 12 })))
      .toBe(PRICING_PLANS.growth.annualPrice * 12);
  });

  it('sells every plan at a single seat', () => {
    for (const id of ['starter', 'growth', 'pro']) {
      expect(subtotalOf(quote({ planId: id, seats: 1, durationMonths: 1 })))
        .toBe(PRICING_PLANS[id].monthlyPrice);
    }
  });

  it('rejects plans that are not for sale', () => {
    // 'professional' and 'enterprise' appeared throughout the old codebase and
    // the API docs, and were never real.
    for (const bad of ['professional', 'enterprise', 'trial', '', 'GROWTH ']) {
      expect(quote({ planId: bad, seats: 1, durationMonths: 1 })).toHaveProperty('error');
    }
  });

  it('accepts a plan id regardless of case', () => {
    expect(quote({ planId: 'Growth', seats: 1, durationMonths: 1 })).not.toHaveProperty('error');
  });

  it('rejects a seat count above the plan ceiling', () => {
    expect(quote({ planId: 'starter', seats: 11, durationMonths: 1 })).toHaveProperty('error');
    expect(quote({ planId: 'starter', seats: 10, durationMonths: 1 })).not.toHaveProperty('error');
    expect(quote({ planId: 'pro', seats: 51, durationMonths: 1 })).toHaveProperty('error');
  });

  it('rejects nonsense seat counts', () => {
    for (const seats of [0, -5, 1.5, NaN, 'ten']) {
      expect(quote({ planId: 'growth', seats, durationMonths: 1 })).toHaveProperty('error');
    }
  });

  it('accepts only the offered billing terms', () => {
    for (const term of [1, 3, 6, 12]) {
      expect(quote({ planId: 'growth', seats: 1, durationMonths: term })).not.toHaveProperty('error');
    }
    // 2, 4 and 5 used to be selectable in the billing UI and carried no
    // discount, so they only complicated renewals.
    for (const term of [0, 2, 4, 5, 24, -1]) {
      expect(quote({ planId: 'growth', seats: 1, durationMonths: term })).toHaveProperty('error');
    }
  });

  it('never returns a price the client could have chosen', () => {
    // The old route trusted `amount`. Whatever a caller claims, the quote for a
    // 50-seat Pro annual order is fixed by the config.
    const result = quote({ planId: 'pro', seats: 50, durationMonths: 12 }) as any;
    expect(result.subtotal).toBe(PRICING_PLANS.pro.annualPrice * 50 * 12);
    expect(result.amount).not.toBe(1);
  });
});
