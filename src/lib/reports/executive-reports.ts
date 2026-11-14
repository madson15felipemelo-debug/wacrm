import type { SupabaseClient } from '@supabase/supabase-js'
import { formatSeconds } from '@/lib/dashboard/operational-queries'

export interface ExecutiveDailyRow {
  dateKey: string
  dateLabel: string
  broadcastSent: number
  inboundReplies: number
  activeConversations: number
  retainedAutoCount: number
  humanAttendedCount: number
  avgWaitTmeSec: number
  avgWaitTmeLabel: string
  avgOperatorTmrSec: number
  avgOperatorTmrLabel: string
  closedCount: number
  positiveOutcomesCount: number
}

export interface TmrAbandonmentBucket {
  id: string
  bucketLabel: string
  rangeBadge: string
  tone: 'success' | 'info' | 'warning' | 'danger'
  conversationsCount: number
  continuedCount: number
  continuedPercent: number
  abandonedCount: number
  abandonedPercent: number
  positiveOutcomeCount: number
  positiveOutcomePercent: number
}

export interface ActionFunnelStage {
  step: number
  label: string
  count: number
  percentOfTop: number
  conversionFromPrev: number
}

export interface ReactionTimeBucket {
  label: string
  sublabel: string
  count: number
  percent: number
}

export interface CampaignComparisonRow {
  campaignId: string
  campaignName: string
  clientOrCreditor: string
  operatorsCount: number
  cpfsTriaged: number
  totalConversations: number
  autoRetainedPercent: number
  avgTmeLabel: string
  avgTmrLabel: string
  promisesCount: number
  agreementsCount: number
  positiveConversionPercent: number
}

export interface ChannelEfficiencyRow {
  channelKey: string
  channelLabel: string
  badgeTone: 'success' | 'primary' | 'info' | 'warning'
  conversationsCount: number
  sharePercent: number
  avgMessagesCount: number
  avgDurationLabel: string
  closedCount: number
  positiveOutcomesCount: number
  positiveRatePercent: number
}

export interface FlowEfficiencyRow {
  flowId: string
  flowName: string
  totalRuns: number
  completedInBot: number
  handedOffToHuman: number
  timedOutOrFailed: number
  retentionPercent: number
  topStopNode: string
}

export interface TabulationMatrixRow {
  tabulation: string
  categoryTone: 'success' | 'primary' | 'warning' | 'danger' | 'info' | 'neutral'
  count: number
  sharePercent: number
  closedByOperator: number
  closedByAuto: number
  openOrWaiting: number
  topOperatorName: string
}

export interface ExecutiveReportData {
  generatedAt: string
  startDate: string
  endDate: string
  kpis: {
    totalBroadcastSent: number
    broadcastDeliveryRate: number
    broadcastReplyRate: number
    totalConversations: number
    autoRetentionRate: number
    avgWaitTmeLabel: string
    avgOperatorTmrLabel: string
    positiveOutcomesTotal: number
    positiveOutcomeRate: number
  }
  dailySeries: ExecutiveDailyRow[]
  tmrCorrelation: TmrAbandonmentBucket[]
  actionFunnel: ActionFunnelStage[]
  reactionTimes: ReactionTimeBucket[]
  campaignsComparison: CampaignComparisonRow[]
  channelsEfficiency: ChannelEfficiencyRow[]
  flowsEfficiency: FlowEfficiencyRow[]
  tabulationMatrix: TabulationMatrixRow[]
}

function avgSec(arr: number[]): number {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function safePct(num: number, den: number): number {
  if (den <= 0) return 0
  return Math.min(100, Math.round((num / den) * 1000) / 10)
}

function toLocalDayKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayKeyBR(dayKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return dayKey
  const [y, m, d] = dayKey.split('-')
  return `${d}/${m}/${y}`
}

export async function generateExecutiveReport(
  db: SupabaseClient,
  params: {
    startDate: string
    endDate: string
    campaignId?: string
  }
): Promise<ExecutiveReportData> {
  const { startDate, endDate, campaignId } = params
  const startIso = new Date(`${startDate}T00:00:00`).toISOString()
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString()

  const [
    profilesRes,
    campaignsRes,
    campOpsRes,
    stagesRes,
    flowsRes,
    convsRes,
    msgsRes,
    dealsRes,
    remindersRes,
    flowRunsRes,
    auditsRes,
    broadcastsRes,
    recipsRes,
  ] = await Promise.all([
    db.from('profiles').select('user_id, full_name, account_role'),
    db.from('distribution_campaigns').select('id, name, code, client_name'),
    db.from('campaign_operators').select('campaign_id, user_id'),
    db.from('pipeline_stages').select('id, name'),
    db.from('flows').select('id, name'),
    db
      .from('conversations')
      .select(
        'id, contact_id, status, assigned_agent_id, campaign_id, last_message_from, last_message_at, ai_reply_count, ai_handoff_summary, created_at, updated_at, contact:contacts(id, name, phone, opted_out_at, contact_tags(tags(id, name)))'
      )
      .gte('updated_at', startIso)
      .lte('updated_at', endIso)
      .order('updated_at', { ascending: false })
      .limit(1000),
    db
      .from('messages')
      .select('id, conversation_id, sender_type, sender_id, ai_generated, created_at')
      .gte('created_at', new Date(new Date(startIso).getTime() - 86400000 * 2).toISOString())
      .lte('created_at', endIso)
      .order('created_at', { ascending: true }),
    db
      .from('deals')
      .select('id, contact_id, conversation_id, status, stage_id, user_id, assigned_to, created_at, updated_at')
      .gte('updated_at', startIso)
      .lte('updated_at', endIso),
    db
      .from('conversation_reminders')
      .select('id, conversation_id, contact_id, user_id, remind_at, done_at, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    db
      .from('flow_runs')
      .select('id, flow_id, conversation_id, contact_id, status, current_node_key, started_at, ended_at')
      .gte('started_at', startIso)
      .lte('started_at', endIso),
    db
      .from('distribution_audit_logs')
      .select('id, conversation_id, cpf, campaign_id, assigned_agent_id, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    db
      .from('broadcasts')
      .select('id, name, total_recipients, sent_count, delivered_count, read_count, replied_count, failed_count, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso),
    db
      .from('broadcast_recipients')
      .select('id, status, sent_at, delivered_at, read_at, replied_at, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .limit(1500),
  ])

  const profileMap = new Map<string, string>()
  for (const p of (profilesRes.data ?? []) as any[]) {
    profileMap.set(p.user_id, p.full_name || 'Operador')
  }

  const campaignsList = (campaignsRes.data ?? []) as any[]
  const campaignMap = new Map<string, { id: string; name: string; client_name?: string }>()
  for (const c of campaignsList) {
    campaignMap.set(c.id, c)
  }

  const campOpsList = (campOpsRes.data ?? []) as any[]
  const userCampaignMap = new Map<string, string>()
  const opsCountByCamp = new Map<string, number>()
  for (const co of campOpsList) {
    opsCountByCamp.set(co.campaign_id, (opsCountByCamp.get(co.campaign_id) || 0) + 1)
    if (!userCampaignMap.has(co.user_id)) {
      userCampaignMap.set(co.user_id, co.campaign_id)
    }
  }

  const stageMap = new Map<string, string>()
  for (const s of (stagesRes.data ?? []) as any[]) {
    stageMap.set(s.id, s.name)
  }

  const flowNameMap = new Map<string, string>()
  for (const f of (flowsRes.data ?? []) as any[]) {
    flowNameMap.set(f.id, f.name)
  }

  const allConvs = ((convsRes.data ?? []) as any[]).filter((c) => {
    if (!campaignId || campaignId === 'all') return true
    const effectiveCamp = c.campaign_id || (c.assigned_agent_id ? userCampaignMap.get(c.assigned_agent_id) : undefined)
    return effectiveCamp === campaignId
  })

  const allMsgs = (msgsRes.data ?? []) as any[]
  const msgsByConv = new Map<string, any[]>()
  for (const m of allMsgs) {
    const list = msgsByConv.get(m.conversation_id)
    if (list) list.push(m)
    else msgsByConv.set(m.conversation_id, [m])
  }

  const dealsList = (dealsRes.data ?? []) as any[]
  const dealByConv = new Map<string, any>()
  const dealByContact = new Map<string, any>()
  for (const d of dealsList) {
    if (d.conversation_id && !dealByConv.has(d.conversation_id)) dealByConv.set(d.conversation_id, d)
    if (d.contact_id && !dealByContact.has(d.contact_id)) dealByContact.set(d.contact_id, d)
  }

  const remindersList = (remindersRes.data ?? []) as any[]
  const reminderByConv = new Map<string, any>()
  for (const r of remindersList) {
    if (r.conversation_id && !reminderByConv.has(r.conversation_id)) reminderByConv.set(r.conversation_id, r)
  }

  const flowRunsList = (flowRunsRes.data ?? []) as any[]
  const flowRunByConv = new Map<string, any>()
  for (const fr of flowRunsList) {
    if (fr.conversation_id && !flowRunByConv.has(fr.conversation_id)) flowRunByConv.set(fr.conversation_id, fr)
  }

  // Analyze each conversation
  interface ConvTelemetry {
    conv: any
    effectiveCampaignId: string
    humanMsgs: number
    botMsgs: number
    aiMsgs: number
    customerMsgs: number
    usedBot: boolean
    usedAi: boolean
    usedHuman: boolean
    waitFirstHumanSec: number
    operatorTmrSec: number
    totalDurationSec: number
    customerContinuedAfterFirstHuman: boolean
    isPositiveOutcome: boolean
    isAgreementWon: boolean
    isPromiseScheduled: boolean
    tabulationName: string
    tabulationTone: 'success' | 'primary' | 'warning' | 'danger' | 'info' | 'neutral'
    closedByRole: 'operator' | 'auto' | 'open'
    operatorName: string
  }

  const telemetryList: ConvTelemetry[] = []
  const globalWaitList: number[] = []
  const globalTmrList: number[] = []

  for (const c of allConvs) {
    const cMsgs = msgsByConv.get(c.id) ?? []
    let humanMsgs = 0
    let botMsgs = 0
    let aiMsgs = 0
    let customerMsgs = 0

    let firstCustomerTs: number | null = null
    let firstHumanReplyTs: number | null = null
    let customerRepliedAfterHuman = false
    const opTmrDiffs: number[] = []
    let lastCustomerTurnTs: number | null = null

    for (const m of cMsgs) {
      const ts = new Date(m.created_at).getTime()
      if (m.sender_type === 'customer') {
        customerMsgs++
        if (firstCustomerTs === null) firstCustomerTs = ts
        if (firstHumanReplyTs !== null && ts > firstHumanReplyTs) {
          customerRepliedAfterHuman = true
        }
        lastCustomerTurnTs = ts
      } else if (m.sender_type === 'agent') {
        humanMsgs++
        if (firstCustomerTs !== null && firstHumanReplyTs === null && ts >= firstCustomerTs) {
          firstHumanReplyTs = ts
        }
        if (lastCustomerTurnTs !== null && ts >= lastCustomerTurnTs && ts - lastCustomerTurnTs < 86400000) {
          opTmrDiffs.push((ts - lastCustomerTurnTs) / 1000)
          lastCustomerTurnTs = null
        }
      } else {
        if (m.ai_generated) aiMsgs++
        else botMsgs++
      }
    }

    if ((c.ai_reply_count || 0) > aiMsgs) {
      aiMsgs = Number(c.ai_reply_count || 0)
    }

    const usedBot = botMsgs > 0 || flowRunByConv.has(c.id)
    const usedAi = aiMsgs > 0 || Boolean(c.ai_handoff_summary)
    const usedHuman = humanMsgs > 0 || Boolean(c.assigned_agent_id)

    const waitFirstHumanSec =
      firstCustomerTs !== null && firstHumanReplyTs !== null
        ? Math.max(0, Math.round((firstHumanReplyTs - firstCustomerTs) / 1000))
        : 0

    const operatorTmrSec = avgSec(opTmrDiffs)
    if (waitFirstHumanSec > 0) globalWaitList.push(waitFirstHumanSec)
    if (operatorTmrSec > 0) globalTmrList.push(operatorTmrSec)

    const startMs = new Date(c.created_at).getTime()
    const endMs = new Date(c.last_message_at || c.updated_at || c.created_at).getTime()
    const totalDurationSec = Math.max(0, Math.round((endMs - startMs) / 1000))

    const deal = dealByConv.get(c.id) || dealByContact.get(c.contact_id)
    const reminder = reminderByConv.get(c.id)
    const flowRun = flowRunByConv.get(c.id)
    const isOptedOut = Boolean(c.contact?.opted_out_at)
    const tags: string[] = (c.contact?.contact_tags ?? [])
      .map((ct: any) => ct?.tags?.name)
      .filter(Boolean)

    const isAgreementWon = deal?.status === 'won'
    const isPromiseScheduled = Boolean(reminder && !reminder.done_at)
    const isPositiveOutcome = isAgreementWon || isPromiseScheduled

    let tabulationName = 'Em Atendimento / Sem Tabulação'
    let tabulationTone: 'success' | 'primary' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral'

    if (isAgreementWon) {
      tabulationName = 'Acordo Fechado'
      tabulationTone = 'success'
    } else if (isPromiseScheduled) {
      tabulationName = 'Promessa / Retorno Agendado'
      tabulationTone = 'warning'
    } else if (deal?.status === 'lost') {
      tabulationName = 'Recusa / Negócio Perdido'
      tabulationTone = 'danger'
    } else if (isOptedOut) {
      tabulationName = 'Opt-out / Bloqueio Solicitado'
      tabulationTone = 'danger'
    } else if (tags.length > 0) {
      tabulationName = `Etiqueta: ${tags[0]}`
      tabulationTone = 'primary'
    } else if (deal?.stage_id) {
      tabulationName = `Funil: ${stageMap.get(deal.stage_id) || 'Em Negociação'}`
      tabulationTone = 'info'
    } else if (flowRun?.status === 'completed' || (c.status === 'closed' && !usedHuman && (usedBot || usedAi))) {
      tabulationName = 'Resolvido no Automático (Robô/IA)'
      tabulationTone = 'info'
    } else if (c.status === 'closed') {
      tabulationName = 'Finalizado Sem Tabulação'
      tabulationTone = 'neutral'
    }

    const closedByRole: 'operator' | 'auto' | 'open' =
      c.status !== 'closed'
        ? 'open'
        : usedHuman
          ? 'operator'
          : 'auto'

    const effectiveCampaignId =
      c.campaign_id || (c.assigned_agent_id ? userCampaignMap.get(c.assigned_agent_id) || 'unassigned' : 'unassigned')

    const operatorName = c.assigned_agent_id
      ? profileMap.get(c.assigned_agent_id) || 'Operador'
      : usedAi
        ? 'Agente de IA'
        : usedBot
          ? 'Robô de Fluxo'
          : 'Fila Geral'

    telemetryList.push({
      conv: c,
      effectiveCampaignId,
      humanMsgs,
      botMsgs,
      aiMsgs,
      customerMsgs,
      usedBot,
      usedAi,
      usedHuman,
      waitFirstHumanSec,
      operatorTmrSec,
      totalDurationSec,
      customerContinuedAfterFirstHuman: customerRepliedAfterHuman || isPositiveOutcome,
      isPositiveOutcome,
      isAgreementWon,
      isPromiseScheduled,
      tabulationName,
      tabulationTone,
      closedByRole,
      operatorName,
    })
  }

  // =========================================================================
  // BLOCO 1: SÉRIE DIÁRIA (FECHAMENTO DIA A DIA)
  // =========================================================================
  const dailyMap = new Map<
    string,
    {
      broadcastSent: number
      inboundReplies: number
      activeConvs: Set<string>
      retainedAutoConvs: Set<string>
      humanConvs: Set<string>
      waitSecs: number[]
      tmrSecs: number[]
      closedConvs: number
      positiveOutcomes: number
    }
  >()

  const ensureDay = (dayKey: string) => {
    let d = dailyMap.get(dayKey)
    if (!d) {
      d = {
        broadcastSent: 0,
        inboundReplies: 0,
        activeConvs: new Set(),
        retainedAutoConvs: new Set(),
        humanConvs: new Set(),
        waitSecs: [],
        tmrSecs: [],
        closedConvs: 0,
        positiveOutcomes: 0,
      }
      dailyMap.set(dayKey, d)
    }
    return d
  }

  for (const b of (broadcastsRes.data ?? []) as any[]) {
    const day = ensureDay(toLocalDayKey(b.created_at))
    day.broadcastSent += Number(b.sent_count || 0)
  }

  for (const m of allMsgs) {
    if (m.created_at < startIso) continue
    const day = ensureDay(toLocalDayKey(m.created_at))
    if (m.sender_type === 'customer') {
      day.inboundReplies++
    }
  }

  for (const t of telemetryList) {
    const dayKey = toLocalDayKey(t.conv.last_message_at || t.conv.updated_at || t.conv.created_at)
    const day = ensureDay(dayKey)
    day.activeConvs.add(t.conv.id)
    if (t.usedHuman) day.humanConvs.add(t.conv.id)
    else if (t.usedBot || t.usedAi) day.retainedAutoConvs.add(t.conv.id)

    if (t.waitFirstHumanSec > 0) day.waitSecs.push(t.waitFirstHumanSec)
    if (t.operatorTmrSec > 0) day.tmrSecs.push(t.operatorTmrSec)
    if (t.conv.status === 'closed') day.closedConvs++
    if (t.isPositiveOutcome) day.positiveOutcomes++
  }

  const dailySeries: ExecutiveDailyRow[] = Array.from(dailyMap.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((dayKey) => {
      const d = dailyMap.get(dayKey)!
      const wSec = avgSec(d.waitSecs)
      const rSec = avgSec(d.tmrSecs)
      return {
        dateKey: dayKey,
        dateLabel: formatDayKeyBR(dayKey),
        broadcastSent: d.broadcastSent,
        inboundReplies: d.inboundReplies,
        activeConversations: d.activeConvs.size,
        retainedAutoCount: d.retainedAutoConvs.size,
        humanAttendedCount: d.humanConvs.size,
        avgWaitTmeSec: wSec,
        avgWaitTmeLabel: wSec > 0 ? formatSeconds(wSec) : '—',
        avgOperatorTmrSec: rSec,
        avgOperatorTmrLabel: rSec > 0 ? formatSeconds(rSec) : '—',
        closedCount: d.closedConvs,
        positiveOutcomesCount: d.positiveOutcomes,
      }
    })

  // =========================================================================
  // BLOCO 2A: CORRELAÇÃO TMR / ESPERA × ABANDONO DO DEVEDOR
  // =========================================================================
  const bucketDefs: {
    id: string
    label: string
    badge: string
    tone: 'success' | 'info' | 'warning' | 'danger'
    minSec: number
    maxSec: number
  }[] = [
    {
      id: 'fast_3m',
      label: 'Resposta Rápida (Até 3 min)',
      badge: '0 – 3 min',
      tone: 'success',
      minSec: 1,
      maxSec: 180,
    },
    {
      id: 'moderate_10m',
      label: 'SLA Moderado (3 a 10 min)',
      badge: '3 – 10 min',
      tone: 'info',
      minSec: 181,
      maxSec: 600,
    },
    {
      id: 'slow_30m',
      label: 'Espera Elevada (10 a 30 min)',
      badge: '10 – 30 min',
      tone: 'warning',
      minSec: 601,
      maxSec: 1800,
    },
    {
      id: 'critical_over_30m',
      label: 'Fila Crítica (Acima de 30 min)',
      badge: '> 30 min',
      tone: 'danger',
      minSec: 1801,
      maxSec: Infinity,
    },
  ]

  const tmrCorrelation: TmrAbandonmentBucket[] = bucketDefs.map((b) => {
    const matching = telemetryList.filter((t) => {
      const refSec = t.operatorTmrSec > 0 ? t.operatorTmrSec : t.waitFirstHumanSec
      return refSec >= b.minSec && refSec <= b.maxSec
    })
    const total = matching.length
    const continued = matching.filter((t) => t.customerContinuedAfterFirstHuman).length
    const abandoned = Math.max(0, total - continued)
    const positive = matching.filter((t) => t.isPositiveOutcome).length

    return {
      id: b.id,
      bucketLabel: b.label,
      rangeBadge: b.badge,
      tone: b.tone,
      conversationsCount: total,
      continuedCount: continued,
      continuedPercent: safePct(continued, total),
      abandonedCount: abandoned,
      abandonedPercent: safePct(abandoned, total),
      positiveOutcomeCount: positive,
      positiveOutcomePercent: safePct(positive, total),
    }
  })

  // =========================================================================
  // BLOCO 2B: FUNIL DE MATURAÇÃO DA AÇÃO & TEMPO DE REAÇÃO PÓS-DISPARO
  // =========================================================================
  const broadcastsList = (broadcastsRes.data ?? []) as any[]
  const recipsList = (recipsRes.data ?? []) as any[]

  const totalSent = Math.max(
    broadcastsList.reduce((acc, b) => acc + Number(b.sent_count || 0), 0),
    recipsList.length
  )
  const totalDelivered = Math.max(
    broadcastsList.reduce((acc, b) => acc + Number(b.delivered_count || 0), 0),
    recipsList.filter((r) => ['delivered', 'read', 'replied'].includes(r.status)).length
  )
  const totalRead = Math.max(
    broadcastsList.reduce((acc, b) => acc + Number(b.read_count || 0), 0),
    recipsList.filter((r) => ['read', 'replied'].includes(r.status) || r.read_at).length
  )
  const totalReplied = Math.max(
    broadcastsList.reduce((acc, b) => acc + Number(b.replied_count || 0), 0),
    telemetryList.filter((t) => t.customerMsgs > 0).length
  )
  const totalTriagedAuto = telemetryList.filter((t) => t.usedBot || t.usedAi).length
  const totalHumanAttended = telemetryList.filter((t) => t.usedHuman).length
  const totalPositiveOutcomes = telemetryList.filter((t) => t.isPositiveOutcome).length

  const funnelTop = Math.max(totalSent, telemetryList.length, 1)
  const rawSteps = [
    { step: 1, label: 'Disparos / Acionamentos Enviados', count: totalSent || telemetryList.length },
    { step: 2, label: 'Entregues no Aparelho (Meta)', count: totalDelivered || telemetryList.length },
    { step: 3, label: 'Visualizados pelo Devedor (Lidos)', count: totalRead },
    { step: 4, label: 'Devedores que Responderam', count: totalReplied },
    { step: 5, label: 'Triados por Robô / Agente de IA', count: totalTriagedAuto },
    { step: 6, label: 'Atendidos por Operador Humano', count: totalHumanAttended },
    { step: 7, label: 'Desfecho Positivo (Acordo / Promessa)', count: totalPositiveOutcomes },
  ]

  const actionFunnel: ActionFunnelStage[] = rawSteps.map((s, idx) => {
    const prevCount = idx === 0 ? s.count : rawSteps[idx - 1].count
    return {
      step: s.step,
      label: s.label,
      count: s.count,
      percentOfTop: safePct(s.count, funnelTop),
      conversionFromPrev: idx === 0 ? 100 : safePct(s.count, Math.max(prevCount, s.count)),
    }
  })

  // Reaction time after broadcast send
  let react15m = 0
  let react60m = 0
  let react4h = 0
  let reactLong = 0

  for (const r of recipsList) {
    if (!r.sent_at || !r.replied_at) continue
    const diffMin = (new Date(r.replied_at).getTime() - new Date(r.sent_at).getTime()) / 60000
    if (diffMin < 0) continue
    if (diffMin <= 15) react15m++
    else if (diffMin <= 60) react60m++
    else if (diffMin <= 240) react4h++
    else reactLong++
  }

  const totalReactMeasured = react15m + react60m + react4h + reactLong
  const reactionTimes: ReactionTimeBucket[] = [
    {
      label: 'Imediato (0 a 15 min)',
      sublabel: 'Responde logo após o disparo',
      count: react15m,
      percent: safePct(react15m, totalReactMeasured),
    },
    {
      label: 'Rápido (15 a 60 min)',
      sublabel: 'Dentro da 1ª hora pós-envio',
      count: react60m,
      percent: safePct(react60m, totalReactMeasured),
    },
    {
      label: 'Mesmo Turno (1h a 4h)',
      sublabel: 'Retorno ao longo da tarde',
      count: react4h,
      percent: safePct(react4h, totalReactMeasured),
    },
    {
      label: 'Cauda Longa (> 4h / Dia seg.)',
      sublabel: 'Responde à noite ou no dia seguinte',
      count: reactLong,
      percent: safePct(reactLong, totalReactMeasured),
    },
  ]

  // =========================================================================
  // BLOCO 3: COMPARATIVO CONSOLIDADO POR CARTEIRA / CREDOR
  // =========================================================================
  const auditsList = (auditsRes.data ?? []) as any[]
  const cpfsByCamp = new Map<string, number>()
  for (const a of auditsList) {
    if (a.campaign_id && a.cpf) {
      cpfsByCamp.set(a.campaign_id, (cpfsByCamp.get(a.campaign_id) || 0) + 1)
    }
  }

  const campaignIdsToRender = new Set<string>(campaignsList.map((c) => c.id))
  if (telemetryList.some((t) => t.effectiveCampaignId === 'unassigned')) {
    campaignIdsToRender.add('unassigned')
  }

  const campaignsComparison: CampaignComparisonRow[] = Array.from(campaignIdsToRender)
    .map((cid) => {
      const cMeta = campaignMap.get(cid)
      const cConvs = telemetryList.filter((t) => t.effectiveCampaignId === cid)
      const totalC = cConvs.length
      const autoOnly = cConvs.filter((t) => (t.usedBot || t.usedAi) && !t.usedHuman).length
      const wArr = cConvs.filter((t) => t.waitFirstHumanSec > 0).map((t) => t.waitFirstHumanSec)
      const rArr = cConvs.filter((t) => t.operatorTmrSec > 0).map((t) => t.operatorTmrSec)
      const promises = cConvs.filter((t) => t.isPromiseScheduled).length
      const agreements = cConvs.filter((t) => t.isAgreementWon).length
      const positives = cConvs.filter((t) => t.isPositiveOutcome).length

      return {
        campaignId: cid,
        campaignName: cMeta?.name || 'Geral / Sem Carteira Específica',
        clientOrCreditor: cMeta?.client_name || 'Operação Interna',
        operatorsCount: opsCountByCamp.get(cid) || 0,
        cpfsTriaged: cpfsByCamp.get(cid) || 0,
        totalConversations: totalC,
        autoRetainedPercent: safePct(autoOnly, totalC),
        avgTmeLabel: wArr.length > 0 ? formatSeconds(avgSec(wArr)) : '—',
        avgTmrLabel: rArr.length > 0 ? formatSeconds(avgSec(rArr)) : '—',
        promisesCount: promises,
        agreementsCount: agreements,
        positiveConversionPercent: safePct(positives, totalC),
      }
    })
    .sort((a, b) => b.totalConversations - a.totalConversations)

  // =========================================================================
  // BLOCO 4: EFICIÊNCIA DOS 3 CANAIS (ROBÔ + IA + HUMANO) E FLUXOS
  // =========================================================================
  const totalTel = telemetryList.length
  const channelGroups: {
    key: string
    label: string
    tone: 'success' | 'primary' | 'info' | 'warning'
    filter: (t: ConvTelemetry) => boolean
  }[] = [
    {
      key: 'bot_only',
      label: '100% Retido no Robô (Fluxo)',
      tone: 'success',
      filter: (t) => t.usedBot && !t.usedAi && !t.usedHuman,
    },
    {
      key: 'ai_only',
      label: '100% Retido no Agente de IA',
      tone: 'primary',
      filter: (t) => t.usedAi && !t.usedHuman,
    },
    {
      key: 'hybrid_handoff',
      label: 'Híbrido (Triagem Robô/IA → Operador Humano)',
      tone: 'info',
      filter: (t) => (t.usedBot || t.usedAi) && t.usedHuman,
    },
    {
      key: 'human_direct',
      label: 'Atendimento Direto Operador Humano',
      tone: 'warning',
      filter: (t) => t.usedHuman && !t.usedBot && !t.usedAi,
    },
  ]

  const channelsEfficiency: ChannelEfficiencyRow[] = channelGroups.map((cg) => {
    const items = telemetryList.filter(cg.filter)
    const count = items.length
    const msgAvg =
      count > 0
        ? Math.round(
            items.reduce((acc, i) => acc + i.humanMsgs + i.botMsgs + i.aiMsgs + i.customerMsgs, 0) / count
          )
        : 0
    const durArr = items.filter((i) => i.totalDurationSec > 0).map((i) => i.totalDurationSec)
    const closed = items.filter((i) => i.conv.status === 'closed').length
    const pos = items.filter((i) => i.isPositiveOutcome).length

    return {
      channelKey: cg.key,
      channelLabel: cg.label,
      badgeTone: cg.tone,
      conversationsCount: count,
      sharePercent: safePct(count, totalTel),
      avgMessagesCount: msgAvg,
      avgDurationLabel: durArr.length > 0 ? formatSeconds(avgSec(durArr)) : '—',
      closedCount: closed,
      positiveOutcomesCount: pos,
      positiveRatePercent: safePct(pos, count),
    }
  })

  // Flow breakdown
  const runsByFlow = new Map<string, any[]>()
  for (const fr of flowRunsList) {
    if (!fr.flow_id) continue
    const list = runsByFlow.get(fr.flow_id)
    if (list) list.push(fr)
    else runsByFlow.set(fr.flow_id, [fr])
  }

  const flowsEfficiency: FlowEfficiencyRow[] = Array.from(runsByFlow.entries())
    .map(([fid, runs]) => {
      const total = runs.length
      const completed = runs.filter((r) => r.status === 'completed').length
      const handedOff = runs.filter((r) => r.status === 'handed_off' || r.status === 'paused_by_agent').length
      const timedOut = runs.filter((r) => r.status === 'timed_out' || r.status === 'failed').length

      const nodeFreq = new Map<string, number>()
      for (const r of runs) {
        if (r.current_node_key) {
          nodeFreq.set(r.current_node_key, (nodeFreq.get(r.current_node_key) || 0) + 1)
        }
      }
      let topStopNode = '—'
      let topNodeMax = 0
      for (const [nKey, nCount] of nodeFreq.entries()) {
        if (nCount > topNodeMax) {
          topNodeMax = nCount
          topStopNode = `${nKey} (${nCount}x)`
        }
      }

      return {
        flowId: fid,
        flowName: flowNameMap.get(fid) || 'Fluxo Conversacional',
        totalRuns: total,
        completedInBot: completed,
        handedOffToHuman: handedOff,
        timedOutOrFailed: timedOut,
        retentionPercent: safePct(completed, total),
        topStopNode,
      }
    })
    .sort((a, b) => b.totalRuns - a.totalRuns)

  // =========================================================================
  // BLOCO 5: MATRIZ DE TABULAÇÕES E QUEM ENCERROU
  // =========================================================================
  const tabMap = new Map<
    string,
    {
      tone: 'success' | 'primary' | 'warning' | 'danger' | 'info' | 'neutral'
      count: number
      closedByOperator: number
      closedByAuto: number
      openOrWaiting: number
      opCounts: Map<string, number>
    }
  >()

  for (const t of telemetryList) {
    let entry = tabMap.get(t.tabulationName)
    if (!entry) {
      entry = {
        tone: t.tabulationTone,
        count: 0,
        closedByOperator: 0,
        closedByAuto: 0,
        openOrWaiting: 0,
        opCounts: new Map(),
      }
      tabMap.set(t.tabulationName, entry)
    }
    entry.count++
    if (t.closedByRole === 'operator') entry.closedByOperator++
    else if (t.closedByRole === 'auto') entry.closedByAuto++
    else entry.openOrWaiting++

    if (t.operatorName && t.operatorName !== 'Fila Geral') {
      entry.opCounts.set(t.operatorName, (entry.opCounts.get(t.operatorName) || 0) + 1)
    }
  }

  const tabulationMatrix: TabulationMatrixRow[] = Array.from(tabMap.entries())
    .map(([tabName, info]) => {
      let topOp = '—'
      let maxC = 0
      for (const [opName, c] of info.opCounts.entries()) {
        if (c > maxC) {
          maxC = c
          topOp = `${opName} (${c})`
        }
      }
      return {
        tabulation: tabName,
        categoryTone: info.tone,
        count: info.count,
        sharePercent: safePct(info.count, totalTel),
        closedByOperator: info.closedByOperator,
        closedByAuto: info.closedByAuto,
        openOrWaiting: info.openOrWaiting,
        topOperatorName: topOp,
      }
    })
    .sort((a, b) => b.count - a.count)

  const autoRetainedTotal = telemetryList.filter((t) => (t.usedBot || t.usedAi) && !t.usedHuman).length

  return {
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    kpis: {
      totalBroadcastSent: totalSent,
      broadcastDeliveryRate: safePct(totalDelivered, totalSent),
      broadcastReplyRate: safePct(totalReplied, Math.max(totalDelivered, totalSent)),
      totalConversations: totalTel,
      autoRetentionRate: safePct(autoRetainedTotal, totalTel),
      avgWaitTmeLabel: globalWaitList.length > 0 ? formatSeconds(avgSec(globalWaitList)) : '0s',
      avgOperatorTmrLabel: globalTmrList.length > 0 ? formatSeconds(avgSec(globalTmrList)) : '0s',
      positiveOutcomesTotal: totalPositiveOutcomes,
      positiveOutcomeRate: safePct(totalPositiveOutcomes, totalTel),
    },
    dailySeries,
    tmrCorrelation,
    actionFunnel,
    reactionTimes,
    campaignsComparison,
    channelsEfficiency,
    flowsEfficiency,
    tabulationMatrix,
  }
}

/**
 * Exports the consolidated Executive Report into a multi-section Excel CSV file.
 */
export function exportExecutiveReportToCsv(data: ExecutiveReportData): string {
  const lines: string[] = []
  const esc = (v: string | number) => {
    const s = String(v ?? '').replace(/\r?\n|\r/g, ' ').trim()
    return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }

  lines.push(`RELATORIO GERENCIAL EXECUTIVO - LM CORE CRM (${data.startDate} a ${data.endDate})`)
  lines.push('')

  lines.push('1. FECHAMENTO DIARIO DA OPERACAO')
  lines.push('Data;Disparos Enviados;Respostas Recebidas;Conversas Ativas;Retidos Robo/IA;Atendidos Humano;TME Medio (1a Resp);TMR Medio Operador;Encerrados;Acordos e Promessas')
  for (const d of data.dailySeries) {
    lines.push(
      [
        d.dateLabel,
        d.broadcastSent,
        d.inboundReplies,
        d.activeConversations,
        d.retainedAutoCount,
        d.humanAttendedCount,
        d.avgWaitTmeLabel,
        d.avgOperatorTmrLabel,
        d.closedCount,
        d.positiveOutcomesCount,
      ]
        .map(esc)
        .join(';')
    )
  }

  lines.push('')
  lines.push('2. IMPACTO DO TEMPO DE RESPOSTA (TMR) NO ABANDONO DO DEVEDOR')
  lines.push('Faixa de Tempo;Conversas;Continuaram Conversando;% Continuidade;Abandonaram (Esfriaram);% Abandono;Desfecho Positivo;% Conversao')
  for (const b of data.tmrCorrelation) {
    lines.push(
      [
        b.bucketLabel,
        b.conversationsCount,
        b.continuedCount,
        `${b.continuedPercent}%`,
        b.abandonedCount,
        `${b.abandonedPercent}%`,
        b.positiveOutcomeCount,
        `${b.positiveOutcomePercent}%`,
      ]
        .map(esc)
        .join(';')
    )
  }

  lines.push('')
  lines.push('3. COMPARATIVO POR CARTEIRA / CREDOR')
  lines.push('Carteira;Cliente/Credor;Operadores;CPFs Triados;Conversas;% Retencao Robo/IA;TME Medio;TMR Medio;Promessas;Acordos;% Conversao')
  for (const c of data.campaignsComparison) {
    lines.push(
      [
        c.campaignName,
        c.clientOrCreditor,
        c.operatorsCount,
        c.cpfsTriaged,
        c.totalConversations,
        `${c.autoRetainedPercent}%`,
        c.avgTmeLabel,
        c.avgTmrLabel,
        c.promisesCount,
        c.agreementsCount,
        `${c.positiveConversionPercent}%`,
      ]
        .map(esc)
        .join(';')
    )
  }

  lines.push('')
  lines.push('4. MATRIZ DE TABULACOES E QUEM ENCERROU')
  lines.push('Tabulacao / Desfecho;Quantidade;% Participacao;Encerrados por Operador;Encerrados por Robo/IA;Em Aberto;Operador Destaque')
  for (const t of data.tabulationMatrix) {
    lines.push(
      [
        t.tabulation,
        t.count,
        `${t.sharePercent}%`,
        t.closedByOperator,
        t.closedByAuto,
        t.openOrWaiting,
        t.topOperatorName,
      ]
        .map(esc)
        .join(';')
    )
  }

  return '\uFEFF' + lines.join('\r\n')
}
