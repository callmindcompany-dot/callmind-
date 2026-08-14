/**
 * Who a new lead belongs to.
 *
 * The Integrations screen offers two modes: Manual, where inbound leads land
 * unassigned in a pool, and Round Robin, described as "circulate equally among
 * active telecallers". Only one of the eight sources ever honoured it.
 *
 * The Express route behind /v1/webhooks/incoming/<id> calls
 * processInboundLead(), which reads assignment_mode and rotates through the
 * team. The four marketplace pollers and the edge webhook receiver each wrote
 * `assigned_to: "unassigned"` as a literal. So a company that switched Round
 * Robin on still got every IndiaMART, JustDial, TradeIndia and Facebook lead
 * dropped into a pool with nobody's name on it, and had to hand them out --
 * while the setting said it was circulating them.
 *
 * processInboundLead lives in src/lib/dbAdapter.ts and runs under Node, so the
 * edge functions cannot call it. This is the same decision, made the same way,
 * against the same table and the same rotation counter -- so the two paths
 * cannot drift into disagreeing about what Round Robin means.
 */

// deno-lint-ignore no-explicit-any
type Supabase = any;

export const UNASSIGNED = "unassigned";

/**
 * Is this company on Round Robin?
 *
 * Spelling has to be forgiving, because the column and the client disagree.
 * team_settings.assignment_mode defaults to 'round_robin' in the schema, while
 * the Integrations panel saves 'RoundRobin'. Both code paths compared against
 * 'RoundRobin' exactly -- so every company that had never touched the setting
 * sat on the schema default, which reads as Round Robin to a person and matched
 * nothing in the code, and their leads went unassigned while the screen said
 * they were being circulated.
 */
export function isRoundRobin(mode: string | null | undefined): boolean {
  return (mode ?? "").replace(/[^a-z]/gi, "").toLowerCase() === "roundrobin";
}

/**
 * Returns the user id to assign this lead to, or "unassigned".
 *
 * Never throws: a routing failure must not cost the company the lead. If
 * anything goes wrong the lead lands in the pool, which is exactly where it
 * would have landed before, and the reason is in the function log.
 */
export async function pickAssignee(
  supabase: Supabase,
  companyId: string,
  source: string,
): Promise<string> {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from("team_settings")
      .select("assignment_mode")
      .eq("company_id", companyId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    // Manual is the safe fallback: an unassigned lead is visible in the pool,
    // whereas a lead assigned to the wrong person is invisible to everybody
    // else.
    if (!isRoundRobin(settings?.assignment_mode)) return UNASSIGNED;

    // Telecallers only. Admins and founders are not in the calling rotation.
    const { data: agents, error: agentsError } = await supabase
      .from("users")
      .select("id, role, status")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (agentsError) throw agentsError;

    const rotation = (agents ?? [])
      .filter((u: { role?: string }) => {
        const role = (u.role ?? "").toLowerCase();
        return role !== "admin" && role !== "founder";
      })
      .map((u: { id: string }) => u.id)
      .sort(); // stable order, so the counter means the same thing every run

    if (rotation.length === 0) return UNASSIGNED;

    // One counter per company per source, incremented atomically, so two
    // pollers finishing at the same moment cannot hand the same agent both
    // leads.
    const { data: index, error: rpcError } = await supabase.rpc("increment_routing_index", {
      p_company_id: companyId,
      p_source: source.toLowerCase(),
      p_agent_count: rotation.length,
    });

    if (rpcError || typeof index !== "number") throw rpcError ?? new Error("bad routing index");

    return rotation[index % rotation.length] ?? UNASSIGNED;
  } catch (err) {
    console.error(`[assignLead] routing failed for ${source}/${companyId}, leaving unassigned:`, err);
    return UNASSIGNED;
  }
}
