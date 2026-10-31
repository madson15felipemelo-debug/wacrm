import type { SupabaseClient } from '@supabase/supabase-js';
import { derivePresence, OFFLINE_AFTER_MS } from '@/lib/presence';

/**
 * Roles allowed to be assigned conversations. Viewers are read-only
 * and must never receive inbound leads or support threads.
 */
const ASSIGNABLE_ROLES = ['owner', 'admin', 'agent'] as const;

export interface OperatorCandidate {
  userId: string;
  role: string;
}

export interface ResolveRoundRobinOptions {
  /**
   * If true, and no operators are currently online, falls back to
   * any active member of the account. Defaults to false (leaves
   * conversation unassigned in the "Não atribuídas" queue).
   */
  fallbackToOffline?: boolean;
  /** Injected epoch ms for testing. */
  now?: number;
}

/**
 * Pure selection logic among a list of candidate user IDs.
 * Picks the candidate with the lowest active conversation load.
 * Ties are broken by who received an assignment furthest in the past
 * (or stable user ID sort if both have never received any).
 */
export function pickNextCandidate(
  candidateIds: string[],
  activeLoads: Map<string, number>,
  lastAssignedTimestamps: Map<string, number>,
): string | null {
  if (candidateIds.length === 0) return null;
  if (candidateIds.length === 1) return candidateIds[0];

  const sorted = [...candidateIds].sort((a, b) => {
    const loadA = activeLoads.get(a) ?? 0;
    const loadB = activeLoads.get(b) ?? 0;
    if (loadA !== loadB) return loadA - loadB;

    const timeA = lastAssignedTimestamps.get(a) ?? 0;
    const timeB = lastAssignedTimestamps.get(b) ?? 0;
    if (timeA !== timeB) return timeA - timeB;

    return a.localeCompare(b);
  });

  return sorted[0];
}

/**
 * Find all operators in the account who are currently online and
 * have an assignable role (owner, admin, or agent).
 */
export async function getOnlineOperatorIds(
  db: SupabaseClient,
  accountId: string,
  now = Date.now(),
): Promise<string[]> {
  // 1. Fetch eligible profiles for this account
  const { data: profiles, error: profileErr } = await db
    .from('profiles')
    .select('user_id, account_role')
    .eq('account_id', accountId)
    .in('account_role', ASSIGNABLE_ROLES);

  if (profileErr || !profiles || profiles.length === 0) {
    return [];
  }

  const userIds = profiles.map((p) => p.user_id as string);

  // 2. Query presence heartbeats
  const { data: presenceRows, error: presErr } = await db
    .from('member_presence')
    .select('user_id, status, last_seen_at')
    .eq('account_id', accountId)
    .in('user_id', userIds);

  if (presErr || !presenceRows) {
    return [];
  }

  return presenceRows
    .filter((row) => {
      const status = derivePresence(
        row.status as 'online' | 'away',
        row.last_seen_at as string,
        now,
      );
      return status === 'online';
    })
    .map((row) => row.user_id as string);
}

/**
 * Intelligent Round-Robin / Balanced Distribution:
 *
 * 1. Resolves eligible operators (owner/admin/agent) who are currently ONLINE.
 * 2. If no operators are online, either falls back to offline members or
 *    returns null (leaving the conversation in the "Não atribuídas" queue).
 * 3. Chooses the candidate with the fewest active (open/pending) conversations.
 * 4. Ties are broken by whichever operator waited longest since their last assignment.
 */
export async function resolveNextAgentRoundRobin(
  db: SupabaseClient,
  accountId: string,
  options?: ResolveRoundRobinOptions,
): Promise<string | null> {
  const now = options?.now ?? Date.now();

  // 1. Try online operators first
  let candidates = await getOnlineOperatorIds(db, accountId, now);

  // 2. Fallback if no one is online and fallback was requested
  if (candidates.length === 0 && options?.fallbackToOffline) {
    const { data: allProfiles } = await db
      .from('profiles')
      .select('user_id')
      .eq('account_id', accountId)
      .in('account_role', ASSIGNABLE_ROLES);

    candidates = (allProfiles ?? []).map((p) => p.user_id as string);
  }

  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // 3. Compute active loads for candidates
  const { data: activeConvs } = await db
    .from('conversations')
    .select('assigned_agent_id')
    .eq('account_id', accountId)
    .in('status', ['open', 'pending'])
    .in('assigned_agent_id', candidates);

  const activeLoads = new Map<string, number>();
  for (const id of candidates) activeLoads.set(id, 0);
  for (const row of activeConvs ?? []) {
    const aid = row.assigned_agent_id as string | null;
    if (aid && activeLoads.has(aid)) {
      activeLoads.set(aid, (activeLoads.get(aid) ?? 0) + 1);
    }
  }

  // 4. Fetch last assignment timestamps to break ties
  const { data: recentConvs } = await db
    .from('conversations')
    .select('assigned_agent_id, updated_at')
    .eq('account_id', accountId)
    .in('assigned_agent_id', candidates)
    .order('updated_at', { ascending: false });

  const lastAssignedTimestamps = new Map<string, number>();
  for (const id of candidates) lastAssignedTimestamps.set(id, 0);
  for (const row of recentConvs ?? []) {
    const aid = row.assigned_agent_id as string | null;
    if (aid && !lastAssignedTimestamps.has(aid)) {
      const ts = new Date(row.updated_at as string).getTime();
      lastAssignedTimestamps.set(aid, Number.isNaN(ts) ? 0 : ts);
    }
  }

  return pickNextCandidate(candidates, activeLoads, lastAssignedTimestamps);
}
