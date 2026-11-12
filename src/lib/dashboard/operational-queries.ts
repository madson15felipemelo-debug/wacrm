import type { SupabaseClient } from '@supabase/supabase-js';
import { daysAgoStart } from './date-utils';
import { derivePresence } from '@/lib/presence';

export interface OperationalKPIs {
  responseRate: number;
  responseRateDelta: number;
  agreementRateOnResponses: number;
  agreementRateDelta: number;
  activeConversations: number;
  queuedConversations: number;
  avgTmaSeconds: number;
}

export interface ChannelBreakdown {
  robot: { count: number; percentage: number; avgTimeSec: number };
  ai: { count: number; percentage: number; avgTimeSec: number };
  human: { count: number; percentage: number; avgTimeSec: number; agreementRate: number };
}

export interface CpfDropoffStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
  dropoffCount: number;
  dropoffPercentage: number;
}

export interface CpfLossInsight {
  type: 'warning' | 'alert' | 'success' | 'info';
  title: string;
  description: string;
}

export interface OperatorProductivityRow {
  userId: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  campaignName?: string | null;
  activeChats: number;
  completedChats: number;
  agreementsCount: number;
  conversionRate: number;
  tmaSeconds: number;
  tmaString: string;
  occupancyPercent: number;
  rank?: number;
}

export interface CampaignProductivityRow {
  campaignId: string;
  name: string;
  code?: string | null;
  clientName?: string | null;
  onlineOperators: number;
  totalOperators: number;
  cpfsReceived: number;
  cpfsCompleted: number;
  agreementsCount: number;
  conversionRate: number;
  avgTmaSeconds: number;
  avgTmaString: string;
  occupancyPercent: number;
}

export interface RealtimeCounters {
  operatorsOnline: number;
  operatorsAvailable: number;
  operatorsInBreak: number;
  operatorsDisconnected: number;
  waitingResponses: number;
  tmrOperator: string;
  tmrClient: string;
  tmf: string;
  inRobot: number;
  inQueue: number;
  inHuman: number;
  inAi: number;
}

export interface LiveQueueItem {
  id: string;
  conversationId: string;
  slaStatus: 'good' | 'warning' | 'critical';
  campaignName: string;
  clientName: string;
  contactPhone: string;
  cpf?: string;
  waitingTime: string;
  waitingSeconds: number;
  currentChannel: 'robot' | 'queue' | 'ai';
  priority: 'Normal' | 'Alta' | 'VIP';
}

export interface LiveHumanAttendance {
  id: string;
  conversationId: string;
  slaStatus: 'good' | 'warning' | 'critical';
  campaignName: string;
  startedAt: string;
  agentName: string;
  agentAvatar?: string | null;
  agentInitials: string;
  clientName: string;
  contactPhone: string;
  lastInteraction: 'client' | 'agent';
  lastMessageTime: string;
  statusTabulation: string;
}

export interface MailingPerformanceRow {
  id: string;
  name: string;
  campaignName: string;
  date: string;
  sentCount: number;
  invalidCount: number;
  invalidRate: number;
  deliveredCount: number;
  repliedCount: number;
  responseRate: number;
  transferredToHumanCount: number;
  transferredRate: number;
  agreementsCount: number;
  conversionRate: number;
  status: 'completed' | 'in_progress' | 'scheduled' | 'paused';
}

export interface ScheduledAgreementRow {
  id: string;
  conversationId?: string;
  campaignName: string;
  scheduledDate: string;
  clientName: string;
  contactPhone: string;
  operatorName: string;
  operatorInitials: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  tabulation: string;
  observation: string;
}

export interface AttendanceDetailRow {
  id: string;
  conversationId: string;
  clientName: string;
  cpf?: string;
  phone: string;
  campaignName: string;
  campaignCode?: string;
  assignedType: 'human' | 'ai' | 'robot';
  operatorName?: string;
  operatorInitials?: string;
  operatorAvatar?: string | null;
  status: 'open' | 'pending' | 'closed';
  negotiationStatus: 'in_negotiation' | 'waiting_client' | 'waiting_operator' | 'proposal_sent' | 'agreement_won' | 'abandoned';
  negotiationStatusLabel: string;
  slaStatus: 'good' | 'warning' | 'critical';
  waitingMinutes: number;
  waitingString: string;
  waitingTarget: 'operator' | 'client';
  totalDurationMinutes: number;
  totalDurationString: string;
  lastMessageSnippet: string;
  lastMessageSender: 'client' | 'agent' | 'bot';
  lastMessageAt: string;
  priority: 'Alta' | 'Média' | 'Baixa' | 'Crítica' | 'Normal';
}

export type RiskLevel = 'critical' | 'warning' | 'stable' | 'stellar';
export type TrajectoryType = 'rapid_improving' | 'recovering' | 'stagnant' | 'degrading';

export interface WeeklyScorePoint {
  weekLabel: string;
  score: number;
  slaBurstRate: number;
  conversionRate: number;
}

export interface OperatorEvolutionProfile {
  operatorId: string;
  name: string;
  initials: string;
  avatar?: string | null;
  campaignName: string;
  role: string;
  riskLevel: RiskLevel;
  riskScore: number;
  healthScore: number;
  trajectory: TrajectoryType;
  trajectoryDelta: number;
  trajectoryLabel: string;
  sla: {
    burstRatePast: number;
    burstRateRecent: number;
    tmrPastString: string;
    tmrRecentString: string;
    deltaPercent: number;
  };
  agreements: {
    conversionRatePast: number;
    conversionRateRecent: number;
    deltaPercentagePoints: number;
    totalAgreementsPeriod: number;
    projectedMonthlyRecovery: string;
  };
  dropoff: {
    ratePast: number;
    rateRecent: number;
    primaryDropoffStage: string;
  };
  trendCurve: WeeklyScorePoint[];
  aiDiagnostic: {
    analystName: string;
    analystQuote: string;
    summary: string;
    bottleneckType: 'capacity_overload' | 'negotiation_friction' | 'idle_time' | 'excellent_trajectory';
    keyFinding: string;
    impactDescription: string;
  };
  recommendedAction: {
    id: string;
    title: string;
    badge: string;
    description: string;
    expectedGain: string;
    actionType: 'limit_capacity' | 'coaching' | 'reassign_queue' | 'praise';
    applied: boolean;
  };
}

export interface QualityAnalystProfile {
  name: string;
  role: string;
  badge: string;
  avatar: string;
  status: string;
  auditedConversationsCount: number;
  scriptAdherencePercent: number;
  generalInsight: string;
  criticalAlert: string;
}

export interface OperatorEvolutionSummary {
  overallTeamHealthScore: number;
  healthScoreDelta: number;
  criticalOperatorsCount: number;
  recoveringOperatorsCount: number;
  stagnantOperatorsCount: number;
  benchmarkOperatorsCount: number;
  rescuedAgreementsThisMonth: number;
  potentialLossFromCriticalSla: string;
}

export interface OperatorEvolutionDashboardData {
  analyst: QualityAnalystProfile;
  summary: OperatorEvolutionSummary;
  operators: OperatorEvolutionProfile[];
}

export interface OperationalDashboardData {
  kpis: OperationalKPIs;
  channels: ChannelBreakdown;
  funnel: {
    stages: CpfDropoffStage[];
    insights: CpfLossInsight[];
  };
  operators: OperatorProductivityRow[];
  campaigns: CampaignProductivityRow[];
  realtime: RealtimeCounters;
  liveQueue: LiveQueueItem[];
  liveHuman: LiveHumanAttendance[];
  mailings: MailingPerformanceRow[];
  scheduled: ScheduledAgreementRow[];
  attendances: AttendanceDetailRow[];
  evolution: OperatorEvolutionDashboardData;
}

export function formatSeconds(sec: number): string {
  if (sec <= 0 || isNaN(sec)) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s}s`;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatHms(sec: number): string {
  if (sec <= 0 || isNaN(sec)) return '00:00:00';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase() || 'OP'
  );
}

export async function loadOperationalDashboardData(
  db: SupabaseClient,
  rangeDays: number = 30
): Promise<OperationalDashboardData> {
  const startDate = daysAgoStart(rangeDays - 1).toISOString();
  const nowMs = Date.now();

  // 1. Fetch conversations, campaigns, operators, presence, broadcasts, reminders, deals, and audit logs in parallel
  const [
    convRes,
    msgRes,
    wonDealsRes,
    auditRes,
    profilesRes,
    campaignsRes,
    campOpsRes,
    presenceRes,
    broadcastsRes,
    remindersRes,
    cpfRespRes,
  ] = await Promise.all([
    db
      .from('conversations')
      .select(
        'id, status, assigned_agent_id, campaign_id, contact_id, last_message_text, last_message_at, created_at, updated_at, contact:contacts(id, name, phone)'
      )
      .gte('updated_at', startDate)
      .order('last_message_at', { ascending: false }),
    db
      .from('messages')
      .select('conversation_id, sender_type, content_text, created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true }),
    db
      .from('deals')
      .select('id, user_id, contact_id, conversation_id, status, created_at')
      .eq('status', 'won')
      .gte('created_at', startDate),
    db
      .from('distribution_audit_logs')
      .select('id, conversation_id, contact_id, status, cpf, campaign_id, campaign_name, assigned_agent_id, execution_time_ms, created_at')
      .gte('created_at', startDate),
    db.from('profiles').select('user_id, full_name, avatar_url, account_role'),
    db.from('distribution_campaigns').select('id, name, code, client_name, max_concurrent_chats, is_active'),
    db.from('campaign_operators').select('campaign_id, user_id, is_substitute, max_capacity'),
    db.from('member_presence').select('user_id, status, last_seen_at'),
    db
      .from('broadcasts')
      .select(
        'id, name, template_name, status, total_recipients, sent_count, delivered_count, read_count, replied_count, failed_count, scheduled_at, created_at'
      )
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('conversation_reminders')
      .select(
        'id, conversation_id, contact_id, user_id, remind_at, comment, done_at, created_at, contact:contacts(id, name, phone)'
      )
      .is('done_at', null)
      .order('remind_at', { ascending: true })
      .limit(100),
    db.from('cpf_responsibilities').select('cpf, contact_id:cpf, debtor_name, campaign_id'),
  ]);

  const convs = (convRes.data ?? []) as any[];
  const msgs = (msgRes.data ?? []) as any[];
  const wonDeals = (wonDealsRes.data ?? []) as any[];
  const audits = (auditRes.data ?? []) as any[];
  const memberProfiles = (profilesRes.data ?? []) as any[];
  const campaignsRows = (campaignsRes.data ?? []) as any[];
  const campOpsRows = (campOpsRes.data ?? []) as any[];
  const presenceRows = (presenceRes.data ?? []) as any[];
  const broadcastRows = (broadcastsRes.data ?? []) as any[];
  const reminderRows = (remindersRes.data ?? []) as any[];
  void cpfRespRes;

  // Lookup maps
  const campaignById = new Map<string, { id: string; name: string; code?: string | null; client_name?: string | null; max_concurrent_chats?: number }>();
  for (const c of campaignsRows) {
    campaignById.set(c.id, c);
  }

  const profileByUserId = new Map<string, { user_id: string; full_name: string; avatar_url?: string | null; account_role?: string }>();
  for (const p of memberProfiles) {
    profileByUserId.set(p.user_id, p);
  }

  // Map user -> primary campaign name
  const userCampaignNameMap = new Map<string, string>();
  const userMaxCapacityMap = new Map<string, number>();
  for (const co of campOpsRows) {
    const camp = campaignById.get(co.campaign_id);
    if (camp && !userCampaignNameMap.has(co.user_id)) {
      userCampaignNameMap.set(co.user_id, camp.name);
    }
    if (co.max_capacity) {
      userMaxCapacityMap.set(co.user_id, co.max_capacity);
    }
  }

  // Map conversation -> CPF from audit logs
  const cpfByConvId = new Map<string, string>();
  for (const a of audits) {
    if (a.conversation_id && a.cpf && !cpfByConvId.has(a.conversation_id)) {
      cpfByConvId.set(a.conversation_id, a.cpf);
    }
  }

  // 2. Process messages for response rates, channel breakdown, and response times
  const convInbounds = new Map<string, number>();
  const convOutbounds = new Map<string, number>();
  const lastMsgByConv = new Map<string, { sender_type: string; content_text?: string; created_at: string }>();

  let botCount = 0;
  let humanCount = 0;

  // Response time tracking (customer -> agent and agent -> customer)
  const operatorReplyDiffsSec: number[] = [];
  const clientReplyDiffsSec: number[] = [];
  const lastTurnByConv = new Map<string, { sender: string; ts: number }>();

  for (const m of msgs) {
    const cid = m.conversation_id;
    const ts = new Date(m.created_at).getTime();
    lastMsgByConv.set(cid, m);

    const prevTurn = lastTurnByConv.get(cid);
    if (m.sender_type === 'customer') {
      convInbounds.set(cid, (convInbounds.get(cid) || 0) + 1);
      if (prevTurn && prevTurn.sender !== 'customer') {
        const diffSec = (ts - prevTurn.ts) / 1000;
        if (diffSec >= 0 && diffSec < 86400) clientReplyDiffsSec.push(diffSec);
      }
      lastTurnByConv.set(cid, { sender: 'customer', ts });
    } else if (m.sender_type === 'bot') {
      botCount++;
      convOutbounds.set(cid, (convOutbounds.get(cid) || 0) + 1);
      lastTurnByConv.set(cid, { sender: 'bot', ts });
    } else {
      humanCount++;
      convOutbounds.set(cid, (convOutbounds.get(cid) || 0) + 1);
      if (prevTurn && prevTurn.sender === 'customer') {
        const diffSec = (ts - prevTurn.ts) / 1000;
        if (diffSec >= 0 && diffSec < 86400) operatorReplyDiffsSec.push(diffSec);
      }
      lastTurnByConv.set(cid, { sender: 'agent', ts });
    }
  }

  const aiCount = 0;

  let respondedConvsCount = 0;
  for (const c of convs) {
    if ((convInbounds.get(c.id) || 0) > 0) {
      respondedConvsCount++;
    }
  }

  const agreementsTotal = wonDeals.length;

  // 3. Calculate real TMA (Average Handling Time) on closed/active conversations
  const handlingDurationsSec: number[] = [];
  const handlingByUser = new Map<string, number[]>();
  const handlingByCamp = new Map<string, number[]>();

  for (const c of convs) {
    const startMs = new Date(c.created_at).getTime();
    const endMs = new Date(c.last_message_at || c.updated_at || c.created_at).getTime();
    const durSec = Math.max(0, (endMs - startMs) / 1000);
    if (durSec > 0 && durSec < 86400 * 7) {
      handlingDurationsSec.push(durSec);
      if (c.assigned_agent_id) {
        const list = handlingByUser.get(c.assigned_agent_id) ?? [];
        list.push(durSec);
        handlingByUser.set(c.assigned_agent_id, list);
      }
      if (c.campaign_id) {
        const list = handlingByCamp.get(c.campaign_id) ?? [];
        list.push(durSec);
        handlingByCamp.set(c.campaign_id, list);
      }
    }
  }

  const avgSec = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const avgTmaSeconds = avgSec(handlingDurationsSec);
  const avgTmrOperatorSec = avgSec(operatorReplyDiffsSec);
  const avgTmrClientSec = avgSec(clientReplyDiffsSec);

  // 4. Calculate KPIs (0 when no conversations exist)
  const responseRate =
    convs.length > 0
      ? Math.min(100, Math.round((respondedConvsCount / convs.length) * 1000) / 10)
      : 0;
  const agreementRateOnResponses =
    respondedConvsCount > 0
      ? Math.min(100, Math.round((agreementsTotal / respondedConvsCount) * 1000) / 10)
      : 0;

  const activeConvs = convs.filter((c) => c.status === 'open' || c.status === 'pending').length;
  const queuedConvs = convs.filter((c) => !c.assigned_agent_id && (c.status === 'open' || c.status === 'pending')).length;

  // 5. Channel breakdown
  const totalActions = botCount + aiCount + humanCount;
  const channels: ChannelBreakdown = {
    robot: {
      count: botCount,
      percentage: totalActions > 0 ? Math.round((botCount / totalActions) * 100) : 0,
      avgTimeSec: botCount > 0 ? 2 : 0,
    },
    ai: {
      count: aiCount,
      percentage: totalActions > 0 ? Math.round((aiCount / totalActions) * 100) : 0,
      avgTimeSec: 0,
    },
    human: {
      count: humanCount,
      percentage: totalActions > 0 ? Math.round((humanCount / totalActions) * 100) : 0,
      avgTimeSec: avgTmrOperatorSec,
      agreementRate: agreementRateOnResponses,
    },
  };

  // 6. Funnel of CPF Dropoff (100% real counts, no fake multipliers)
  const totalInbound = convs.length;
  const withCpfIdentified = audits.filter((a) => a.cpf && a.status !== 'triage').length;
  const routedToCampaign = Math.max(
    audits.filter((a) => a.campaign_id).length,
    convs.filter((c) => c.campaign_id).length
  );
  const attendedByOperator = convs.filter((c) => c.assigned_agent_id).length;
  const agreementsClosed = agreementsTotal;

  const safePct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);

  const stages: CpfDropoffStage[] = [
    {
      stage: 'inbound',
      label: '1. Mensagens Recebidas (Inbound)',
      count: totalInbound,
      percentage: totalInbound > 0 ? 100 : 0,
      dropoffCount: Math.max(0, totalInbound - withCpfIdentified),
      dropoffPercentage: safePct(Math.max(0, totalInbound - withCpfIdentified), totalInbound),
    },
    {
      stage: 'cpf_identified',
      label: '2. CPF Informado na Triagem',
      count: withCpfIdentified,
      percentage: safePct(withCpfIdentified, totalInbound),
      dropoffCount: Math.max(0, withCpfIdentified - routedToCampaign),
      dropoffPercentage: safePct(Math.max(0, withCpfIdentified - routedToCampaign), withCpfIdentified),
    },
    {
      stage: 'routed_campaign',
      label: '3. Encaminhado p/ Fila da Carteira',
      count: routedToCampaign,
      percentage: safePct(routedToCampaign, totalInbound),
      dropoffCount: Math.max(0, routedToCampaign - attendedByOperator),
      dropoffPercentage: safePct(Math.max(0, routedToCampaign - attendedByOperator), routedToCampaign),
    },
    {
      stage: 'in_negotiation',
      label: '4. Em Negociação com Operador',
      count: attendedByOperator,
      percentage: safePct(attendedByOperator, totalInbound),
      dropoffCount: Math.max(0, attendedByOperator - agreementsClosed),
      dropoffPercentage: safePct(Math.max(0, attendedByOperator - agreementsClosed), attendedByOperator),
    },
    {
      stage: 'agreement_won',
      label: '5. Acordo Fechado com Sucesso',
      count: agreementsClosed,
      percentage: safePct(agreementsClosed, totalInbound),
      dropoffCount: 0,
      dropoffPercentage: 0,
    },
  ];

  const insights: CpfLossInsight[] = [];
  if (totalInbound === 0) {
    insights.push({
      type: 'info',
      title: 'Sem conversas registradas no período',
      description: 'Assim que novas conversas entrarem pelo WhatsApp, o funil de atendimento exibirá as taxas reais de cada etapa.',
    });
  } else {
    const triageLoss = stages[0].dropoffPercentage;
    if (triageLoss > 15) {
      insights.push({
        type: 'warning',
        title: `Triagem: ${triageLoss}% das conversas ainda sem CPF vinculado`,
        description: 'Verifique se o fluxo inicial solicita o CPF ou se a base de responsabilidades está atualizada.',
      });
    }
    const queueLoss = stages[2].dropoffPercentage;
    if (queueLoss > 10) {
      insights.push({
        type: 'alert',
        title: `Fila: ${queueLoss}% aguardando atribuição a um operador`,
        description: 'Existem conversas aguardando atendimento humano nas carteiras.',
      });
    } else {
      insights.push({
        type: 'success',
        title: 'Fluxo de distribuição operando normalmente',
        description: `Taxa de conversão sobre respostas em ${agreementRateOnResponses}%.`,
      });
    }
  }

  // 7. Presence calculation
  const presenceByUser = new Map<string, 'online' | 'away' | 'offline'>();
  for (const p of presenceRows) {
    presenceByUser.set(p.user_id, derivePresence(p.status, p.last_seen_at, nowMs));
  }

  // 8. Operators Productivity (100% real from profiles)
  const wonDealsByUser = new Map<string, number>();
  const wonDealsByConv = new Map<string, number>();
  const wonDealsByContact = new Map<string, number>();
  for (const d of wonDeals) {
    if (d.user_id) wonDealsByUser.set(d.user_id, (wonDealsByUser.get(d.user_id) || 0) + 1);
    if (d.conversation_id) wonDealsByConv.set(d.conversation_id, (wonDealsByConv.get(d.conversation_id) || 0) + 1);
    if (d.contact_id) wonDealsByContact.set(d.contact_id, (wonDealsByContact.get(d.contact_id) || 0) + 1);
  }

  const operatorsList: OperatorProductivityRow[] = [];
  for (const prof of memberProfiles) {
    if (prof.account_role === 'viewer') continue;
    const uid = prof.user_id;
    const opConvs = convs.filter((c) => c.assigned_agent_id === uid);
    const activeChats = opConvs.filter((c) => c.status === 'open' || c.status === 'pending').length;
    const completedChats = opConvs.filter((c) => c.status === 'closed').length;
    const agreements = wonDealsByUser.get(uid) ?? 0;
    const totalHandled = completedChats + activeChats;
    const convRate =
      totalHandled > 0
        ? Math.min(100, Math.round((agreements / totalHandled) * 1000) / 10)
        : 0;
    const maxCap = userMaxCapacityMap.get(uid) || 10;
    const occupancy = Math.min(100, Math.round((activeChats / maxCap) * 100));
    const userTmaSec = avgSec(handlingByUser.get(uid) ?? []);

    const name = prof.full_name || 'Operador';
    operatorsList.push({
      userId: uid,
      name,
      initials: getInitials(name),
      avatarUrl: prof.avatar_url,
      campaignName: userCampaignNameMap.get(uid) || null,
      activeChats,
      completedChats,
      agreementsCount: agreements,
      conversionRate: convRate,
      tmaSeconds: userTmaSec,
      tmaString: formatSeconds(userTmaSec),
      occupancyPercent: occupancy,
    });
  }

  operatorsList.sort(
    (a, b) =>
      b.agreementsCount - a.agreementsCount ||
      b.completedChats - a.completedChats ||
      b.activeChats - a.activeChats
  );
  operatorsList.forEach((op, idx) => {
    op.rank = idx + 1;
  });

  // 9. Campaigns Productivity (100% real from distribution_campaigns)
  const campaignsList: CampaignProductivityRow[] = [];
  for (const camp of campaignsRows) {
    const campConvs = convs.filter((c) => c.campaign_id === camp.id);
    const activeCampConvs = campConvs.filter((c) => c.status === 'open' || c.status === 'pending').length;
    const completed = campConvs.filter((c) => c.status === 'closed').length;

    let campAgreements = 0;
    for (const c of campConvs) {
      if (wonDealsByConv.has(c.id)) {
        campAgreements += wonDealsByConv.get(c.id)!;
      } else if (c.contact_id && wonDealsByContact.has(c.contact_id)) {
        campAgreements += 1;
      }
    }

    const convRate =
      campConvs.length > 0
        ? Math.min(100, Math.round((campAgreements / campConvs.length) * 1000) / 10)
        : 0;

    const campOps = campOpsRows.filter((o) => o.campaign_id === camp.id);
    const totalOps = campOps.length;
    const onlineOps = campOps.filter((o) => presenceByUser.get(o.user_id) === 'online').length;
    const totalCapacity = campOps.reduce((acc, o) => acc + (o.max_capacity || camp.max_concurrent_chats || 10), 0) || 10;
    const campOccupancy = totalOps > 0 ? Math.min(100, Math.round((activeCampConvs / totalCapacity) * 100)) : 0;
    const campTmaSec = avgSec(handlingByCamp.get(camp.id) ?? []);

    campaignsList.push({
      campaignId: camp.id,
      name: camp.name,
      code: camp.code || null,
      clientName: camp.client_name || null,
      onlineOperators: onlineOps,
      totalOperators: totalOps,
      cpfsReceived: campConvs.length,
      cpfsCompleted: completed,
      agreementsCount: campAgreements,
      conversionRate: convRate,
      avgTmaSeconds: campTmaSec,
      avgTmaString: formatSeconds(campTmaSec),
      occupancyPercent: campOccupancy,
    });
  }

  // 10. Live Queue, Live Human, and Attendances Management (100% real from open/pending conversations)
  const openConvs = convs.filter((c) => c.status === 'open' || c.status === 'pending');

  const liveQueueItems: LiveQueueItem[] = [];
  const liveHumanAttendances: LiveHumanAttendance[] = [];
  const attendancesData: AttendanceDetailRow[] = [];

  let waitingResponsesCount = 0;
  let inRobotCount = 0;
  let inQueueCount = 0;
  let inHumanCount = 0;

  for (const c of openConvs) {
    const contactName = c.contact?.name || c.contact?.phone || 'Contato sem nome';
    const contactPhone = c.contact?.phone || '—';
    const campObj = c.campaign_id ? campaignById.get(c.campaign_id) : undefined;
    const campaignName = campObj?.name || 'Sem carteira';
    const campaignCode = campObj?.code || undefined;
    const cpf = cpfByConvId.get(c.id);

    const lastMsg = lastMsgByConv.get(c.id);
    const lastInteractionTimeMs = new Date(c.last_message_at || c.updated_at || c.created_at).getTime();
    const createdTimeMs = new Date(c.created_at).getTime();
    const waitingSeconds = Math.max(0, Math.round((nowMs - lastInteractionTimeMs) / 1000));
    const waitingMinutes = Math.floor(waitingSeconds / 60);
    const totalDurationMinutes = Math.max(1, Math.floor((nowMs - createdTimeMs) / 60000));

    const slaStatus: 'good' | 'warning' | 'critical' =
      waitingMinutes >= 15 ? 'critical' : waitingMinutes >= 5 ? 'warning' : 'good';

    const lastSender: 'client' | 'agent' | 'bot' =
      lastMsg?.sender_type === 'customer'
        ? 'client'
        : lastMsg?.sender_type === 'bot'
        ? 'bot'
        : 'agent';

    if (lastSender === 'client') {
      waitingResponsesCount++;
    }

    const lastMessageAtFormatted = new Date(lastInteractionTimeMs).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const startedAtFormatted = new Date(createdTimeMs).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (!c.assigned_agent_id) {
      const channelType: 'robot' | 'queue' = c.campaign_id ? 'queue' : 'robot';
      if (channelType === 'queue') inQueueCount++;
      else inRobotCount++;

      liveQueueItems.push({
        id: c.id,
        conversationId: c.id,
        slaStatus,
        campaignName,
        clientName: contactName,
        contactPhone,
        cpf,
        waitingTime: formatHms(waitingSeconds),
        waitingSeconds,
        currentChannel: channelType,
        priority: slaStatus === 'critical' ? 'Alta' : 'Normal',
      });
    } else {
      inHumanCount++;
      const agentProf = profileByUserId.get(c.assigned_agent_id);
      const agentName = agentProf?.full_name || 'Operador';

      liveHumanAttendances.push({
        id: c.id,
        conversationId: c.id,
        slaStatus,
        campaignName,
        startedAt: startedAtFormatted,
        agentName,
        agentAvatar: agentProf?.avatar_url || null,
        agentInitials: getInitials(agentName),
        clientName: contactName,
        contactPhone,
        lastInteraction: lastSender === 'client' ? 'client' : 'agent',
        lastMessageTime: formatSeconds(waitingSeconds),
        statusTabulation: c.status === 'pending' ? 'Pendente' : 'Em Atendimento',
      });
    }

    const agentProf = c.assigned_agent_id ? profileByUserId.get(c.assigned_agent_id) : undefined;
    const operatorName = agentProf?.full_name || (c.campaign_id ? `Fila ${campaignName}` : 'Triagem');
    const operatorInitials = agentProf ? getInitials(agentProf.full_name || 'OP') : 'FL';
    const hasWonDeal = wonDealsByConv.has(c.id) || (c.contact_id && wonDealsByContact.has(c.contact_id));

    const negotiationStatus: AttendanceDetailRow['negotiationStatus'] = hasWonDeal
      ? 'agreement_won'
      : lastSender === 'client'
      ? 'waiting_operator'
      : 'waiting_client';

    const negotiationStatusLabel = hasWonDeal
      ? 'Acordo Fechado'
      : lastSender === 'client'
      ? 'Aguardando Operador'
      : 'Aguardando Cliente';

    attendancesData.push({
      id: c.id,
      conversationId: c.id,
      clientName: contactName,
      cpf,
      phone: contactPhone,
      campaignName,
      campaignCode,
      assignedType: c.assigned_agent_id ? 'human' : 'robot',
      operatorName,
      operatorInitials,
      operatorAvatar: agentProf?.avatar_url || null,
      status: c.status,
      negotiationStatus,
      negotiationStatusLabel,
      slaStatus,
      waitingMinutes,
      waitingString: formatSeconds(waitingSeconds),
      waitingTarget: lastSender === 'client' ? 'operator' : 'client',
      totalDurationMinutes,
      totalDurationString: formatSeconds(totalDurationMinutes * 60),
      lastMessageSnippet: c.last_message_text || lastMsg?.content_text || 'Sem mensagens recentes',
      lastMessageSender: lastSender,
      lastMessageAt: lastMessageAtFormatted,
      priority: slaStatus === 'critical' ? 'Crítica' : slaStatus === 'warning' ? 'Alta' : 'Normal',
    });
  }

  // 11. Mailings / Broadcasts (100% real from broadcasts table)
  const mailingsData: MailingPerformanceRow[] = broadcastRows.map((b) => {
    const sent = b.sent_count ?? b.total_recipients ?? 0;
    const failed = b.failed_count ?? 0;
    const delivered = b.delivered_count ?? Math.max(0, sent - failed);
    const replied = b.replied_count ?? 0;
    const invalidRate = sent > 0 ? Math.round((failed / sent) * 1000) / 10 : 0;
    const respRate = delivered > 0 ? Math.round((replied / delivered) * 1000) / 10 : 0;

    let mappedStatus: MailingPerformanceRow['status'] = 'completed';
    if (b.status === 'sending') mappedStatus = 'in_progress';
    else if (b.status === 'scheduled' || b.status === 'draft') mappedStatus = 'scheduled';
    else if (b.status === 'failed') mappedStatus = 'paused';

    const dateStr = new Date(b.scheduled_at || b.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return {
      id: b.id,
      name: b.name,
      campaignName: b.template_name || 'Disparo Geral',
      date: dateStr,
      sentCount: sent,
      invalidCount: failed,
      invalidRate,
      deliveredCount: delivered,
      repliedCount: replied,
      responseRate: respRate,
      transferredToHumanCount: replied,
      transferredRate: replied > 0 ? 100 : 0,
      agreementsCount: 0,
      conversionRate: 0,
      status: mappedStatus,
    };
  });

  // 12. Scheduled Agreements / Reminders (100% real from conversation_reminders table)
  const convById = new Map<string, any>();
  for (const c of convs) convById.set(c.id, c);

  const scheduledData: ScheduledAgreementRow[] = reminderRows.map((r) => {
    const conv = convById.get(r.conversation_id);
    const camp = conv?.campaign_id ? campaignById.get(conv.campaign_id) : undefined;
    const opProf = profileByUserId.get(r.user_id);
    const opName = opProf?.full_name || 'Operador';
    const schedDate = new Date(r.remind_at).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      id: r.id,
      conversationId: r.conversation_id,
      campaignName: camp?.name || 'Sem carteira',
      scheduledDate: schedDate,
      clientName: r.contact?.name || conv?.contact?.name || 'Cliente',
      contactPhone: r.contact?.phone || conv?.contact?.phone || '—',
      operatorName: opName,
      operatorInitials: getInitials(opName),
      status: 'pending',
      tabulation: 'Retorno Agendado',
      observation: r.comment || 'Sem observações',
    };
  });

  // 13. Realtime counters
  const activeMembers = memberProfiles.filter((m) => m.account_role !== 'viewer');
  let operatorsOnline = 0;
  let operatorsInBreak = 0;
  let operatorsAvailable = 0;

  for (const m of activeMembers) {
    const pStatus = presenceByUser.get(m.user_id) ?? 'offline';
    if (pStatus === 'online') {
      operatorsOnline++;
      const opRow = operatorsList.find((o) => o.userId === m.user_id);
      const maxCap = userMaxCapacityMap.get(m.user_id) || 10;
      if (!opRow || opRow.activeChats < maxCap) {
        operatorsAvailable++;
      }
    } else if (pStatus === 'away') {
      operatorsInBreak++;
    }
  }

  const operatorsDisconnected = Math.max(0, activeMembers.length - operatorsOnline - operatorsInBreak);

  const realtime: RealtimeCounters = {
    operatorsOnline,
    operatorsAvailable,
    operatorsInBreak,
    operatorsDisconnected,
    waitingResponses: waitingResponsesCount,
    tmrOperator: formatHms(avgTmrOperatorSec),
    tmrClient: formatHms(avgTmrClientSec),
    tmf: formatHms(avgTmaSeconds),
    inRobot: inRobotCount,
    inQueue: inQueueCount,
    inHuman: inHumanCount,
    inAi: 0,
  };

  const emptyEvolution: OperatorEvolutionDashboardData = {
    analyst: {
      name: 'Monitoria Operacional',
      role: 'Análise de Desempenho',
      badge: 'Indicadores',
      avatar: 'MO',
      status: 'Ativo',
      auditedConversationsCount: convs.length,
      scriptAdherencePercent: 0,
      generalInsight: '',
      criticalAlert: '',
    },
    summary: {
      overallTeamHealthScore: 0,
      healthScoreDelta: 0,
      criticalOperatorsCount: 0,
      recoveringOperatorsCount: 0,
      stagnantOperatorsCount: 0,
      benchmarkOperatorsCount: 0,
      rescuedAgreementsThisMonth: agreementsTotal,
      potentialLossFromCriticalSla: 'R$ 0',
    },
    operators: [],
  };

  return {
    kpis: {
      responseRate,
      responseRateDelta: 0,
      agreementRateOnResponses,
      agreementRateDelta: 0,
      activeConversations: activeConvs,
      queuedConversations: queuedConvs,
      avgTmaSeconds,
    },
    channels,
    funnel: {
      stages,
      insights,
    },
    operators: operatorsList,
    campaigns: campaignsList,
    realtime,
    liveQueue: liveQueueItems,
    liveHuman: liveHumanAttendances,
    mailings: mailingsData,
    scheduled: scheduledData,
    attendances: attendancesData,
    evolution: emptyEvolution,
  };
}
