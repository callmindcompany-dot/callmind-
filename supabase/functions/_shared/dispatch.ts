/**
 * Invoke another edge function and throw when it did not succeed.
 *
 * `supabase.functions.invoke()` resolves with `{ data, error }` instead of
 * rejecting on a non-2xx response. Three callers relied on it rejecting:
 * scheduled-worker, send-scheduled-messages and execute-automation-rules each
 * wrapped the invoke in a try/catch and marked the row `status: 'sent'` right
 * after it. Because nothing ever threw, a scheduled WhatsApp message was
 * recorded as sent whether or not the send function had done anything at all --
 * and it had not, since send-whatsapp-message never called Meta.
 *
 * The functions also answer 200 with `{ success: false }` in places, so the
 * body has to be inspected as well as the transport error.
 */
export async function invokeOrThrow(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  fn: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) {
    throw new Error(`${fn} failed: ${error.message ?? String(error)}`);
  }
  if (data && data.success === false) {
    throw new Error(`${fn} refused: ${data.message ?? data.code ?? 'unknown reason'}`);
  }

  return data ?? {};
}
