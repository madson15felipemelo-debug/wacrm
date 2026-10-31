import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DistributionAuditStatus,
  DistributionCampaign,
  DistributionMode,
  DistributionStrategy,
} from '@/types';
import { derivePresence } from '@/lib/presence';

export interface DistributionRequest {
  accountId: string;
  conversationId: string;
  contactId: string;
  cpf?: string | null;
  messageText?: string | null;
  forcedMode?: DistributionMode;
  actorUserId?: string | null;
  targetCampaignId?: string | null;
  targetAgentId?: string | null;
  manualReason?: string | null;
  now?: number;
}

export interface DistributionResult {
  success: boolean;
  status: DistributionAuditStatus;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  mode: DistributionMode;
  strategy: string;
  reason: string;
  executionTimeMs: number;
}

/** Sanitize CPF string to digits only. */
export function sanitizeCpf(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

/** Extract an 11-digit CPF sequence from free text if present. */
export function extractCpfFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  // Match standard formatted CPF 000.000.000-00 or 11 consecutive digits
  const formattedMatch = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
  if (formattedMatch) return sanitizeCpf(formattedMatch[0]);

  const rawMatch = text.match(/\b\d{11}\b/);
  if (rawMatch) return rawMatch[0];

  return null;
}

export interface CandidateStats {
  userId: string;
  isSubstitute: boolean;
  maxCapacity: number;
  weight: number;
  isOnline: boolean;
  activeChats: number;
  lastAssignedMs: number;
}

/**
 * Pure selection algorithm among candidate operators of a campaign.
 * Evaluates online presence, capacity limit, load (Least Busy), and weights.
 */
export function selectBestOperator(
  candidates: CandidateStats[],
  strategy: DistributionStrategy = 'least_busy',
): CandidateStats | null {
  // Only online operators with room under their max capacity
  const available = candidates.filter((c) => c.isOnline && c.activeChats < c.maxCapacity);
  if (available.length === 0) return null;
  if (available.length === 1) return available[0];

  const primary = available.filter((c) => !c.isSubstitute);
  const pool = primary.length > 0 ? primary : available;

  const sorted = [...pool].sort((a, b) => {
    if (strategy === 'least_busy') {
      if (a.activeChats !== b.activeChats) return a.activeChats - b.activeChats;
      if (a.lastAssignedMs !== b.lastAssignedMs) return a.lastAssignedMs - b.lastAssignedMs;
      return a.userId.localeCompare(b.userId);
    }

    if (strategy === 'round_robin') {
      if (a.lastAssignedMs !== b.lastAssignedMs) return a.lastAssignedMs - b.lastAssignedMs;
      if (a.activeChats !== b.activeChats) return a.activeChats - b.activeChats;
      return a.userId.localeCompare(b.userId);
    }

    // Smart / Weighted strategy: ratio of activeChats / maxCapacity, inverted by weight
    const ratioA = a.activeChats / Math.max(1, a.maxCapacity * a.weight);
    const ratioB = b.activeChats / Math.max(1, b.maxCapacity * b.weight);
    if (ratioA !== ratioB) return ratioA - ratioB;
    return a.lastAssignedMs - b.lastAssignedMs;
  });

  return sorted[0];
}

/**
 * Centralized Conversation Distribution Engine:
 * Implements the 3 modalities and the 10 mandatory contingency rules.
 */
export async function executeDistribution(
  db: SupabaseClient,
  request: DistributionRequest,
): Promise<DistributionResult> {
  const startTime = Date.now();
  const now = request.now ?? Date.now();

  try {
    // 1. Check existing conversation state
    const { data: conv } = await db
      .from('conversations')
      .select('id, assigned_agent_id, campaign_id, status')
      .eq('id', request.conversationId)
      .maybeSingle();

    const currentAgentId = conv?.assigned_agent_id ?? null;
    const currentCampaignId = conv?.campaign_id ?? null;

    // Contingency 8: If already assigned to an agent and not forced/manual, preserve assignment!
    if (currentAgentId && !request.forcedMode && !request.targetAgentId) {
      return {
        success: true,
        status: 'success',
        assignedAgentId: currentAgentId,
        assignedAgentName: null,
        campaignId: currentCampaignId,
        campaignName: null,
        mode: 'operational_smart',
        strategy: 'preserve_active',
        reason: 'Conversa já possui operador responsável ativo.',
        executionTimeMs: Date.now() - startTime,
      };
    }

    // 2. Load account distribution configuration
    const { data: config } = await db
      .from('distribution_rules_config')
      .select('*')
      .eq('account_id', request.accountId)
      .maybeSingle();

    const activeMode: DistributionMode =
      request.forcedMode ?? (config?.active_mode as DistributionMode) ?? 'cpf_responsibility';

    // ------------------------------------------------------------
    // MODALITY 3: MANUAL DISTRIBUTION BY SUPERVISOR
    // ------------------------------------------------------------
    if (activeMode === 'manual' || request.actorUserId || request.targetAgentId) {
      let finalAgentId = request.targetAgentId ?? currentAgentId;
      let finalCampaignId = request.targetCampaignId ?? currentCampaignId;
      let campaignName: string | null = null;
      let agentName: string | null = null;

      if (finalCampaignId) {
        const { data: camp } = await db
          .from('distribution_campaigns')
          .select('name')
          .eq('id', finalCampaignId)
          .maybeSingle();
        campaignName = camp?.name ?? null;
      }

      if (finalAgentId) {
        const { data: prof } = await db
          .from('profiles')
          .select('full_name')
          .eq('user_id', finalAgentId)
          .maybeSingle();
        agentName = prof?.full_name ?? null;
      }

      await db
        .from('conversations')
        .update({
          assigned_agent_id: finalAgentId,
          campaign_id: finalCampaignId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.conversationId);

      const result: DistributionResult = {
        success: true,
        status: 'success',
        assignedAgentId: finalAgentId,
        assignedAgentName: agentName,
        campaignId: finalCampaignId,
        campaignName,
        mode: 'manual',
        strategy: 'manual_supervisor',
        reason: request.manualReason || 'Atribuição/transferência manual realizada por supervisor.',
        executionTimeMs: Date.now() - startTime,
      };

      await logAudit(db, request, result, currentAgentId);
      return result;
    }

    // ------------------------------------------------------------
    // RESOLVE CPF (from request, contact custom field, or message text)
    // ------------------------------------------------------------
    let resolvedCpf = sanitizeCpf(request.cpf);

    if (!resolvedCpf && request.contactId) {
      // Check contact custom fields (seeded in migration 044)
      const { data: customValues } = await db
        .from('contact_custom_values')
        .select('value, custom_fields!inner(field_name)')
        .eq('contact_id', request.contactId);

      for (const row of customValues ?? []) {
        const rawCf = (row.custom_fields as unknown) as
          | { field_name: string }
          | Array<{ field_name: string }>
          | null;
        const cfName = Array.isArray(rawCf) ? rawCf[0]?.field_name : rawCf?.field_name;
        if (cfName && cfName.toLowerCase() === 'cpf') {
          resolvedCpf = sanitizeCpf(row.value as string);
          if (resolvedCpf) break;
        }
      }
    }

    if (!resolvedCpf && request.messageText) {
      resolvedCpf = extractCpfFromText(request.messageText);
    }

    // ------------------------------------------------------------
    // MODALITY 2: CPF RESPONSIBILITY / ASSESSORIA (CAMPANHA)
    // ------------------------------------------------------------
    if (activeMode === 'cpf_responsibility') {
      // Contingency 6: CPF not found -> Route to general triage queue
      if (!resolvedCpf) {
        const result: DistributionResult = {
          success: false,
          status: 'triage',
          assignedAgentId: null,
          assignedAgentName: null,
          campaignId: null,
          campaignName: null,
          mode: 'cpf_responsibility',
          strategy: 'triage_unidentified_cpf',
          reason: 'CPF não identificado na mensagem ou cadastro. Encaminhado para triagem geral.',
          executionTimeMs: Date.now() - startTime,
        };
        await logAudit(db, request, result, currentAgentId);
        return result;
      }

      // Query internal CPF responsibility registry
      const { data: responsibilities, error: respErr } = await db
        .from('cpf_responsibilities')
        .select('*, campaign:distribution_campaigns(*)')
        .eq('account_id', request.accountId)
        .eq('cpf', resolvedCpf);

      // Contingency 7: API/Query error -> Triage with retry flag
      if (respErr) {
        const result: DistributionResult = {
          success: false,
          status: 'triage',
          assignedAgentId: null,
          assignedAgentName: null,
          campaignId: null,
          campaignName: null,
          mode: 'cpf_responsibility',
          strategy: 'triage_lookup_error',
          reason: `Erro na consulta de responsabilidade: ${respErr.message}. Mantido em triagem.`,
          executionTimeMs: Date.now() - startTime,
        };
        await logAudit(db, request, result, currentAgentId);
        return result;
      }

      // Contingency 10: Multiple distinct campaigns responsible for the same CPF (Conflict)
      const distinctCampaignIds = new Set(
        (responsibilities ?? []).map((r) => r.campaign_id).filter(Boolean),
      );
      if (distinctCampaignIds.size > 1) {
        const result: DistributionResult = {
          success: false,
          status: 'conflict',
          assignedAgentId: null,
          assignedAgentName: null,
          campaignId: null,
          campaignName: null,
          mode: 'cpf_responsibility',
          strategy: 'conflict_multiple_campaigns',
          reason:
            'Conflito: CPF possui múltiplos contratos vinculados a assessorias distintas. Requer validação manual.',
          executionTimeMs: Date.now() - startTime,
        };
        await logAudit(db, request, result, currentAgentId);
        return result;
      }

      const responsibility = responsibilities?.[0] ?? null;
      const campaign = (responsibility?.campaign as DistributionCampaign) ?? null;

      // Contingency 6: CPF known, but no campaign/assessoria found
      if (!campaign || !campaign.is_active) {
        const result: DistributionResult = {
          success: false,
          status: 'triage',
          assignedAgentId: null,
          assignedAgentName: null,
          campaignId: null,
          campaignName: null,
          mode: 'cpf_responsibility',
          strategy: 'triage_no_campaign',
          reason: `CPF ${resolvedCpf} não possui assessoria/campanha ativa vinculada. Encaminhado para triagem.`,
          executionTimeMs: Date.now() - startTime,
        };
        await logAudit(db, request, result, currentAgentId);
        return result;
      }

      // Check Nominal Operator (Contingency 2)
      const nominalAgentId = responsibility.assigned_agent_id as string | null;
      if (nominalAgentId) {
        const isOnline = await checkAgentOnline(db, request.accountId, nominalAgentId, now);
        if (isOnline) {
          const agentName = await getAgentName(db, nominalAgentId);
          await assignConversation(db, request.conversationId, nominalAgentId, campaign.id);

          const result: DistributionResult = {
            success: true,
            status: 'success',
            assignedAgentId: nominalAgentId,
            assignedAgentName: agentName,
            campaignId: campaign.id,
            campaignName: campaign.name,
            mode: 'cpf_responsibility',
            strategy: 'nominal_agent',
            reason: `CPF ${resolvedCpf} direcionado ao operador nominal ${agentName || nominalAgentId} da assessoria ${campaign.name}.`,
            executionTimeMs: Date.now() - startTime,
          };
          await logAudit(db, request, result, currentAgentId);
          return result;
        }

        // Contingency 4: Nominal agent offline -> Apply campaign contingency rule
        // (will fall through to team distribution or substitute below)
      }

      // Distribute among campaign's team operators
      const candidateStats = await loadCampaignCandidateStats(
        db,
        request.accountId,
        campaign.id,
        now,
      );

      const best = selectBestOperator(candidateStats, campaign.distribution_strategy);

      if (best) {
        const agentName = await getAgentName(db, best.userId);
        await assignConversation(db, request.conversationId, best.userId, campaign.id);

        const stratReason = nominalAgentId
          ? `Operador nominal offline. Contingência da assessoria ${campaign.name} atribuiu a ${agentName || best.userId}.`
          : `Atribuído a ${agentName || best.userId} pela assessoria ${campaign.name} via ${campaign.distribution_strategy}.`;

        const result: DistributionResult = {
          success: true,
          status: 'success',
          assignedAgentId: best.userId,
          assignedAgentName: agentName,
          campaignId: campaign.id,
          campaignName: campaign.name,
          mode: 'cpf_responsibility',
          strategy: campaign.distribution_strategy,
          reason: stratReason,
          executionTimeMs: Date.now() - startTime,
        };
        await logAudit(db, request, result, currentAgentId);
        return result;
      }

      // Contingency 5: No operators online in the campaign -> Keep in campaign queue
      await assignConversation(db, request.conversationId, null, campaign.id);

      const result: DistributionResult = {
        success: true,
        status: 'queued',
        assignedAgentId: null,
        assignedAgentName: null,
        campaignId: campaign.id,
        campaignName: campaign.name,
        mode: 'cpf_responsibility',
        strategy: 'campaign_queue_unassigned',
        reason: `Nenhum operador da assessoria ${campaign.name} disponível no momento. Conversa mantida na fila da assessoria.`,
        executionTimeMs: Date.now() - startTime,
      };
      await logAudit(db, request, result, currentAgentId);
      return result;
    }

    // ------------------------------------------------------------
    // MODALITY 1: OPERATIONAL SMART (Queue / Account-wide)
    // ------------------------------------------------------------
    const defaultStrategy = config?.default_strategy ?? 'least_busy';
    const campaignId = request.targetCampaignId ?? currentCampaignId ?? null;

    let candidateStats: CandidateStats[] = [];
    if (campaignId) {
      candidateStats = await loadCampaignCandidateStats(db, request.accountId, campaignId, now);
    } else {
      candidateStats = await loadAllAccountCandidateStats(db, request.accountId, now);
    }

    const best = selectBestOperator(candidateStats, defaultStrategy);
    if (best) {
      const agentName = await getAgentName(db, best.userId);
      await assignConversation(db, request.conversationId, best.userId, campaignId);

      const result: DistributionResult = {
        success: true,
        status: 'success',
        assignedAgentId: best.userId,
        assignedAgentName: agentName,
        campaignId,
        campaignName: null,
        mode: 'operational_smart',
        strategy: defaultStrategy,
        reason: `Distribuído operacionalmente para ${agentName || best.userId} via ${defaultStrategy}.`,
        executionTimeMs: Date.now() - startTime,
      };
      await logAudit(db, request, result, currentAgentId);
      return result;
    }

    // No operators online
    const result: DistributionResult = {
      success: true,
      status: 'queued',
      assignedAgentId: null,
      assignedAgentName: null,
      campaignId,
      campaignName: null,
      mode: 'operational_smart',
      strategy: 'queue_unassigned',
      reason: 'Nenhum operador online ou com capacidade disponível.',
      executionTimeMs: Date.now() - startTime,
    };
    await logAudit(db, request, result, currentAgentId);
    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno no motor de distribuição.';
    const result: DistributionResult = {
      success: false,
      status: 'failed',
      assignedAgentId: null,
      assignedAgentName: null,
      campaignId: null,
      campaignName: null,
      mode: 'operational_smart',
      strategy: 'error_fallback',
      reason: `Falha na execução: ${errorMsg}`,
      executionTimeMs: Date.now() - startTime,
    };
    await logAudit(db, request, result, null);
    return result;
  }
}

// ------------------------------------------------------------
// Internal Helper Functions
// ------------------------------------------------------------

async function checkAgentOnline(
  db: SupabaseClient,
  accountId: string,
  userId: string,
  now: number,
): Promise<boolean> {
  const { data } = await db
    .from('member_presence')
    .select('status, last_seen_at')
    .eq('account_id', accountId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return false;
  return derivePresence(data.status, data.last_seen_at, now) === 'online';
}

async function getAgentName(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.from('profiles').select('full_name').eq('user_id', userId).maybeSingle();
  return data?.full_name ?? null;
}

async function assignConversation(
  db: SupabaseClient,
  conversationId: string,
  assignedAgentId: string | null,
  campaignId: string | null,
) {
  const updatePayload: Record<string, unknown> = {
    assigned_agent_id: assignedAgentId,
    updated_at: new Date().toISOString(),
  };
  if (campaignId !== undefined) {
    updatePayload.campaign_id = campaignId;
  }
  await db.from('conversations').update(updatePayload).eq('id', conversationId);
}

async function loadCampaignCandidateStats(
  db: SupabaseClient,
  accountId: string,
  campaignId: string,
  now: number,
): Promise<CandidateStats[]> {
  const { data: links } = await db
    .from('campaign_operators')
    .select('user_id, is_substitute, max_capacity, weight')
    .eq('account_id', accountId)
    .eq('campaign_id', campaignId);

  if (!links || links.length === 0) return [];

  const userIds = links.map((l) => l.user_id as string);

  // Check presence
  const { data: presenceRows } = await db
    .from('member_presence')
    .select('user_id, status, last_seen_at')
    .eq('account_id', accountId)
    .in('user_id', userIds);

  const presenceMap = new Map<string, boolean>();
  for (const p of presenceRows ?? []) {
    const isOnline = derivePresence(p.status, p.last_seen_at, now) === 'online';
    presenceMap.set(p.user_id, isOnline);
  }

  // Count active chats
  const { data: convs } = await db
    .from('conversations')
    .select('assigned_agent_id')
    .eq('account_id', accountId)
    .in('status', ['open', 'pending'])
    .in('assigned_agent_id', userIds);

  const activeCountMap = new Map<string, number>();
  for (const id of userIds) activeCountMap.set(id, 0);
  for (const c of convs ?? []) {
    if (c.assigned_agent_id) {
      activeCountMap.set(c.assigned_agent_id, (activeCountMap.get(c.assigned_agent_id) ?? 0) + 1);
    }
  }

  // Check last assignment time
  const { data: recents } = await db
    .from('conversations')
    .select('assigned_agent_id, updated_at')
    .eq('account_id', accountId)
    .in('assigned_agent_id', userIds)
    .order('updated_at', { ascending: false });

  const lastAssignedMap = new Map<string, number>();
  for (const id of userIds) lastAssignedMap.set(id, 0);
  for (const r of recents ?? []) {
    if (r.assigned_agent_id && !lastAssignedMap.has(r.assigned_agent_id)) {
      lastAssignedMap.set(r.assigned_agent_id, new Date(r.updated_at).getTime());
    }
  }

  return links.map((l) => ({
    userId: l.user_id,
    isSubstitute: l.is_substitute ?? false,
    maxCapacity: l.max_capacity ?? 10,
    weight: l.weight ?? 1,
    isOnline: presenceMap.get(l.user_id) ?? false,
    activeChats: activeCountMap.get(l.user_id) ?? 0,
    lastAssignedMs: lastAssignedMap.get(l.user_id) ?? 0,
  }));
}

async function loadAllAccountCandidateStats(
  db: SupabaseClient,
  accountId: string,
  now: number,
): Promise<CandidateStats[]> {
  const { data: profiles } = await db
    .from('profiles')
    .select('user_id, account_role')
    .eq('account_id', accountId)
    .in('account_role', ['owner', 'admin', 'agent']);

  if (!profiles || profiles.length === 0) return [];
  const userIds = profiles.map((p) => p.user_id as string);

  const { data: presenceRows } = await db
    .from('member_presence')
    .select('user_id, status, last_seen_at')
    .eq('account_id', accountId)
    .in('user_id', userIds);

  const presenceMap = new Map<string, boolean>();
  for (const p of presenceRows ?? []) {
    presenceMap.set(p.user_id, derivePresence(p.status, p.last_seen_at, now) === 'online');
  }

  const { data: convs } = await db
    .from('conversations')
    .select('assigned_agent_id')
    .eq('account_id', accountId)
    .in('status', ['open', 'pending'])
    .in('assigned_agent_id', userIds);

  const activeCountMap = new Map<string, number>();
  for (const id of userIds) activeCountMap.set(id, 0);
  for (const c of convs ?? []) {
    if (c.assigned_agent_id) {
      activeCountMap.set(c.assigned_agent_id, (activeCountMap.get(c.assigned_agent_id) ?? 0) + 1);
    }
  }

  return profiles.map((p) => ({
    userId: p.user_id,
    isSubstitute: false,
    maxCapacity: 10,
    weight: 1,
    isOnline: presenceMap.get(p.user_id) ?? false,
    activeChats: activeCountMap.get(p.user_id) ?? 0,
    lastAssignedMs: 0,
  }));
}

async function logAudit(
  db: SupabaseClient,
  request: DistributionRequest,
  result: DistributionResult,
  previousAgentId: string | null,
) {
  try {
    await db.from('distribution_audit_logs').insert({
      account_id: request.accountId,
      conversation_id: request.conversationId,
      contact_id: request.contactId,
      cpf: sanitizeCpf(request.cpf),
      campaign_id: result.campaignId,
      campaign_name: result.campaignName,
      previous_agent_id: previousAgentId,
      assigned_agent_id: result.assignedAgentId,
      assigned_agent_name: result.assignedAgentName,
      actor_user_id: request.actorUserId ?? null,
      distribution_mode: result.mode,
      strategy_used: result.strategy,
      status: result.status,
      reason: result.reason,
      execution_time_ms: result.executionTimeMs,
    });
  } catch (err) {
    console.error('[distribution] Failed to write audit log:', err);
  }
}
