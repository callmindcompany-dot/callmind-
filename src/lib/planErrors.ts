/**
 * Turns a plan-limit rejection from Postgres into something the UI can act on.
 *
 * The enforcement triggers (20260802000200_plan_enforcement.sql) raise with a
 * human-readable MESSAGE and a JSON DETAIL. supabase-js surfaces those as
 * `error.message` and `error.details`, so a caller can open the upgrade modal
 * on the right metric instead of dumping a Postgres string into a toast --
 * which is what the team mutations did before.
 */

export type PlanLimitMetric =
  | 'seats'
  | 'admins'
  | 'leads'
  | 'automationRules'
  | 'aiCredits'
  | 'aiDrafts'
  | 'teamTargets'
  | 'billing'
  | 'expired'
  | 'storage'
  | 'filesPerLead'
  // Raised by the client only -- these gate reads, which triggers cannot see.
  | 'ai'
  | 'exports'
  | 'bulkImport';

export interface PlanLimitError {
  metric: PlanLimitMetric;
  used: number;
  limit: number;
  message: string;
}

interface MaybePostgrestError {
  code?: string;
  message?: string;
  details?: string | null;
}

/**
 * Returns the parsed limit breach, or null if this error is something else.
 * Callers should treat null as "not a plan problem" and handle it normally.
 */
export const parsePlanLimitError = (error: unknown): PlanLimitError | null => {
  if (!error || typeof error !== 'object') return null;

  const err = error as MaybePostgrestError;
  if (typeof err.details !== 'string' || !err.details.includes('PLAN_LIMIT')) return null;

  try {
    const parsed = JSON.parse(err.details) as Record<string, unknown>;
    if (parsed.code !== 'PLAN_LIMIT') return null;

    return {
      metric: String(parsed.metric ?? 'seats') as PlanLimitMetric,
      used: Number(parsed.used ?? 0),
      limit: Number(parsed.limit ?? 0),
      message: err.message || 'You have reached a limit on your current plan.',
    };
  } catch {
    return null;
  }
};

export const isPlanLimitError = (error: unknown): boolean => parsePlanLimitError(error) !== null;
