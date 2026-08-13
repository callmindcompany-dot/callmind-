import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PRICING_PLANS, GST_RATE, calculatePrice } from '../config/pricing';

/**
 * The pricing page may not say anything the billing system will not do.
 *
 * The seat calculator was modelled on a competitor's page, and three of that
 * page's claims are false here:
 *
 *   "GST inclusive"     CallMind's prices are exclusive. GST_RATE is 18% and it
 *                       is added on top, so "inclusive" would quote ₹699 and
 *                       charge ₹825 — a customer told one price and billed
 *                       another, which is the exact fault src/config/pricing.ts
 *                       was created to stop after the website, the billing page,
 *                       the trial modal and the docs each carried a different
 *                       number.
 *
 *   "Unlimited leads"   True of Pro alone. Starter holds 50,000 and Growth
 *                       250,000, and trg_enforce_lead_limit refuses the rest.
 *
 *   "N users included"  There is no included-seat allowance. Every seat is
 *                       charged from the first.
 *
 * The stepper must also stop at each plan's own maxSeats, because that is the
 * number trg_enforce_seat_limit enforces. A page that lets someone plan for
 * more seats than the product will accept is selling something it will refuse.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const CARD = 'src/website/components/PlanCard.tsx';
const PAGE = 'src/website/pages/PricingPage.tsx';

describe('pricing page', () => {
  it('types no rupee figure into the markup', () => {
    // Everything must come from src/config/pricing.ts. A literal here is how
    // four surfaces came to advertise four different prices.
    for (const file of [CARD, PAGE]) {
      const literals = code(file).match(/₹\s?\d[\d,]*/g) ?? [];
      expect(literals, `${file} hardcodes a price`).toEqual([]);
    }
  });

  it('says GST is added, never that it is included', () => {
    const card = code(CARD);
    expect(card).not.toMatch(/GST\s*inclusive/i);
    expect(card).not.toMatch(/inclusive of\s*GST/i);
    // And it has to be visible, not merely absent from the lie.
    expect(card).toContain('GST_RATE');
    expect(card.toLowerCase()).toContain('plus');
  });

  it('claims unlimited leads only where the config does', () => {
    const unlimited = Object.values(PRICING_PLANS).filter((p) => p.leadLimit === 'unlimited');
    expect(unlimited.map((p) => p.id)).toEqual(['pro']);
    // The card renders describeLeads(), which reads the config, rather than a
    // fixed string on every plan.
    expect(code(CARD)).not.toMatch(/Unlimited leads/);
  });

  it('promises no included seats', () => {
    expect(code(CARD)).not.toMatch(/users? included/i);
    expect(code(CARD)).not.toMatch(/included\s*·/i);
  });

  it('caps the stepper at the seat limit the database enforces', () => {
    const card = code(CARD);
    expect(card).toContain('maxSeats');
    expect(card).toMatch(/Math\.min\(maxSeats/);
    expect(card).toMatch(/Math\.max\(1,/);

    // The three caps are distinct, which is the point of a per-plan stepper.
    const caps = (['starter', 'growth', 'pro'] as const).map((id) => PRICING_PLANS[id].maxSeats);
    expect(new Set(caps).size).toBe(3);
    expect(caps).toEqual([10, 25, 50]);
  });

  it('computes a total that matches the billing arithmetic', () => {
    // What the card shows must be what calculatePrice and GST_RATE produce,
    // since those are what the purchase path uses.
    for (const id of ['starter', 'growth', 'pro'] as const) {
      for (const seats of [1, 4, PRICING_PLANS[id].maxSeats]) {
        for (const annual of [false, true]) {
          const { pricePerSeat, total } = calculatePrice(id, seats, annual);
          expect(total).toBe(pricePerSeat * seats);

          const gst = Math.round(total * GST_RATE);
          expect(gst).toBeGreaterThan(0);
          expect(total + gst).toBeGreaterThan(total);
        }
      }
    }
  });

  it('the invoice names the entity that actually sells this', () => {
    // The footer credited "CallMind Systems India", which is not a company that
    // exists. The operating entity is the one on the Terms and the privacy
    // policy, and an Indian B2B invoice needs the seller's name and address for
    // the buyer to claim input tax credit -- the seller side was absent
    // entirely, leaving only "Billed To".
    const billing = code('src/components/BillingPage.tsx');

    expect(billing, 'invented seller name is back').not.toContain('CallMind Systems India');
    expect(billing).toContain('OPERATOR_NAME');
    expect(billing).toContain('ENTITY.address');
    expect(billing).toMatch(/Billed By/);

    // The GSTIN line is conditional. Printing "GSTIN:" with nothing after it
    // reads as a broken invoice; printing an invented one would be worse.
    expect(billing).toMatch(/ENTITY\.gstin \?/);
  });

  it('quotes the annual saving from the config rather than a round guess', () => {
    const page = code(PAGE);
    // Was a hardcoded "Save ~20%". The three plans do not discount equally.
    expect(page).not.toMatch(/Save\s*~?\s*\d+%/);
    expect(page).toContain('maxAnnualSavingPercent');

    const percents = (['starter', 'growth', 'pro'] as const).map((id) => {
      const p = PRICING_PLANS[id];
      return Math.round(((p.monthlyPrice - p.annualPrice) / p.monthlyPrice) * 100);
    });
    // If they were all equal a single figure would be honest; they are not.
    expect(new Set(percents).size).toBeGreaterThan(1);
  });
});
