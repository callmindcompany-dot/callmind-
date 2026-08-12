import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, Minus, Plus, Users } from 'lucide-react';
import { calculatePrice, GST_RATE, getPlanById } from '../../config/pricing';

/**
 * One plan, with a seat calculator.
 *
 * The page used to print "₹699 / seat / month" and stop there, so a five-person
 * team had to do the arithmetic themselves and still would not have known about
 * GST until the invoice. This shows what they would actually pay.
 *
 * The stepper caps at the plan's own maxSeats -- Starter 10, Growth 25, Pro 50
 * -- which is also the limit the database enforces, so the page cannot promise
 * a team size the product will refuse.
 *
 * Three things are deliberately not copied from the design this was modelled on:
 *
 *   "GST inclusive"     CallMind's prices are exclusive. GST_RATE is 18% and it
 *                       is added, so saying "inclusive" would quote ₹699 and
 *                       charge ₹825. Quoting one price and charging another is
 *                       the exact fault src/config/pricing.ts exists to prevent.
 *
 *   "Unlimited leads"   True of Pro only. Starter holds 50,000 and Growth
 *                       250,000, and those are enforced by a database trigger.
 *
 *   "2 users included"  There is no included-seat allowance. Every seat is
 *                       charged from the first one.
 */

const inr = new Intl.NumberFormat('en-IN');

export interface PlanCardPlan {
  id: string;
  name: string;
  description: string;
  seats: string;
  leads: string;
  features: string[];
  highlight: boolean;
  badge?: string;
}

interface PlanCardProps {
  plan: PlanCardPlan;
  isAnnual: boolean;
  onChoose: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, isAnnual, onChoose }) => {
  const details = getPlanById(plan.id);
  const maxSeats = details?.maxSeats ?? 1;

  // Starts at one. Every plan is buyable from a single seat, and defaulting
  // higher would inflate the first number a visitor sees.
  const [seats, setSeats] = useState(1);

  const { pricePerSeat, total } = calculatePrice(plan.id, seats, isAnnual);
  const gst = Math.round(total * GST_RATE);
  const payable = total + gst;

  const atMax = seats >= maxSeats;
  const stepperBtn =
    'w-9 h-9 rounded-full grid place-items-center border transition-colors ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      className={`bg-white rounded-3xl flex flex-col relative border transition-shadow ${
        plan.highlight
          ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10'
          : 'border-slate-200 hover:shadow-lg'
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-brand-600 text-white text-[11px] font-bold rounded-full shadow-md tracking-wide uppercase">
          {plan.badge}
        </div>
      )}

      <div className="p-7 space-y-5 flex-grow">
        {/* What the plan holds, before what it costs. */}
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600">
            {plan.seats}
          </span>
          <span className="px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-semibold text-slate-600">
            {plan.leads}
          </span>
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 font-display">{plan.name}</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">
            {plan.description}
          </p>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-slate-900 font-grotesk tabular-nums">
              ₹{inr.format(pricePerSeat)}
            </span>
            <span className="text-sm text-slate-500 font-medium">/ seat / month</span>
          </div>
          {/* Said plainly. GST is added, not included. */}
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            plus {Math.round(GST_RATE * 100)}% GST · billed {isAnnual ? 'annually' : 'monthly'}
          </p>
        </div>

        <hr className="border-slate-100" />

        <ul className="space-y-2.5">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The calculator. */}
      <div className="p-7 pt-0 space-y-4">
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Users size={13} className="text-slate-400" />
                How many telecallers?
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Up to {maxSeats} on {plan.name}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSeats((n) => Math.max(1, n - 1))}
                disabled={seats <= 1}
                aria-label={`Remove a seat from ${plan.name}`}
                className={`${stepperBtn} border-slate-200 text-slate-600 hover:bg-white`}
              >
                <Minus size={15} />
              </button>
              <span
                className="w-8 text-center text-lg font-bold text-slate-900 tabular-nums"
                aria-live="polite"
              >
                {seats}
              </span>
              <button
                type="button"
                onClick={() => setSeats((n) => Math.min(maxSeats, n + 1))}
                disabled={atMax}
                aria-label={`Add a seat to ${plan.name}`}
                className={`${stepperBtn} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}
              >
                <Plus size={15} />
              </button>
            </div>
          </div>

          {atMax && (
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              {plan.name} holds {maxSeats} seats. Larger teams need the next plan.
            </p>
          )}

          <div className="pt-1 space-y-1.5 border-t border-slate-200/70">
            <Row
              label={`${seats} × ₹${inr.format(pricePerSeat)}`}
              value={`₹${inr.format(total)}`}
              muted
            />
            <Row label={`GST ${Math.round(GST_RATE * 100)}%`} value={`₹${inr.format(gst)}`} muted />
            <Row label="You pay" value={`₹${inr.format(payable)}/mo`} />
          </div>
        </div>

        <button
          onClick={onChoose}
          className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
            plan.highlight
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          Start free trial
          <ArrowRight size={14} />
        </button>
        <p className="text-[11px] text-slate-400 text-center font-medium">
          No card needed to start
        </p>
      </div>
    </div>
  );
};

const Row = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <div className="flex items-center justify-between pt-1.5">
    <span className={`text-[11px] font-semibold ${muted ? 'text-slate-500' : 'text-slate-900'}`}>
      {label}
    </span>
    <span
      className={`tabular-nums ${
        muted ? 'text-[11px] font-semibold text-slate-500' : 'text-base font-black text-slate-900'
      }`}
    >
      {value}
    </span>
  </div>
);
