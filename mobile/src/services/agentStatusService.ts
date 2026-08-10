import { supabase } from './supabase';

/**
 * Whether this agent is at work, on a call, or gone.
 *
 * The admin's live monitor on the web reads `agent_status` and nothing had ever
 * written to it, so every agent showed as offline for as long as the table has
 * existed.
 *
 * There is no manual toggle, and deliberately so. All three values are things
 * the app already knows without asking: the agent punched in, the agent handed
 * off to the dialler, the agent came back. A control the telecaller has to
 * remember to set is a control that is wrong by mid-morning, and a presence
 * board that is wrong is worse than no board -- an admin chasing someone who is
 * marked available and is not learns to ignore it.
 *
 * The specification also lists a Break state. It is not written here: the web
 * renders anything that is not 'active' or 'on_call' in grey, identical to
 * offline (TeamPage.tsx:907), so writing 'break' would report the agent as gone
 * rather than as on a break. That needs the web to understand the value first.
 */

/**
 * The three the web understands.
 *
 * useAgentMonitor.ts:22 types this as 'active' | 'on_call' | 'offline' and
 * TeamPage counts on-call and offline directly. Writing anything else here
 * would show up as offline.
 */
export type AgentPresence = 'active' | 'on_call' | 'offline';

export const agentStatusService = {
  /**
   * Records where this agent is.
   *
   * Never throws. Presence is ambient -- it is not something the agent asked
   * for, and a failed write must not interrupt a call or a punch-in with an
   * error about a table they have never heard of. The failure is logged and the
   * board simply keeps the previous value, which is the honest outcome: it is
   * stale rather than wrong-and-confident.
   *
   * Note the column list. `location` is declared on this table in
   * src/types/supabase.ts and does not exist in the database -- the type is
   * hand-maintained and drifted -- so writing it would fail every call.
   */
  async set(
    companyId: string | null | undefined,
    userId: string | null | undefined,
    userName: string,
    status: AgentPresence,
  ): Promise<void> {
    if (!companyId || !userId) return;

    const now = new Date().toISOString();
    const { error } = await supabase.from('agent_status').upsert(
      {
        id: userId,
        company_id: companyId,
        user_name: userName || 'Telecaller',
        status,
        last_seen: now,
        updated_at: now,
      },
      { onConflict: 'id' },
    );

    if (error) console.warn('[agentStatusService] presence not recorded:', error.message);
  },
};
