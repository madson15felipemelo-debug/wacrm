import type { SupabaseClient } from '@supabase/supabase-js'
import { formatSeconds } from '@/lib/dashboard/operational-queries'

export type AnalyticalReportId =
  | 'envios_analiticos'
  | 'envios_periodo'
  | 'resumo_periodo'
  | 'respondeu_sim'
  | 'respondeu_nao'
  | 'nao_respondeu'
  | 'nao_reconhece'
  | 'ameaca_exaustao'
  | 'comprovante_recebido'
  | 'funil_boleto'
  | 'preventivo'
  | 'promessa_acordo_recusa'
  | 'janela_24h'
  | 'producao_operador'
  | 'nao_entregue'

export interface AnalyticalReportDefinition {
  id: AnalyticalReportId
  label: string
  category: 'disparos' | 'respostas' | 'negociacao'
  categoryLabel: string
  description: string
  columns: {
    key: string
    label: string
    align?: 'left' | 'center' | 'right'
    type?: 'text' | 'phone' | 'badge' | 'currency' | 'percent' | 'datetime' | 'link' | 'mono'
  }[]
}

export interface AnalyticalReportSummaryItem {
  label: string
  value: string | number
  sublabel?: string
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

export interface AnalyticalReportRow {
  id: string
  conversationId?: string
  mediaUrl?: string
  cells: Record<string, {
    text: string
    raw?: string | number
    badgeTone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
    subtext?: string
  }>
}

export interface AnalyticalReportResult {
  reportId: AnalyticalReportId
  generatedAt: string
  startDate: string
  endDate: string
  totalRows: number
  summary: AnalyticalReportSummaryItem[]
  rows: AnalyticalReportRow[]
}

export interface AnalyticalReportFilterParams {
  reportId: AnalyticalReportId
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  campaignId?: string
  operatorId?: string
}

export const ANALYTICAL_REPORT_DEFINITIONS: AnalyticalReportDefinition[] = [
  {
    id: 'envios_analiticos',
    label: 'Envios analíticos',
    category: 'disparos',
    categoryLabel: 'Disparos & Entregas',
    description: 'Detalhamento nominal disparo a disparo com status de entrega, leitura, resposta e falhas da Meta.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'batchName', label: 'Lote / Origem', type: 'text' },
      { key: 'templateName', label: 'Modelo (Template)', type: 'mono' },
      { key: 'status', label: 'Status Entrega', type: 'badge', align: 'center' },
      { key: 'interactionAt', label: 'Leitura / Resposta', type: 'text' },
      { key: 'detail', label: 'Detalhe / Retorno Meta', type: 'text' },
    ],
  },
  {
    id: 'envios_periodo',
    label: 'Envios do período',
    category: 'disparos',
    categoryLabel: 'Disparos & Entregas',
    description: 'Desempenho consolidado por lote de disparo e templates enviados dentro do período selecionado.',
    columns: [
      { key: 'datetime', label: 'Data de Criação', type: 'datetime' },
      { key: 'batchName', label: 'Nome do Disparo', type: 'text' },
      { key: 'templateName', label: 'Modelo Utilizado', type: 'mono' },
      { key: 'status', label: 'Status do Lote', type: 'badge', align: 'center' },
      { key: 'totalRecipients', label: 'Base Total', type: 'mono', align: 'right' },
      { key: 'sentCount', label: 'Enviados', type: 'mono', align: 'right' },
      { key: 'deliveredCount', label: 'Entregues', type: 'mono', align: 'right' },
      { key: 'readCount', label: 'Lidos', type: 'mono', align: 'right' },
      { key: 'repliedCount', label: 'Respondidos', type: 'mono', align: 'right' },
      { key: 'responseRate', label: 'Taxa Resp.', type: 'percent', align: 'right' },
      { key: 'failedCount', label: 'Falhas', type: 'mono', align: 'right' },
    ],
  },
  {
    id: 'resumo_periodo',
    label: 'Resumo do período',
    category: 'disparos',
    categoryLabel: 'Disparos & Entregas',
    description: 'Balanço diário da operação no período: disparos, mensagens recebidas, atendimentos, promessas e acordos.',
    columns: [
      { key: 'date', label: 'Data', type: 'mono' },
      { key: 'broadcastSent', label: 'Disparos em Massa', type: 'mono', align: 'right' },
      { key: 'inboundMsgs', label: 'Msgs Recebidas (Cliente)', type: 'mono', align: 'right' },
      { key: 'outboundMsgs', label: 'Msgs Enviadas (Equipe/Robô)', type: 'mono', align: 'right' },
      { key: 'activeConvs', label: 'Conversas Movimentadas', type: 'mono', align: 'right' },
      { key: 'respondedConvs', label: 'Com Resposta do Cliente', type: 'mono', align: 'right' },
      { key: 'responseRate', label: 'Taxa de Interação', type: 'percent', align: 'right' },
      { key: 'scheduledCount', label: 'Promessas / Lembretes', type: 'mono', align: 'right' },
      { key: 'wonDealsCount', label: 'Acordos Fechados', type: 'mono', align: 'right' },
      { key: 'wonDealsValue', label: 'Valor em Acordos', type: 'currency', align: 'right' },
    ],
  },
  {
    id: 'respondeu_sim',
    label: 'Respondeu SIM',
    category: 'respostas',
    categoryLabel: 'Respostas & Comportamento',
    description: 'Contatos que responderam afirmativamente, clicaram em botão de confirmação ou engajaram positivamente.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'replyText', label: 'Resposta do Cliente', type: 'text' },
      { key: 'matchType', label: 'Classificação', type: 'badge', align: 'center' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
      { key: 'convStatus', label: 'Status Conversa', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'respondeu_nao',
    label: 'Respondeu NÃO',
    category: 'respostas',
    categoryLabel: 'Respostas & Comportamento',
    description: 'Contatos que recusaram a abordagem, responderam negativamente ou solicitaram bloqueio (Opt-out).',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'replyText', label: 'Mensagem / Motivo', type: 'text' },
      { key: 'refusalType', label: 'Tipo de Recusa', type: 'badge', align: 'center' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador', type: 'text' },
    ],
  },
  {
    id: 'nao_respondeu',
    label: 'Não respondeu',
    category: 'respostas',
    categoryLabel: 'Respostas & Comportamento',
    description: 'Contatos acionados por disparo ou atendimento no período que ainda não enviaram resposta.',
    columns: [
      { key: 'datetime', label: 'Data do Acionamento', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'origin', label: 'Lote / Origem', type: 'text' },
      { key: 'templateName', label: 'Modelo / Mensagem', type: 'text' },
      { key: 'deliveryStatus', label: 'Último Status Meta', type: 'badge', align: 'center' },
      { key: 'elapsedTime', label: 'Tempo sem Resposta', type: 'mono', align: 'right' },
    ],
  },
  {
    id: 'nao_reconhece',
    label: 'Não reconhece / não sou eu',
    category: 'respostas',
    categoryLabel: 'Respostas & Comportamento',
    description: 'Ocorrências em que o destinatário informou desconhecer o titular, dívida ou número de terceiro.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato Cadastrado', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'messageText', label: 'Relato do Destinatário', type: 'text' },
      { key: 'cpf', label: 'CPF Vinculado', type: 'mono' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador', type: 'text' },
      { key: 'status', label: 'Status', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'ameaca_exaustao',
    label: 'Ameaça e exaustão',
    category: 'respostas',
    categoryLabel: 'Respostas & Comportamento',
    description: 'Monitoramento preventivo de risco jurídico, menções a órgãos de defesa (Procon/Bacen) ou exaustão de cobrança.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'triggerTerm', label: 'Gatilho Identificado', type: 'badge', align: 'center' },
      { key: 'messageText', label: 'Mensagem Recebida', type: 'text' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador', type: 'text' },
      { key: 'optOutState', label: 'Bloqueio (Opt-out)', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'comprovante_recebido',
    label: 'Comprovante recebido',
    category: 'respostas',
    categoryLabel: 'Respostas & Comportamento',
    description: 'Arquivos (PDF/Imagens) e confirmações de pagamento enviadas pelos clientes nas conversas do período.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Cliente', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'mediaType', label: 'Tipo de Comprovante', type: 'badge', align: 'center' },
      { key: 'caption', label: 'Mensagem / Observação', type: 'text' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
    ],
  },
  {
    id: 'funil_boleto',
    label: 'Funil de boleto',
    category: 'negociacao',
    categoryLabel: 'Negociação & Operação',
    description: 'Rastreamento analítico de negociações, propostas/boletos emitidos e evolução nas etapas do funil.',
    columns: [
      { key: 'datetime', label: 'Data Atualização', type: 'datetime' },
      { key: 'contactName', label: 'Cliente', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'dealTitle', label: 'Negociação / Título', type: 'text' },
      { key: 'stageName', label: 'Etapa Atual do Funil', type: 'badge', align: 'center' },
      { key: 'dealStatus', label: 'Situação', type: 'badge', align: 'center' },
      { key: 'value', label: 'Valor (R$)', type: 'currency', align: 'right' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
    ],
  },
  {
    id: 'preventivo',
    label: 'Preventivo',
    category: 'negociacao',
    categoryLabel: 'Negociação & Operação',
    description: 'Controle de lembretes preventivos, retornos agendados e acompanhamentos de vencimento.',
    columns: [
      { key: 'remindAt', label: 'Data Programada', type: 'datetime' },
      { key: 'contactName', label: 'Cliente', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'comment', label: 'Compromisso / Observação', type: 'text' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
      { key: 'status', label: 'Situação do Retorno', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'promessa_acordo_recusa',
    label: 'Promessa, acordo e recusa',
    category: 'negociacao',
    categoryLabel: 'Negociação & Operação',
    description: 'Visão analítica unificada de todos os desfechos comerciais do período: acordos fechados, promessas e recusas.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Cliente', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'outcome', label: 'Desfecho', type: 'badge', align: 'center' },
      { key: 'detail', label: 'Detalhe / Etapa', type: 'text' },
      { key: 'value', label: 'Valor Envolvido', type: 'currency', align: 'right' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
    ],
  },
  {
    id: 'janela_24h',
    label: 'Janela 24h',
    category: 'negociacao',
    categoryLabel: 'Negociação & Operação',
    description: 'Auditoria da janela gratuita de 24 horas da Meta por conversa, destacando tempo restante para resposta livre.',
    columns: [
      { key: 'lastInboundAt', label: 'Última Msg do Cliente', type: 'datetime' },
      { key: 'contactName', label: 'Cliente', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'windowStatus', label: 'Janela Meta 24h', type: 'badge', align: 'center' },
      { key: 'remainingTime', label: 'Tempo Restante / Expiração', type: 'mono', align: 'right' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
      { key: 'convStatus', label: 'Status Conversa', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'producao_operador',
    label: 'Produção do operador',
    category: 'negociacao',
    categoryLabel: 'Negociação & Operação',
    description: 'Produtividade individual detalhada por operador no período: atendimentos, mensagens, tempos médios e acordos.',
    columns: [
      { key: 'operatorName', label: 'Operador', type: 'text' },
      { key: 'campaignName', label: 'Carteira Principal', type: 'text' },
      { key: 'totalConvs', label: 'Atendimentos', type: 'mono', align: 'right' },
      { key: 'openConvs', label: 'Em Aberto', type: 'mono', align: 'right' },
      { key: 'closedConvs', label: 'Finalizados', type: 'mono', align: 'right' },
      { key: 'messagesSent', label: 'Msgs Enviadas', type: 'mono', align: 'right' },
      { key: 'tmr', label: 'TMR (Resposta)', type: 'mono', align: 'right' },
      { key: 'tma', label: 'TMA (Atendimento)', type: 'mono', align: 'right' },
      { key: 'promisesCount', label: 'Promessas', type: 'mono', align: 'right' },
      { key: 'wonDealsCount', label: 'Acordos', type: 'mono', align: 'right' },
      { key: 'wonDealsValue', label: 'Valor Recuperado', type: 'currency', align: 'right' },
      { key: 'conversionRate', label: 'Conversão', type: 'percent', align: 'right' },
    ],
  },
  {
    id: 'nao_entregue',
    label: 'Não entregue',
    category: 'disparos',
    categoryLabel: 'Disparos & Entregas',
    description: 'Relatório de falhas de entrega reportadas pela API oficial da Meta (números inválidos, bloqueios ou erro de envio).',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'origin', label: 'Origem do Envio', type: 'badge', align: 'center' },
      { key: 'templateOrText', label: 'Modelo / Conteúdo', type: 'text' },
      { key: 'errorReason', label: 'Motivo da Falha (Meta)', type: 'text' },
    ],
  },
]

const AFFIRMATIVE_REGEX =
  /\b(sim|s|quero|aceito|confirmo|confirmar|sou eu|pode|ok|certo|combinado|boleto|pix|acordo|negociar|parcelar|quero negociar|1)\b/i

const NEGATIVE_REGEX =
  /\b(n[aã]o|nao quero|n[aã]o tenho interesse|sair|parar|bloquear|cancelar|recuso|sem condi[cç][oõ]es|nunca|2)\b/i

const UNRECOGNIZED_REGEX =
  /\b(n[aã]o sou eu|n[aã]o conhe[cç]o|n[aã]o reconhe[cç]o|engano|n[uú]mero errado|pessoa errada|desconhe[cç]o|terceiro|outro dono)\b/i

const THREAT_EXHAUSTION_TERMS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bprocon\b/i, label: 'Menção ao PROCON' },
  { pattern: /\b(processo|processar|juiz|judicial|justi[cç]a|juizado)\b/i, label: 'Ameaça Judicial / Processo' },
  { pattern: /\b(advogad[oa]|jur[ií]dico)\b/i, label: 'Acionamento de Advogado' },
  { pattern: /\b(bacen|banco central|consumidor\.gov|reclame aqui|anatel)\b/i, label: 'Órgão Regulador / Reclamação' },
  { pattern: /\b(pol[ií]cia|boletim de ocorr[eê]ncia|delegacia)\b/i, label: 'Menção Policial / B.O.' },
  { pattern: /\b(ass[eé]dio|abuso|abusivo|constrangimento|amea[cç]a)\b/i, label: 'Alegação de Exaustão / Abuso' },
  { pattern: /\b(parem de mandar|parem de ligar|n[aã]o aguento mais|chega de mensagem|me tirem da lista)\b/i, label: 'Exaustão de Abordagem' },
]

function formatDateTimeBR(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateOnlyBR(isoOrDate: string): string {
  if (!isoOrDate) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) {
    const [y, m, d] = isoOrDate.split('-')
    return `${d}/${m}/${y}`
  }
  const d = new Date(isoOrDate)
  if (isNaN(d.getTime())) return isoOrDate
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0)
}

function formatElapsedSince(iso?: string | null): string {
  if (!iso) return '—'
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))} min`
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    const m = Math.floor((diffSec % 3600) / 60)
    return `${h}h ${m}m`
  }
  const days = Math.floor(diffSec / 86400)
  const remH = Math.floor((diffSec % 86400) / 3600)
  return `${days}d ${remH}h`
}

export async function generateAnalyticalReport(
  db: SupabaseClient,
  params: AnalyticalReportFilterParams
): Promise<AnalyticalReportResult> {
  const { reportId, startDate, endDate, campaignId, operatorId } = params

  // Build ISO boundaries in local timezone so full days are covered
  const startIso = new Date(`${startDate}T00:00:00`).toISOString()
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString()

  // Load shared lookup tables in parallel
  const [profilesRes, campaignsRes, campOpsRes, stagesRes] = await Promise.all([
    db.from('profiles').select('user_id, full_name, account_role'),
    db.from('distribution_campaigns').select('id, name, code'),
    db.from('campaign_operators').select('campaign_id, user_id'),
    db.from('pipeline_stages').select('id, name, position, color'),
  ])

  const profileMap = new Map<string, string>()
  for (const p of (profilesRes.data ?? []) as any[]) {
    profileMap.set(p.user_id, p.full_name || 'Operador')
  }

  const campaignMap = new Map<string, string>()
  for (const c of (campaignsRes.data ?? []) as any[]) {
    campaignMap.set(c.id, c.name)
  }

  const userCampaignMap = new Map<string, { id: string; name: string }>()
  for (const co of (campOpsRes.data ?? []) as any[]) {
    const cName = campaignMap.get(co.campaign_id)
    if (cName && !userCampaignMap.has(co.user_id)) {
      userCampaignMap.set(co.user_id, { id: co.campaign_id, name: cName })
    }
  }

  const stageMap = new Map<string, string>()
  for (const s of (stagesRes.data ?? []) as any[]) {
    stageMap.set(s.id, s.name)
  }

  const matchesFilters = (convCampaignId?: string | null, assignedAgentId?: string | null) => {
    if (campaignId && campaignId !== 'all') {
      const effectiveCampId =
        convCampaignId || (assignedAgentId ? userCampaignMap.get(assignedAgentId)?.id : undefined)
      if (effectiveCampId !== campaignId) return false
    }
    if (operatorId && operatorId !== 'all') {
      if (assignedAgentId !== operatorId) return false
    }
    return true
  }

  // =========================================================================
  // 1. ENVIOS ANALÍTICOS
  // =========================================================================
  if (reportId === 'envios_analiticos') {
    const [recipRes, outboundMsgsRes] = await Promise.all([
      db
        .from('broadcast_recipients')
        .select(
          'id, broadcast_id, contact_id, status, sent_at, delivered_at, read_at, replied_at, error_message, created_at, contact:contacts(id, name, phone), broadcast:broadcasts(id, name, template_name)'
        )
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1000),
      db
        .from('messages')
        .select(
          'id, conversation_id, sender_type, sender_id, content_type, content_text, template_name, status, created_at, conversation:conversations(id, campaign_id, assigned_agent_id, contact:contacts(id, name, phone))'
        )
        .neq('sender_type', 'customer')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    const rows: AnalyticalReportRow[] = []
    let deliveredCount = 0
    let readCount = 0
    let repliedCount = 0
    let failedCount = 0

    for (const r of (recipRes.data ?? []) as any[]) {
      const status: string = r.status || 'pending'
      if (status === 'delivered' || status === 'read' || status === 'replied') deliveredCount++
      if (status === 'read' || status === 'replied') readCount++
      if (status === 'replied' || r.replied_at) repliedCount++
      if (status === 'failed') failedCount++

      const statusLabelMap: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'primary' }> = {
        replied: { label: 'Respondido', tone: 'success' },
        read: { label: 'Lido pelo Cliente', tone: 'primary' },
        delivered: { label: 'Entregue', tone: 'info' },
        sent: { label: 'Enviado', tone: 'neutral' },
        pending: { label: 'Na Fila', tone: 'warning' },
        failed: { label: 'Falha na Entrega', tone: 'danger' },
      }
      const st = statusLabelMap[status] ?? { label: status, tone: 'neutral' }

      rows.push({
        id: `br-${r.id}`,
        cells: {
          datetime: { text: formatDateTimeBR(r.sent_at || r.created_at), raw: r.sent_at || r.created_at },
          contactName: { text: r.contact?.name || 'Contato sem nome' },
          phone: { text: r.contact?.phone || '—' },
          batchName: { text: r.broadcast?.name || 'Disparo em Massa' },
          templateName: { text: r.broadcast?.template_name || '—' },
          status: { text: st.label, badgeTone: st.tone },
          interactionAt: {
            text: r.replied_at
              ? `Resp: ${formatDateTimeBR(r.replied_at)}`
              : r.read_at
                ? `Lido: ${formatDateTimeBR(r.read_at)}`
                : r.delivered_at
                  ? `Entr: ${formatDateTimeBR(r.delivered_at)}`
                  : '—',
          },
          detail: { text: r.error_message || (r.replied_at ? 'Cliente respondeu ao disparo' : 'Processado via API Oficial Meta') },
        },
      })
    }

    for (const m of (outboundMsgsRes.data ?? []) as any[]) {
      const conv = m.conversation
      if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id || m.sender_id)) continue
      const status: string = m.status || 'sent'
      if (status === 'delivered' || status === 'read') deliveredCount++
      if (status === 'read') readCount++
      if (status === 'failed') failedCount++

      const stMap: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'primary' }> = {
        read: { label: 'Lido pelo Cliente', tone: 'primary' },
        delivered: { label: 'Entregue', tone: 'info' },
        sent: { label: 'Enviado', tone: 'neutral' },
        sending: { label: 'Enviando', tone: 'warning' },
        failed: { label: 'Falha', tone: 'danger' },
      }
      const st = stMap[status] ?? { label: status, tone: 'neutral' }
      const campName = conv?.campaign_id ? campaignMap.get(conv.campaign_id) : undefined

      rows.push({
        id: `msg-${m.id}`,
        conversationId: m.conversation_id,
        cells: {
          datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
          contactName: { text: conv?.contact?.name || 'Contato' },
          phone: { text: conv?.contact?.phone || '—' },
          batchName: {
            text: campName
              ? `Atendimento · ${campName}`
              : m.sender_type === 'bot'
                ? 'Fluxo Automático / Robô'
                : 'Atendimento Individual',
          },
          templateName: { text: m.template_name || (m.content_type === 'interactive' ? 'Menu Interativo' : 'Mensagem Direta') },
          status: { text: st.label, badgeTone: st.tone },
          interactionAt: { text: status === 'read' ? 'Visualizado' : status === 'delivered' ? 'Recebido no aparelho' : '—' },
          detail: { text: (m.content_text || '').slice(0, 90) || 'Mensagem enviada na conversa' },
        },
      })
    }

    rows.sort((a, b) => String(b.cells.datetime.raw || '').localeCompare(String(a.cells.datetime.raw || '')))

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Total de Envios', value: rows.length, tone: 'primary' },
        { label: 'Entregues / Lidos', value: deliveredCount, sublabel: rows.length > 0 ? `${Math.round((deliveredCount / rows.length) * 100)}% do total` : '0%', tone: 'success' },
        { label: 'Visualizados (Lidos)', value: readCount, tone: 'default' },
        { label: 'Falhas Reportadas', value: failedCount, tone: failedCount > 0 ? 'danger' : 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 2. ENVIOS DO PERÍODO
  // =========================================================================
  if (reportId === 'envios_periodo') {
    const { data: broadcasts } = await db
      .from('broadcasts')
      .select(
        'id, name, template_name, status, total_recipients, sent_count, delivered_count, read_count, replied_count, failed_count, scheduled_at, created_at'
      )
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })

    const rows: AnalyticalReportRow[] = []
    let totalSent = 0
    let totalDelivered = 0
    let totalReplied = 0
    let totalFailed = 0

    for (const b of (broadcasts ?? []) as any[]) {
      const sent = Number(b.sent_count || 0)
      const delivered = Number(b.delivered_count || 0)
      const read = Number(b.read_count || 0)
      const replied = Number(b.replied_count || 0)
      const failed = Number(b.failed_count || 0)
      const base = Number(b.total_recipients || sent + failed)
      const respRate = delivered > 0 ? Math.round((replied / delivered) * 1000) / 10 : sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0

      totalSent += sent
      totalDelivered += delivered
      totalReplied += replied
      totalFailed += failed

      const statusBadge: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
        sent: { label: 'Concluído', tone: 'success' },
        sending: { label: 'Em Disparo', tone: 'info' },
        scheduled: { label: 'Agendado', tone: 'warning' },
        draft: { label: 'Rascunho', tone: 'neutral' },
        failed: { label: 'Com Falha', tone: 'danger' },
      }
      const st = statusBadge[b.status] ?? { label: b.status, tone: 'neutral' }

      rows.push({
        id: b.id,
        cells: {
          datetime: { text: formatDateTimeBR(b.scheduled_at || b.created_at), raw: b.created_at },
          batchName: { text: b.name || 'Lote sem nome' },
          templateName: { text: b.template_name || '—' },
          status: { text: st.label, badgeTone: st.tone },
          totalRecipients: { text: String(base), raw: base },
          sentCount: { text: String(sent), raw: sent },
          deliveredCount: { text: String(delivered), raw: delivered },
          readCount: { text: String(read), raw: read },
          repliedCount: { text: String(replied), raw: replied },
          responseRate: { text: `${respRate.toFixed(1)}%`, raw: respRate },
          failedCount: { text: String(failed), raw: failed },
        },
      })
    }

    const avgResponseRate = totalDelivered > 0 ? Math.round((totalReplied / totalDelivered) * 1000) / 10 : 0

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Lotes no Período', value: rows.length, tone: 'primary' },
        { label: 'Total Enviado', value: totalSent, tone: 'default' },
        { label: 'Total Entregue', value: totalDelivered, tone: 'success' },
        { label: 'Taxa de Resposta', value: `${avgResponseRate}%`, sublabel: `${totalReplied} respostas`, tone: 'primary' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 3. RESUMO DO PERÍODO
  // =========================================================================
  if (reportId === 'resumo_periodo') {
    const [msgsRes, broadcastsRes, dealsRes, remindersRes] = await Promise.all([
      db
        .from('messages')
        .select('id, conversation_id, sender_type, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      db
        .from('broadcasts')
        .select('id, sent_count, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      db
        .from('deals')
        .select('id, value, status, created_at')
        .eq('status', 'won')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      db
        .from('conversation_reminders')
        .select('id, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
    ])

    type DayBucket = {
      broadcastSent: number
      inboundMsgs: number
      outboundMsgs: number
      activeConvs: Set<string>
      respondedConvs: Set<string>
      scheduledCount: number
      wonDealsCount: number
      wonDealsValue: number
    }

    const buckets = new Map<string, DayBucket>()
    const ensureBucket = (dayKey: string): DayBucket => {
      let b = buckets.get(dayKey)
      if (!b) {
        b = {
          broadcastSent: 0,
          inboundMsgs: 0,
          outboundMsgs: 0,
          activeConvs: new Set(),
          respondedConvs: new Set(),
          scheduledCount: 0,
          wonDealsCount: 0,
          wonDealsValue: 0,
        }
        buckets.set(dayKey, b)
      }
      return b
    }

    const toLocalDayKey = (iso: string) => {
      const d = new Date(iso)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    // Seed days in range if range <= 62 days
    const startMs = new Date(`${startDate}T00:00:00`).getTime()
    const endMs = new Date(`${endDate}T00:00:00`).getTime()
    const diffDays = Math.round((endMs - startMs) / 86400000)
    if (diffDays >= 0 && diffDays <= 62) {
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startMs + i * 86400000)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        ensureBucket(key)
      }
    }

    for (const b of (broadcastsRes.data ?? []) as any[]) {
      const bucket = ensureBucket(toLocalDayKey(b.created_at))
      bucket.broadcastSent += Number(b.sent_count || 0)
    }

    for (const m of (msgsRes.data ?? []) as any[]) {
      const bucket = ensureBucket(toLocalDayKey(m.created_at))
      if (m.conversation_id) bucket.activeConvs.add(m.conversation_id)
      if (m.sender_type === 'customer') {
        bucket.inboundMsgs++
        if (m.conversation_id) bucket.respondedConvs.add(m.conversation_id)
      } else {
        bucket.outboundMsgs++
      }
    }

    for (const r of (remindersRes.data ?? []) as any[]) {
      const bucket = ensureBucket(toLocalDayKey(r.created_at))
      bucket.scheduledCount++
    }

    for (const d of (dealsRes.data ?? []) as any[]) {
      const bucket = ensureBucket(toLocalDayKey(d.created_at))
      bucket.wonDealsCount++
      bucket.wonDealsValue += Number(d.value || 0)
    }

    const sortedDays = Array.from(buckets.keys()).sort((a, b) => b.localeCompare(a))
    let totalInbound = 0
    let totalOutbound = 0
    let totalWonCount = 0
    let totalWonValue = 0

    const rows: AnalyticalReportRow[] = sortedDays.map((dayKey) => {
      const b = buckets.get(dayKey)!
      const activeCount = b.activeConvs.size
      const respCount = b.respondedConvs.size
      const rate = activeCount > 0 ? Math.round((respCount / activeCount) * 1000) / 10 : 0

      totalInbound += b.inboundMsgs
      totalOutbound += b.outboundMsgs + b.broadcastSent
      totalWonCount += b.wonDealsCount
      totalWonValue += b.wonDealsValue

      return {
        id: dayKey,
        cells: {
          date: { text: formatDateOnlyBR(dayKey), raw: dayKey },
          broadcastSent: { text: String(b.broadcastSent), raw: b.broadcastSent },
          inboundMsgs: { text: String(b.inboundMsgs), raw: b.inboundMsgs },
          outboundMsgs: { text: String(b.outboundMsgs), raw: b.outboundMsgs },
          activeConvs: { text: String(activeCount), raw: activeCount },
          respondedConvs: { text: String(respCount), raw: respCount },
          responseRate: { text: `${rate.toFixed(1)}%`, raw: rate },
          scheduledCount: { text: String(b.scheduledCount), raw: b.scheduledCount },
          wonDealsCount: { text: String(b.wonDealsCount), raw: b.wonDealsCount },
          wonDealsValue: { text: formatBRL(b.wonDealsValue), raw: b.wonDealsValue },
        },
      }
    })

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Dias Analisados', value: rows.length, tone: 'default' },
        { label: 'Msgs Recebidas', value: totalInbound, tone: 'primary' },
        { label: 'Msgs / Disparos Enviados', value: totalOutbound, tone: 'default' },
        { label: 'Acordos no Período', value: totalWonCount, sublabel: formatBRL(totalWonValue), tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 4. RESPONDEU SIM
  // =========================================================================
  if (reportId === 'respondeu_sim') {
    const { data: inboundMsgs } = await db
      .from('messages')
      .select(
        'id, conversation_id, content_type, content_text, interactive_reply_id, created_at, conversation:conversations(id, status, campaign_id, assigned_agent_id, contact:contacts(id, name, phone))'
      )
      .eq('sender_type', 'customer')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(1000)

    const rows: AnalyticalReportRow[] = []
    let buttonClicks = 0
    let textAffirmatives = 0

    for (const m of (inboundMsgs ?? []) as any[]) {
      const conv = m.conversation
      if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id)) continue
      const text = (m.content_text || '').trim()
      const isInteractive = m.content_type === 'interactive' || Boolean(m.interactive_reply_id)
      const isNegative = NEGATIVE_REGEX.test(text) || UNRECOGNIZED_REGEX.test(text)
      const isAffirmative = !isNegative && (isInteractive || AFFIRMATIVE_REGEX.test(text))

      if (!isAffirmative) continue

      if (isInteractive) buttonClicks++
      else textAffirmatives++

      const campName = conv?.campaign_id
        ? campaignMap.get(conv.campaign_id)
        : conv?.assigned_agent_id
          ? userCampaignMap.get(conv.assigned_agent_id)?.name
          : 'Geral'
      const opName = conv?.assigned_agent_id ? profileMap.get(conv.assigned_agent_id) || 'Atribuído' : 'Fila / Robô'

      rows.push({
        id: m.id,
        conversationId: m.conversation_id,
        cells: {
          datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
          contactName: { text: conv?.contact?.name || 'Cliente' },
          phone: { text: conv?.contact?.phone || '—' },
          replyText: { text: text || (m.interactive_reply_id ? `[Botão: ${m.interactive_reply_id}]` : 'Confirmação interativa') },
          matchType: {
            text: isInteractive ? 'Clique em Botão' : 'Confirmação por Texto',
            badgeTone: isInteractive ? 'primary' : 'success',
          },
          campaignName: { text: campName || 'Geral' },
          operatorName: { text: opName },
          convStatus: {
            text: conv?.status === 'closed' ? 'Finalizada' : conv?.status === 'pending' ? 'Pendente' : 'Em Atendimento',
            badgeTone: conv?.status === 'closed' ? 'neutral' : 'info',
          },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Total Respondeu SIM', value: rows.length, tone: 'success' },
        { label: 'Cliques em Botão', value: buttonClicks, tone: 'primary' },
        { label: 'Respostas por Texto', value: textAffirmatives, tone: 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 5. RESPONDEU NÃO / OPT-OUT
  // =========================================================================
  if (reportId === 'respondeu_nao') {
    const [optOutsRes, inboundMsgsRes] = await Promise.all([
      db
        .from('contacts')
        .select('id, name, phone, opted_out_at, opted_out_reason')
        .not('opted_out_at', 'is', null)
        .gte('opted_out_at', startIso)
        .lte('opted_out_at', endIso)
        .order('opted_out_at', { ascending: false }),
      db
        .from('messages')
        .select(
          'id, conversation_id, content_text, created_at, conversation:conversations(id, status, campaign_id, assigned_agent_id, contact:contacts(id, name, phone))'
        )
        .eq('sender_type', 'customer')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    const rows: AnalyticalReportRow[] = []
    let optOutCount = 0
    let refusalMsgCount = 0

    for (const c of (optOutsRes.data ?? []) as any[]) {
      optOutCount++
      rows.push({
        id: `optout-${c.id}`,
        cells: {
          datetime: { text: formatDateTimeBR(c.opted_out_at), raw: c.opted_out_at },
          contactName: { text: c.name || 'Contato' },
          phone: { text: c.phone || '—' },
          replyText: { text: c.opted_out_reason || 'Solicitou descadastramento / bloqueio (Opt-out)' },
          refusalType: { text: 'Opt-out / Bloqueio', badgeTone: 'danger' },
          campaignName: { text: 'Base Geral' },
          operatorName: { text: 'Automático (Opt-out)' },
        },
      })
    }

    for (const m of (inboundMsgsRes.data ?? []) as any[]) {
      const conv = m.conversation
      if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id)) continue
      const text = (m.content_text || '').trim()
      if (!NEGATIVE_REGEX.test(text)) continue

      refusalMsgCount++
      const campName = conv?.campaign_id ? campaignMap.get(conv.campaign_id) : 'Geral'
      const opName = conv?.assigned_agent_id ? profileMap.get(conv.assigned_agent_id) || 'Operador' : 'Fila / Robô'

      rows.push({
        id: `neg-${m.id}`,
        conversationId: m.conversation_id,
        cells: {
          datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
          contactName: { text: conv?.contact?.name || 'Cliente' },
          phone: { text: conv?.contact?.phone || '—' },
          replyText: { text },
          refusalType: { text: 'Recusa na Conversa', badgeTone: 'warning' },
          campaignName: { text: campName || 'Geral' },
          operatorName: { text: opName },
        },
      })
    }

    rows.sort((a, b) => String(b.cells.datetime.raw || '').localeCompare(String(a.cells.datetime.raw || '')))

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Total Respondeu NÃO', value: rows.length, tone: 'warning' },
        { label: 'Opt-out / Bloqueios', value: optOutCount, tone: 'danger' },
        { label: 'Recusas por Mensagem', value: refusalMsgCount, tone: 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 6. NÃO RESPONDEU
  // =========================================================================
  if (reportId === 'nao_respondeu') {
    const [unrepliedRecipRes, convsRes] = await Promise.all([
      db
        .from('broadcast_recipients')
        .select(
          'id, status, sent_at, delivered_at, read_at, replied_at, created_at, contact:contacts(id, name, phone), broadcast:broadcasts(id, name, template_name)'
        )
        .in('status', ['sent', 'delivered', 'read'])
        .is('replied_at', null)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(800),
      db
        .from('conversations')
        .select(
          'id, status, campaign_id, assigned_agent_id, last_message_text, last_message_from, last_message_at, created_at, contact:contacts(id, name, phone)'
        )
        .neq('last_message_from', 'customer')
        .gte('updated_at', startIso)
        .lte('updated_at', endIso)
        .order('last_message_at', { ascending: false })
        .limit(500),
    ])

    const rows: AnalyticalReportRow[] = []
    let readWithoutReply = 0

    for (const r of (unrepliedRecipRes.data ?? []) as any[]) {
      if (r.status === 'read' || r.read_at) readWithoutReply++
      const refIso = r.sent_at || r.created_at
      rows.push({
        id: `nr-br-${r.id}`,
        cells: {
          datetime: { text: formatDateTimeBR(refIso), raw: refIso },
          contactName: { text: r.contact?.name || 'Contato' },
          phone: { text: r.contact?.phone || '—' },
          origin: { text: r.broadcast?.name || 'Disparo em Massa' },
          templateName: { text: r.broadcast?.template_name || '—' },
          deliveryStatus: {
            text: r.status === 'read' ? 'Visualizou e não respondeu' : r.status === 'delivered' ? 'Entregue sem resposta' : 'Enviado sem resposta',
            badgeTone: r.status === 'read' ? 'warning' : 'info',
          },
          elapsedTime: { text: formatElapsedSince(refIso) },
        },
      })
    }

    for (const c of (convsRes.data ?? []) as any[]) {
      if (!matchesFilters(c.campaign_id, c.assigned_agent_id)) continue
      const refIso = c.last_message_at || c.created_at
      const campName = c.campaign_id ? campaignMap.get(c.campaign_id) : 'Atendimento'
      rows.push({
        id: `nr-conv-${c.id}`,
        conversationId: c.id,
        cells: {
          datetime: { text: formatDateTimeBR(refIso), raw: refIso },
          contactName: { text: c.contact?.name || 'Cliente' },
          phone: { text: c.contact?.phone || '—' },
          origin: { text: `Conversa · ${campName}` },
          templateName: { text: (c.last_message_text || 'Mensagem do operador').slice(0, 60) },
          deliveryStatus: { text: 'Aguardando retorno do cliente', badgeTone: 'neutral' },
          elapsedTime: { text: formatElapsedSince(refIso) },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Total Sem Resposta', value: rows.length, tone: 'warning' },
        { label: 'Visualizaram e Não Responderam', value: readWithoutReply, tone: 'primary' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 7. NÃO RECONHECE / NÃO SOU EU
  // =========================================================================
  if (reportId === 'nao_reconhece') {
    const [msgsRes, auditsRes] = await Promise.all([
      db
        .from('messages')
        .select(
          'id, conversation_id, content_text, created_at, conversation:conversations(id, status, campaign_id, assigned_agent_id, contact:contacts(id, name, phone))'
        )
        .eq('sender_type', 'customer')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(1000),
      db
        .from('distribution_audit_logs')
        .select('conversation_id, cpf')
        .not('cpf', 'is', null),
    ])

    const cpfByConv = new Map<string, string>()
    for (const a of (auditsRes.data ?? []) as any[]) {
      if (a.conversation_id && a.cpf) cpfByConv.set(a.conversation_id, a.cpf)
    }

    const rows: AnalyticalReportRow[] = []
    for (const m of (msgsRes.data ?? []) as any[]) {
      const conv = m.conversation
      if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id)) continue
      const text = (m.content_text || '').trim()
      if (!UNRECOGNIZED_REGEX.test(text)) continue

      const campName = conv?.campaign_id ? campaignMap.get(conv.campaign_id) : 'Geral'
      const opName = conv?.assigned_agent_id ? profileMap.get(conv.assigned_agent_id) || 'Operador' : 'Fila / Robô'

      rows.push({
        id: m.id,
        conversationId: m.conversation_id,
        cells: {
          datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
          contactName: { text: conv?.contact?.name || 'Contato' },
          phone: { text: conv?.contact?.phone || '—' },
          messageText: { text },
          cpf: { text: cpfByConv.get(m.conversation_id) || 'Não informado' },
          campaignName: { text: campName || 'Geral' },
          operatorName: { text: opName },
          status: { text: 'Higienizar Cadastro', badgeTone: 'warning' },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Ocorrências "Não Reconhece"', value: rows.length, tone: rows.length > 0 ? 'warning' : 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 8. AMEAÇA E EXAUSTÃO
  // =========================================================================
  if (reportId === 'ameaca_exaustao') {
    const { data: msgs } = await db
      .from('messages')
      .select(
        'id, conversation_id, content_text, created_at, conversation:conversations(id, status, campaign_id, assigned_agent_id, contact:contacts(id, name, phone, opted_out_at))'
      )
      .eq('sender_type', 'customer')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(1000)

    const rows: AnalyticalReportRow[] = []
    for (const m of (msgs ?? []) as any[]) {
      const conv = m.conversation
      if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id)) continue
      const text = (m.content_text || '').trim()
      if (!text) continue

      const matched = THREAT_EXHAUSTION_TERMS.find((t) => t.pattern.test(text))
      if (!matched) continue

      const campName = conv?.campaign_id ? campaignMap.get(conv.campaign_id) : 'Geral'
      const opName = conv?.assigned_agent_id ? profileMap.get(conv.assigned_agent_id) || 'Operador' : 'Fila / Robô'
      const isOptedOut = Boolean(conv?.contact?.opted_out_at)

      rows.push({
        id: m.id,
        conversationId: m.conversation_id,
        cells: {
          datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
          contactName: { text: conv?.contact?.name || 'Cliente' },
          phone: { text: conv?.contact?.phone || '—' },
          triggerTerm: { text: matched.label, badgeTone: 'danger' },
          messageText: { text },
          campaignName: { text: campName || 'Geral' },
          operatorName: { text: opName },
          optOutState: {
            text: isOptedOut ? 'Bloqueado (Opt-out)' : 'Ativo — Avaliar Bloqueio',
            badgeTone: isOptedOut ? 'neutral' : 'warning',
          },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Alertas Críticos Identificados', value: rows.length, tone: rows.length > 0 ? 'danger' : 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 9. COMPROVANTE RECEBIDO
  // =========================================================================
  if (reportId === 'comprovante_recebido') {
    const { data: msgs } = await db
      .from('messages')
      .select(
        'id, conversation_id, content_type, content_text, media_url, created_at, conversation:conversations(id, status, campaign_id, assigned_agent_id, contact:contacts(id, name, phone))'
      )
      .eq('sender_type', 'customer')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(1000)

    const rows: AnalyticalReportRow[] = []
    let docCount = 0
    let imgCount = 0

    for (const m of (msgs ?? []) as any[]) {
      const conv = m.conversation
      if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id)) continue
      const text = (m.content_text || '').trim()
      const isMediaReceipt = m.content_type === 'document' || m.content_type === 'image'
      const isTextReceipt = /\b(comprovante|paguei|pago|pix feito|pagamento realizado|segue o comprovante|anexo)\b/i.test(text)

      if (!isMediaReceipt && !isTextReceipt) continue

      if (m.content_type === 'document') docCount++
      else if (m.content_type === 'image') imgCount++

      const campName = conv?.campaign_id ? campaignMap.get(conv.campaign_id) : 'Geral'
      const opName = conv?.assigned_agent_id ? profileMap.get(conv.assigned_agent_id) || 'Operador' : 'Fila / Robô'

      rows.push({
        id: m.id,
        conversationId: m.conversation_id,
        mediaUrl: m.media_url || undefined,
        cells: {
          datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
          contactName: { text: conv?.contact?.name || 'Cliente' },
          phone: { text: conv?.contact?.phone || '—' },
          mediaType: {
            text:
              m.content_type === 'document'
                ? 'Documento / PDF'
                : m.content_type === 'image'
                  ? 'Imagem / Foto'
                  : 'Aviso de Pagamento',
            badgeTone: isMediaReceipt ? 'success' : 'info',
          },
          caption: { text: text || 'Arquivo de mídia anexado pelo cliente' },
          campaignName: { text: campName || 'Geral' },
          operatorName: { text: opName },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Total de Comprovantes', value: rows.length, tone: 'success' },
        { label: 'Documentos (PDF)', value: docCount, tone: 'primary' },
        { label: 'Imagens / Fotos', value: imgCount, tone: 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 10. FUNIL DE BOLETO
  // =========================================================================
  if (reportId === 'funil_boleto') {
    const { data: deals } = await db
      .from('deals')
      .select(
        'id, title, value, status, stage_id, assigned_to, user_id, conversation_id, created_at, updated_at, contact:contacts(id, name, phone)'
      )
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })

    const rows: AnalyticalReportRow[] = []
    let wonValue = 0
    let openValue = 0

    for (const d of (deals ?? []) as any[]) {
      const ownerId = d.assigned_to || d.user_id
      if (!matchesFilters(undefined, ownerId)) continue

      const val = Number(d.value || 0)
      if (d.status === 'won') wonValue += val
      else if (d.status === 'open') openValue += val

      const stageName = stageMap.get(d.stage_id) || 'Em Negociação'
      const opName = ownerId ? profileMap.get(ownerId) || 'Operador' : 'Equipe'

      const statusMap: Record<string, { label: string; tone: 'success' | 'info' | 'danger' }> = {
        won: { label: 'Boleto Pago / Acordo Ganho', tone: 'success' },
        open: { label: 'Aguardando Pagamento', tone: 'info' },
        lost: { label: 'Vencido / Perdido', tone: 'danger' },
      }
      const st = statusMap[d.status || 'open'] ?? { label: 'Em Aberto', tone: 'info' }

      rows.push({
        id: d.id,
        conversationId: d.conversation_id || undefined,
        cells: {
          datetime: { text: formatDateTimeBR(d.updated_at || d.created_at), raw: d.updated_at || d.created_at },
          contactName: { text: d.contact?.name || 'Cliente' },
          phone: { text: d.contact?.phone || '—' },
          dealTitle: { text: d.title || 'Negociação' },
          stageName: { text: stageName, badgeTone: 'primary' },
          dealStatus: { text: st.label, badgeTone: st.tone },
          value: { text: formatBRL(val), raw: val },
          operatorName: { text: opName },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Negociações no Funil', value: rows.length, tone: 'primary' },
        { label: 'Em Aberto / Emitidos', value: formatBRL(openValue), tone: 'warning' },
        { label: 'Quitados / Ganhos', value: formatBRL(wonValue), tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 11. PREVENTIVO
  // =========================================================================
  if (reportId === 'preventivo') {
    const { data: reminders } = await db
      .from('conversation_reminders')
      .select(
        'id, conversation_id, user_id, remind_at, comment, done_at, created_at, contact:contacts(id, name, phone)'
      )
      .gte('remind_at', startIso)
      .lte('remind_at', endIso)
      .order('remind_at', { ascending: true })

    const rows: AnalyticalReportRow[] = []
    let pendingCount = 0
    let doneCount = 0
    let overdueCount = 0
    const nowMs = Date.now()

    for (const r of (reminders ?? []) as any[]) {
      if (!matchesFilters(undefined, r.user_id)) continue
      const remindMs = new Date(r.remind_at).getTime()
      const isDone = Boolean(r.done_at)
      const isOverdue = !isDone && remindMs < nowMs

      if (isDone) doneCount++
      else if (isOverdue) overdueCount++
      else pendingCount++

      const opName = r.user_id ? profileMap.get(r.user_id) || 'Operador' : 'Equipe'
      const campName = r.user_id ? userCampaignMap.get(r.user_id)?.name || 'Geral' : 'Geral'

      rows.push({
        id: r.id,
        conversationId: r.conversation_id || undefined,
        cells: {
          remindAt: { text: formatDateTimeBR(r.remind_at), raw: r.remind_at },
          contactName: { text: r.contact?.name || 'Cliente' },
          phone: { text: r.contact?.phone || '—' },
          comment: { text: r.comment || 'Acompanhamento preventivo agendado' },
          campaignName: { text: campName },
          operatorName: { text: opName },
          status: {
            text: isDone ? 'Concluído' : isOverdue ? 'Atrasado' : 'Programado',
            badgeTone: isDone ? 'success' : isOverdue ? 'danger' : 'info',
          },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Total de Agendamentos', value: rows.length, tone: 'primary' },
        { label: 'No Prazo / Programados', value: pendingCount, tone: 'default' },
        { label: 'Atrasados', value: overdueCount, tone: overdueCount > 0 ? 'danger' : 'default' },
        { label: 'Concluídos', value: doneCount, tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 12. PROMESSA, ACORDO E RECUSA
  // =========================================================================
  if (reportId === 'promessa_acordo_recusa') {
    const [dealsRes, remindersRes] = await Promise.all([
      db
        .from('deals')
        .select(
          'id, title, value, status, stage_id, assigned_to, user_id, conversation_id, created_at, contact:contacts(id, name, phone)'
        )
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false }),
      db
        .from('conversation_reminders')
        .select(
          'id, conversation_id, user_id, remind_at, comment, created_at, contact:contacts(id, name, phone)'
        )
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false }),
    ])

    const rows: AnalyticalReportRow[] = []
    let agreementsCount = 0
    let promisesCount = 0
    let refusalsCount = 0
    let totalAgreementValue = 0

    for (const d of (dealsRes.data ?? []) as any[]) {
      const ownerId = d.assigned_to || d.user_id
      if (!matchesFilters(undefined, ownerId)) continue

      const val = Number(d.value || 0)
      const stageName = stageMap.get(d.stage_id) || 'Funil'
      const opName = ownerId ? profileMap.get(ownerId) || 'Operador' : 'Equipe'
      const campName = ownerId ? userCampaignMap.get(ownerId)?.name || 'Geral' : 'Geral'

      let outcomeLabel = 'Promessa / Em Negociação'
      let outcomeTone: 'success' | 'warning' | 'danger' | 'info' = 'info'

      if (d.status === 'won') {
        outcomeLabel = 'Acordo Fechado'
        outcomeTone = 'success'
        agreementsCount++
        totalAgreementValue += val
      } else if (d.status === 'lost') {
        outcomeLabel = 'Recusa / Perdido'
        outcomeTone = 'danger'
        refusalsCount++
      } else {
        promisesCount++
      }

      rows.push({
        id: `deal-${d.id}`,
        conversationId: d.conversation_id || undefined,
        cells: {
          datetime: { text: formatDateTimeBR(d.created_at), raw: d.created_at },
          contactName: { text: d.contact?.name || 'Cliente' },
          phone: { text: d.contact?.phone || '—' },
          outcome: { text: outcomeLabel, badgeTone: outcomeTone },
          detail: { text: `${d.title} (${stageName})` },
          value: { text: formatBRL(val), raw: val },
          campaignName: { text: campName },
          operatorName: { text: opName },
        },
      })
    }

    for (const r of (remindersRes.data ?? []) as any[]) {
      if (!matchesFilters(undefined, r.user_id)) continue
      promisesCount++
      const opName = r.user_id ? profileMap.get(r.user_id) || 'Operador' : 'Equipe'
      const campName = r.user_id ? userCampaignMap.get(r.user_id)?.name || 'Geral' : 'Geral'

      rows.push({
        id: `rem-${r.id}`,
        conversationId: r.conversation_id || undefined,
        cells: {
          datetime: { text: formatDateTimeBR(r.created_at), raw: r.created_at },
          contactName: { text: r.contact?.name || 'Cliente' },
          phone: { text: r.contact?.phone || '—' },
          outcome: { text: 'Promessa Agendada', badgeTone: 'warning' },
          detail: { text: `${r.comment || 'Retorno'} · Para ${formatDateTimeBR(r.remind_at)}` },
          value: { text: '—', raw: 0 },
          campaignName: { text: campName },
          operatorName: { text: opName },
        },
      })
    }

    rows.sort((a, b) => String(b.cells.datetime.raw || '').localeCompare(String(a.cells.datetime.raw || '')))

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Acordos Fechados', value: agreementsCount, sublabel: formatBRL(totalAgreementValue), tone: 'success' },
        { label: 'Promessas / Em Negociação', value: promisesCount, tone: 'warning' },
        { label: 'Recusas / Perdidos', value: refusalsCount, tone: refusalsCount > 0 ? 'danger' : 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 13. JANELA 24H
  // =========================================================================
  if (reportId === 'janela_24h') {
    const [convsRes, inboundMsgsRes] = await Promise.all([
      db
        .from('conversations')
        .select(
          'id, status, campaign_id, assigned_agent_id, last_message_at, updated_at, contact:contacts(id, name, phone)'
        )
        .gte('updated_at', startIso)
        .lte('updated_at', endIso)
        .order('last_message_at', { ascending: false })
        .limit(800),
      db
        .from('messages')
        .select('conversation_id, created_at')
        .eq('sender_type', 'customer')
        .gte('created_at', new Date(new Date(startIso).getTime() - 86400000 * 2).toISOString())
        .order('created_at', { ascending: false }),
    ])

    const lastInboundByConv = new Map<string, string>()
    for (const m of (inboundMsgsRes.data ?? []) as any[]) {
      if (m.conversation_id && !lastInboundByConv.has(m.conversation_id)) {
        lastInboundByConv.set(m.conversation_id, m.created_at)
      }
    }

    const nowMs = Date.now()
    const rows: AnalyticalReportRow[] = []
    let openWindowsCount = 0
    let expiringSoonCount = 0
    let expiredWindowsCount = 0

    for (const c of (convsRes.data ?? []) as any[]) {
      if (!matchesFilters(c.campaign_id, c.assigned_agent_id)) continue
      const lastInboundIso = lastInboundByConv.get(c.id)
      const expiresAtMs = lastInboundIso ? new Date(lastInboundIso).getTime() + 24 * 3600 * 1000 : 0
      const remainingSec = lastInboundIso ? Math.floor((expiresAtMs - nowMs) / 1000) : -1
      const isOpen = remainingSec > 0
      const isExpiringSoon = isOpen && remainingSec <= 3 * 3600

      if (isOpen) {
        openWindowsCount++
        if (isExpiringSoon) expiringSoonCount++
      } else {
        expiredWindowsCount++
      }

      const h = isOpen ? Math.floor(remainingSec / 3600) : 0
      const m = isOpen ? Math.floor((remainingSec % 3600) / 60) : 0

      const campName = c.campaign_id ? campaignMap.get(c.campaign_id) : 'Geral'
      const opName = c.assigned_agent_id ? profileMap.get(c.assigned_agent_id) || 'Operador' : 'Fila / Robô'

      rows.push({
        id: c.id,
        conversationId: c.id,
        cells: {
          lastInboundAt: {
            text: lastInboundIso ? formatDateTimeBR(lastInboundIso) : 'Sem msg do cliente',
            raw: lastInboundIso || '',
          },
          contactName: { text: c.contact?.name || 'Cliente' },
          phone: { text: c.contact?.phone || '—' },
          windowStatus: {
            text: isExpiringSoon
              ? 'Expira em Breve (<3h)'
              : isOpen
                ? 'Janela 24h Aberta'
                : 'Expirada (Requer Template)',
            badgeTone: isExpiringSoon ? 'warning' : isOpen ? 'success' : 'neutral',
          },
          remainingTime: {
            text: isOpen ? `${h}h ${String(m).padStart(2, '0')}m restantes` : 'Encerrada',
            raw: remainingSec,
          },
          campaignName: { text: campName || 'Geral' },
          operatorName: { text: opName },
          convStatus: {
            text: c.status === 'closed' ? 'Finalizada' : c.status === 'pending' ? 'Pendente' : 'Aberta',
            badgeTone: c.status === 'closed' ? 'neutral' : 'info',
          },
        },
      })
    }

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Janelas 24h Abertas Agora', value: openWindowsCount, tone: 'success' },
        { label: 'Expirando em menos de 3h', value: expiringSoonCount, tone: expiringSoonCount > 0 ? 'warning' : 'default' },
        { label: 'Janelas Expiradas', value: expiredWindowsCount, tone: 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 14. PRODUÇÃO DO OPERADOR
  // =========================================================================
  if (reportId === 'producao_operador') {
    const [convsRes, msgsRes, dealsRes, remindersRes] = await Promise.all([
      db
        .from('conversations')
        .select('id, status, assigned_agent_id, campaign_id, created_at, last_message_at, updated_at')
        .gte('updated_at', startIso)
        .lte('updated_at', endIso),
      db
        .from('messages')
        .select('id, conversation_id, sender_type, sender_id, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true }),
      db
        .from('deals')
        .select('id, user_id, assigned_to, value, status, created_at')
        .eq('status', 'won')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
      db
        .from('conversation_reminders')
        .select('id, user_id, created_at')
        .gte('created_at', startIso)
        .lte('created_at', endIso),
    ])

    const convs = (convsRes.data ?? []) as any[]
    const msgs = (msgsRes.data ?? []) as any[]
    const wonDeals = (dealsRes.data ?? []) as any[]
    const reminders = (remindersRes.data ?? []) as any[]

    const convAssignee = new Map<string, string>()
    for (const c of convs) {
      if (c.assigned_agent_id) convAssignee.set(c.id, c.assigned_agent_id)
    }

    const sentByUser = new Map<string, number>()
    const replyDiffsByUser = new Map<string, number[]>()
    const lastCustomerTsByConv = new Map<string, number>()

    for (const m of msgs) {
      const ts = new Date(m.created_at).getTime()
      if (m.sender_type === 'customer') {
        lastCustomerTsByConv.set(m.conversation_id, ts)
      } else if (m.sender_type === 'agent') {
        const uid = m.sender_id || convAssignee.get(m.conversation_id)
        if (uid) {
          sentByUser.set(uid, (sentByUser.get(uid) || 0) + 1)
          const custTs = lastCustomerTsByConv.get(m.conversation_id)
          if (custTs && ts >= custTs && ts - custTs < 86400000) {
            const list = replyDiffsByUser.get(uid) ?? []
            list.push((ts - custTs) / 1000)
            replyDiffsByUser.set(uid, list)
            lastCustomerTsByConv.delete(m.conversation_id)
          }
        }
      }
    }

    const rows: AnalyticalReportRow[] = []
    let teamTotalConvs = 0
    let teamTotalMsgs = 0
    let teamTotalDeals = 0
    let teamTotalValue = 0

    for (const prof of (profilesRes.data ?? []) as any[]) {
      if (prof.account_role === 'viewer') continue
      const uid = prof.user_id
      const userCamp = userCampaignMap.get(uid)
      if (!matchesFilters(userCamp?.id, uid)) continue

      const opConvs = convs.filter((c) => c.assigned_agent_id === uid)
      const openConvs = opConvs.filter((c) => c.status === 'open' || c.status === 'pending').length
      const closedConvs = opConvs.filter((c) => c.status === 'closed').length
      const totalConvs = opConvs.length
      const msgsSent = sentByUser.get(uid) || 0

      const tmrArr = replyDiffsByUser.get(uid) ?? []
      const avgTmr = tmrArr.length > 0 ? Math.round(tmrArr.reduce((a, b) => a + b, 0) / tmrArr.length) : 0

      const tmaArr: number[] = []
      for (const c of opConvs) {
        const dur = (new Date(c.last_message_at || c.updated_at || c.created_at).getTime() - new Date(c.created_at).getTime()) / 1000
        if (dur > 0 && dur < 86400 * 7) tmaArr.push(dur)
      }
      const avgTma = tmaArr.length > 0 ? Math.round(tmaArr.reduce((a, b) => a + b, 0) / tmaArr.length) : 0

      const opDeals = wonDeals.filter((d) => (d.assigned_to || d.user_id) === uid)
      const dealsCount = opDeals.length
      const dealsVal = opDeals.reduce((acc, d) => acc + Number(d.value || 0), 0)
      const promisesCount = reminders.filter((r) => r.user_id === uid).length
      const convRate = totalConvs > 0 ? Math.min(100, Math.round((dealsCount / totalConvs) * 1000) / 10) : 0

      teamTotalConvs += totalConvs
      teamTotalMsgs += msgsSent
      teamTotalDeals += dealsCount
      teamTotalValue += dealsVal

      rows.push({
        id: uid,
        cells: {
          operatorName: { text: prof.full_name || 'Operador' },
          campaignName: { text: userCamp?.name || 'Geral' },
          totalConvs: { text: String(totalConvs), raw: totalConvs },
          openConvs: { text: String(openConvs), raw: openConvs },
          closedConvs: { text: String(closedConvs), raw: closedConvs },
          messagesSent: { text: String(msgsSent), raw: msgsSent },
          tmr: { text: formatSeconds(avgTmr), raw: avgTmr },
          tma: { text: formatSeconds(avgTma), raw: avgTma },
          promisesCount: { text: String(promisesCount), raw: promisesCount },
          wonDealsCount: { text: String(dealsCount), raw: dealsCount },
          wonDealsValue: { text: formatBRL(dealsVal), raw: dealsVal },
          conversionRate: { text: `${convRate.toFixed(1)}%`, raw: convRate },
        },
      })
    }

    rows.sort((a, b) => Number(b.cells.totalConvs.raw || 0) - Number(a.cells.totalConvs.raw || 0))

    return {
      reportId,
      generatedAt: new Date().toISOString(),
      startDate,
      endDate,
      totalRows: rows.length,
      summary: [
        { label: 'Operadores Avaliados', value: rows.length, tone: 'primary' },
        { label: 'Atendimentos no Período', value: teamTotalConvs, tone: 'default' },
        { label: 'Mensagens Enviadas', value: teamTotalMsgs, tone: 'default' },
        { label: 'Acordos da Equipe', value: teamTotalDeals, sublabel: formatBRL(teamTotalValue), tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 15. NÃO ENTREGUE (FALHAS)
  // =========================================================================
  const [failedRecipRes, failedMsgsRes] = await Promise.all([
    db
      .from('broadcast_recipients')
      .select(
        'id, error_message, created_at, contact:contacts(id, name, phone), broadcast:broadcasts(id, name, template_name)'
      )
      .eq('status', 'failed')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(500),
    db
      .from('messages')
      .select(
        'id, conversation_id, content_text, template_name, created_at, conversation:conversations(id, campaign_id, assigned_agent_id, contact:contacts(id, name, phone))'
      )
      .eq('status', 'failed')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const rows: AnalyticalReportRow[] = []

  for (const r of (failedRecipRes.data ?? []) as any[]) {
    rows.push({
      id: `fail-br-${r.id}`,
      cells: {
        datetime: { text: formatDateTimeBR(r.created_at), raw: r.created_at },
        contactName: { text: r.contact?.name || 'Contato' },
        phone: { text: r.contact?.phone || '—' },
        origin: { text: `Disparo · ${r.broadcast?.name || 'Lote'}`, badgeTone: 'danger' },
        templateOrText: { text: r.broadcast?.template_name || 'Template' },
        errorReason: { text: r.error_message || 'Falha reportada pela API do WhatsApp Business (Meta)' },
      },
    })
  }

  for (const m of (failedMsgsRes.data ?? []) as any[]) {
    const conv = m.conversation
    if (!matchesFilters(conv?.campaign_id, conv?.assigned_agent_id)) continue
    rows.push({
      id: `fail-msg-${m.id}`,
      conversationId: m.conversation_id,
      cells: {
        datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
        contactName: { text: conv?.contact?.name || 'Cliente' },
        phone: { text: conv?.contact?.phone || '—' },
        origin: { text: 'Mensagem na Conversa', badgeTone: 'warning' },
        templateOrText: { text: m.template_name || (m.content_text || '').slice(0, 60) || 'Mensagem' },
        errorReason: { text: 'Não entregue pela Meta (janela fechada ou número inválido)' },
      },
    })
  }

  rows.sort((a, b) => String(b.cells.datetime.raw || '').localeCompare(String(a.cells.datetime.raw || '')))

  return {
    reportId: 'nao_entregue',
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    totalRows: rows.length,
    summary: [
      { label: 'Total Não Entregue / Falhas', value: rows.length, tone: rows.length > 0 ? 'danger' : 'success' },
    ],
    rows,
  }
}

/**
 * Generates an Excel-compatible UTF-8 BOM CSV string with `;` separator.
 */
export function exportAnalyticalReportToCsv(
  definition: AnalyticalReportDefinition,
  rows: AnalyticalReportRow[]
): string {
  const escapeCsvCell = (val: string) => {
    const cleaned = String(val ?? '').replace(/\r?\n|\r/g, ' ').trim()
    if (cleaned.includes(';') || cleaned.includes('"')) {
      return `"${cleaned.replace(/"/g, '""')}"`
    }
    return cleaned
  }

  const headerLine = definition.columns.map((c) => escapeCsvCell(c.label)).join(';')
  const dataLines = rows.map((row) =>
    definition.columns
      .map((col) => {
        const cell = row.cells[col.key]
        return escapeCsvCell(cell?.text ?? '')
      })
      .join(';')
  )

  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n')
}
