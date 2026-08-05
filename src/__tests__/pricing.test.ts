import { describe, it, expect } from 'vitest';
import {
  PRICING_PLANS,
  PURCHASABLE_PLAN_IDS,
  calculatePrice,
  getPlanById,
  getMinimumPlanForSeatCount,
  isPurchasablePlanId,
  resolveLimit,
  includedStorageMb,
  formatStorage,
  MB_PER_GB,
} from '../config/pricing';

describe('pricing config', () => {
  /**
   * Pinned by literal value on purpose. Prices have drifted between the
   * website, the billing page, the trial modal and the docs before; if
   * somebody changes a number here, that should be a deliberate act that
   * shows up in a failing test, not a quiet edit.
   */
  it('charges the agreed rates', () => {
    expect(PRICING_PLANS.starter.monthlyPrice).toBe(699);
    expect(PRICING_PLANS.starter.annualPrice).toBe(599);
    expect(PRICING_PLANS.growth.monthlyPrice).toBe(1199);
    expect(PRICING_PLANS.growth.annualPrice).toBe(999);
    expect(PRICING_PLANS.pro.monthlyPrice).toBe(1499);
    expect(PRICING_PLANS.pro.annualPrice).toBe(1299);
  });

  it('is free during the trial', () => {
    expect(PRICING_PLANS.trial.monthlyPrice).toBe(0);
    expect(PRICING_PLANS.trial.annualPrice).toBe(0);
  });

  it('keeps annual below monthly for every paid plan', () => {
    for (const id of PURCHASABLE_PLAN_IDS) {
      expect(PRICING_PLANS[id].annualPrice).toBeLessThan(PRICING_PLANS[id].monthlyPrice);
    }
  });

  it('gets more expensive and more capable as the tier rises', () => {
    const [starter, growth, pro] = PURCHASABLE_PLAN_IDS.map((id) => PRICING_PLANS[id]);
    expect(starter.monthlyPrice).toBeLessThan(growth.monthlyPrice);
    expect(growth.monthlyPrice).toBeLessThan(pro.monthlyPrice);
    expect(starter.maxSeats).toBeLessThan(growth.maxSeats);
    expect(growth.maxSeats).toBeLessThan(pro.maxSeats);
    expect(resolveLimit(starter.leadLimit)).toBeLessThan(resolveLimit(growth.leadLimit));
    expect(resolveLimit(growth.leadLimit)).toBeLessThan(resolveLimit(pro.leadLimit));
  });

  /** The point of dropping minSeats: a five-person team can buy Growth. */
  it('lets any plan be bought at a single seat', () => {
    for (const id of PURCHASABLE_PLAN_IDS) {
      const plan = PRICING_PLANS[id];
      expect(plan).not.toHaveProperty('minSeats');
      expect(calculatePrice(id, 1, false).total).toBe(plan.monthlyPrice);
    }
  });
});

describe('calculatePrice', () => {
  it.each([
    ['starter', 1, false, 699],
    ['starter', 10, false, 6990],
    ['starter', 10, true, 5990],
    ['growth', 5, false, 5995],
    ['growth', 25, true, 24975],
    ['pro', 50, false, 74950],
    ['pro', 50, true, 64950],
  ])('%s x %i seats (annual: %s) totals %i', (planId, seats, annual, expected) => {
    expect(calculatePrice(planId, seats, annual as boolean).total).toBe(expected);
  });

  it('reports the yearly saving of choosing annual billing', () => {
    // Growth: (1199 - 999) x 10 seats x 12 months
    expect(calculatePrice('growth', 10, true).savings).toBe(24000);
    expect(calculatePrice('growth', 10, false).savings).toBe(0);
  });

  it('returns zeroes rather than throwing for an unknown plan', () => {
    expect(calculatePrice('enterprise', 5, false)).toEqual({
      pricePerSeat: 0,
      total: 0,
      savings: 0,
    });
  });
});

describe('plan lookup', () => {
  it('is case insensitive', () => {
    // AuthContext used to write the literal 'Growth' with a capital G.
    expect(getPlanById('Growth')?.id).toBe('growth');
    expect(getPlanById('')).toBeUndefined();
    expect(getPlanById('professional')).toBeUndefined();
  });

  it('does not treat the trial as purchasable', () => {
    expect(isPurchasablePlanId('trial')).toBe(false);
    expect(isPurchasablePlanId('growth')).toBe(true);
    expect(isPurchasablePlanId('Pro')).toBe(true);
    expect(isPurchasablePlanId('enterprise')).toBe(false);
    expect(isPurchasablePlanId(undefined)).toBe(false);
  });

  it('finds the cheapest plan that fits a seat count, for downgrade checks', () => {
    expect(getMinimumPlanForSeatCount(1)?.id).toBe('starter');
    expect(getMinimumPlanForSeatCount(10)?.id).toBe('starter');
    expect(getMinimumPlanForSeatCount(11)?.id).toBe('growth');
    expect(getMinimumPlanForSeatCount(25)?.id).toBe('growth');
    expect(getMinimumPlanForSeatCount(26)?.id).toBe('pro');
    expect(getMinimumPlanForSeatCount(50)?.id).toBe('pro');
    // Beyond Pro there is nothing to sell -- callers must handle undefined.
    expect(getMinimumPlanForSeatCount(51)).toBeUndefined();
  });
});

describe('included storage', () => {
  it('scales with seats, so a big team is not squeezed by a small pool', () => {
    expect(includedStorageMb('starter', 10)).toBe(30 * MB_PER_GB);
    expect(includedStorageMb('growth', 25)).toBe(125 * MB_PER_GB);
    expect(includedStorageMb('pro', 50)).toBe(400 * MB_PER_GB);
  });

  it('gives the trial a flat grant, not a per-seat one', () => {
    // Seven days is too short for seat count to mean anything, and the whole
    // trial fits in a few dozen documents.
    expect(includedStorageMb('trial', 3)).toBe(500);
    expect(includedStorageMb('trial', 1)).toBe(500);
  });

  it('gives at least one seat worth even if seats is zero or missing', () => {
    expect(includedStorageMb('starter', 0)).toBe(
      PRICING_PLANS.starter.storageGbPerSeat * MB_PER_GB,
    );
  });

  it('grows when a trial converts to a paid plan', () => {
    // The quota is recomputed from the new plan and seat count, so buying is
    // the only thing the customer has to do.
    expect(includedStorageMb('starter', 3)).toBeGreaterThan(includedStorageMb('trial', 3));
  });

  it('reads as MB below a gigabyte and GB above it', () => {
    expect(formatStorage(500)).toBe('500 MB');
    expect(formatStorage(30 * MB_PER_GB)).toBe('30 GB');
  });

  it('covers more than a year of real document volume on every plan', () => {
    // A telecaller generates roughly 2 GB of documents a year: ~400 leads a
    // month, ~8% of which get documented, at ~5 MB per documented lead.
    const GB_PER_SEAT_PER_YEAR = 2;
    for (const id of PURCHASABLE_PLAN_IDS) {
      expect(PRICING_PLANS[id].storageGbPerSeat).toBeGreaterThan(GB_PER_SEAT_PER_YEAR);
    }
  });

  it('keeps storage cost under 1% of the seat price', () => {
    // Cloudflare R2 is about Rs 1.32 per GB per month. If this ever fails,
    // the allowance has outgrown the margin.
    const R2_COST_PER_GB_MONTH = 1.32;
    for (const id of PURCHASABLE_PLAN_IDS) {
      const plan = PRICING_PLANS[id];
      const cost = plan.storageGbPerSeat * R2_COST_PER_GB_MONTH;
      expect(cost / plan.monthlyPrice).toBeLessThan(0.01);
    }
  });
});

describe('resolveLimit', () => {
  it('maps unlimited to Infinity and off to zero', () => {
    expect(resolveLimit('unlimited')).toBe(Infinity);
    expect(resolveLimit(false)).toBe(0);
    expect(resolveLimit(undefined)).toBe(0);
    expect(resolveLimit(10000)).toBe(10000);
  });
});
