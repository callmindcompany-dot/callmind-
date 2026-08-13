import React from 'react';
import { UserPlus, ArrowRight, Clock } from 'lucide-react';
import { useSeatBlockedRequests } from '@/hooks/useTeam';
import { usePlan } from '@/hooks/usePlan';

/**
 * Tells the owner that somebody tried to join and could not.
 *
 * A trial workspace holds three people. The third telecaller to scan the QR is
 * the strongest buying signal this product can produce — a team that wants
 * another caller has decided CallMind works for them — and it used to be
 * discarded at the door. submit_join_request returned before writing anything,
 * so nobody was recorded, the owner never found out, and the telecaller got
 * "contact the system administrator to upgrade their plan", which they cannot
 * act on because only the owner can buy a plan.
 *
 * 20260818000200_seat_full_join_requests.sql records those attempts. This is
 * where the owner meets them.
 *
 * It is not an approve/reject queue. While the seat limit stands there is
 * nothing to approve — the answer is a plan, so the only action offered is
 * choosing one. Once seats exist, the person can be let in from the normal
 * pending queue.
 */

interface SeatBlockedBannerProps {
  companyId: string | null;
  /** Sends the owner to wherever plans are chosen. */
  onChoosePlan: () => void;
  /** Set on the billing page itself, where a "see plans" button is redundant. */
  hideAction?: boolean;
}

export const SeatBlockedBanner: React.FC<SeatBlockedBannerProps> = ({
  companyId,
  onChoosePlan,
  hideAction = false,
}) => {
  const { data: blocked, isError } = useSeatBlockedRequests(companyId);
  const plan = usePlan();

  // Nothing to say when nobody is waiting. A failed query says nothing either —
  // it must not render as "nobody is waiting", which is a different claim.
  if (isError || !blocked || blocked.length === 0) return null;

  const seatLimit = plan.limit('seats');
  const names = blocked.slice(0, 3).map((r) => r.name).filter(Boolean);
  const extra = blocked.length - names.length;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <UserPlus size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-amber-900">
            {blocked.length === 1
              ? 'Someone tried to join and your team is full'
              : `${blocked.length} people tried to join and your team is full`}
          </h3>

          <p className="text-xs text-amber-800/90 mt-1.5 leading-relaxed">
            {names.length > 0 && (
              <>
                <span className="font-semibold">{names.join(', ')}</span>
                {extra > 0 && <> and {extra} more</>}
                {' '}scanned your join code.{' '}
              </>
            )}
            {Number.isFinite(seatLimit)
              ? `Your plan covers ${seatLimit} ${seatLimit === 1 ? 'seat' : 'seats'}, and they are taken.`
              : 'Every seat on your plan is taken.'}
            {' '}Choose a plan with more seats and they can join straight away — their request is
            already here.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] font-semibold text-amber-700">
            {blocked.slice(0, 4).map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1.5">
                <Clock size={11} />
                {r.name}
                {r.created_at && (
                  <span className="font-medium text-amber-600">
                    · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {!hideAction && (
          <button
            onClick={onChoosePlan}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider transition-colors"
          >
            See plans
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
