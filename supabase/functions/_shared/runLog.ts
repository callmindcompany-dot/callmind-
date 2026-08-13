/**
 * Records what an ingestion attempt did, into public.integration_runs.
 *
 * Lead ingestion had no memory: a poll ran, leads appeared or did not, and
 * nothing was left to inspect. That is why every status on the integrations
 * screen had to be typed rather than read -- there was nothing to read.
 *
 * Two rules this helper exists to keep:
 *
 *   A run is recorded even when it fails. The failing runs are the ones worth
 *   having, and they are exactly the ones an early `throw` would skip, so
 *   finishRun() is called from a finally.
 *
 *   Logging must never break ingestion. If the insert fails, the lead has
 *   already landed and losing the record is the lesser harm -- so these
 *   swallow their own errors and say so in the function log. That is the one
 *   place in this codebase where swallowing is right, and it is narrow: it
 *   applies to the bookkeeping, never to the work.
 */

// deno-lint-ignore no-explicit-any
type Supabase = any;

export type RunTrigger = "schedule" | "manual" | "push";
export type RunOutcome = "success" | "partial" | "failed";

export interface RunHandle {
  id: string | null;
  companyId: string;
  provider: string;
}

/** Opens a run row. Returns a handle even if the insert failed. */
export async function startRun(
  supabase: Supabase,
  companyId: string,
  provider: string,
  trigger: RunTrigger,
): Promise<RunHandle> {
  try {
    const { data, error } = await supabase
      .from("integration_runs")
      .insert({ company_id: companyId, provider, trigger })
      .select("id")
      .single();

    if (error) throw error;
    return { id: data.id, companyId, provider };
  } catch (err) {
    console.error(`[runLog] could not open a run for ${provider}/${companyId}:`, err);
    return { id: null, companyId, provider };
  }
}

/** Closes a run row with what actually happened. */
export async function finishRun(
  supabase: Supabase,
  handle: RunHandle,
  result: {
    outcome: RunOutcome;
    leadsCreated?: number;
    leadsDuplicate?: number;
    error?: unknown;
  },
): Promise<void> {
  if (!handle.id) return;

  // A vendor error body can be an entire HTML page. Keep enough to diagnose.
  const message =
    result.error == null
      ? null
      : String(
          (result.error as { message?: string })?.message ?? result.error,
        ).slice(0, 1000);

  try {
    const { error } = await supabase
      .from("integration_runs")
      .update({
        finished_at: new Date().toISOString(),
        outcome: result.outcome,
        leads_created: result.leadsCreated ?? 0,
        leads_duplicate: result.leadsDuplicate ?? 0,
        error: message,
      })
      .eq("id", handle.id);

    if (error) throw error;
  } catch (err) {
    console.error(`[runLog] could not close run ${handle.id}:`, err);
  }
}
