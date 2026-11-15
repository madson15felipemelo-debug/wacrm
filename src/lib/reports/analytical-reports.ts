import type { SupabaseClient } from '@supabase/supabase-js'
import { formatSeconds } from '@/lib/dashboard/operational-queries'

export type AnalyticalReportId =
  | 'relatorio_completo_detalhado'
  | 'atendimentos_detalhado'
  | 'tempos_sla_operador'
  | 'atuacao_robo_ia_humano'
  | 'tabulacoes_desfechos'
  | 'auditoria_distribuicao_filas'
  | 'disparos_analitico'
  | 'lotes_disparos_periodo'
  | 'retornos_agendamentos'
  | 'janela_24h_meta'
  | 'higienizacao_bloqueios_falhas'

export interface AnalyticalReportDefinition {
  id: AnalyticalReportId
  label: string
  category: 'completo_master' | 'atendimento' | 'canais_tabulacao' | 'disparos_higienizacao'
  categoryLabel: string
  description: string
  columns: {
    key: string
    label: string
    align?: 'left' | 'center' | 'right'
    type?: 'text' | 'phone' | 'badge' | 'currency' | 'percent' | 'datetime' | 'mono'
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
  cells: Record<
    string,
    {
      text: string
      raw?: string | number
      badgeTone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
      subtext?: string
    }
  >
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
  endDate: string // YYYY-MM-DD
  campaignId?: string
  operatorId?: string
  channelFilter?: 'all' | 'human' | 'bot' | 'ai'
}

export function adaptTextToSalesMode(text: string): string {
  return text
    .replace(/Devedores/g, 'Leads / Clientes')
    .replace(/devedores/g, 'leads / clientes')
    .replace(/Devedor/g, 'Lead / Cliente')
    .replace(/devedor/g, 'lead / cliente')
    .replace(/Carteiras/g, 'Funis / Equipes')
    .replace(/carteiras/g, 'funis / equipes')
    .replace(/Carteira Principal/g, 'Funil / Equipe Principal')
    .replace(/Carteira Destino/g, 'Funil / Equipe Destino')
    .replace(/Carteira/g, 'Funil / Equipe')
    .replace(/carteira/g, 'funil / equipe')
    .replace(/Operadores Humanos/g, 'Consultores Comerciais')
    .replace(/operadores humanos/g, 'consultores comerciais')
    .replace(/Operador Humano/g, 'Consultor Comercial')
    .replace(/Operadores/g, 'Consultores')
    .replace(/operadores/g, 'consultores')
    .replace(/Operador/g, 'Consultor')
    .replace(/operador/g, 'consultor')
    .replace(/Acordos Ganhos/g, 'Vendas / Negócios Ganhos')
    .replace(/Acordos/g, 'Vendas / Fechamentos')
    .replace(/acordos/g, 'vendas / fechamentos')
    .replace(/Acordo/g, 'Fechamento')
    .replace(/acordo/g, 'fechamento')
    .replace(/Promessas/g, 'Follow-ups / Propostas')
    .replace(/promessas/g, 'follow-ups / propostas')
    .replace(/Promessa/g, 'Proposta')
    .replace(/promessa/g, 'proposta')
    .replace(/Credor \/ Contrato/g, 'Origem / Negócio')
    .replace(/CPF \/ Credor/g, 'Doc / Origem')
    .replace(/triagem de CPF/gi, 'qualificação de leads')
    .replace(/CPFs consultados/gi, 'Leads qualificados')
    .replace(/CPF Triado/g, 'Doc / ID Lead')
    .replace(/Responsabilidade CPF/g, 'Fidelização do Lead')
}

export function getAnalyticalReportDefinitions(
  mode: 'collection' | 'sales' = 'collection',
): AnalyticalReportDefinition[] {
  if (mode === 'collection') return ANALYTICAL_REPORT_DEFINITIONS
  return ANALYTICAL_REPORT_DEFINITIONS.map((def) => ({
    ...def,
    label: adaptTextToSalesMode(def.label),
    categoryLabel: adaptTextToSalesMode(def.categoryLabel),
    description: adaptTextToSalesMode(def.description),
    columns: def.columns.map((col) => ({
      ...col,
      label: adaptTextToSalesMode(col.label),
    })),
  }))
}

export const ANALYTICAL_REPORT_DEFINITIONS: AnalyticalReportDefinition[] = [
  {
    id: 'relatorio_completo_detalhado',
    label: 'Relatório completo detalhado 360° (Todas as opções: Tempos, Canais, Funil, Filas, Disparos e Higienização)',
    category: 'completo_master',
    categoryLabel: 'Relatório Geral Completo (360°)',
    description:
      'Visão master unificada com todas as colunas do CRM em uma única base: dados do contato, CPF/credor, campos personalizados, carteira, operador, jornada Robô/IA/Humano, TME, TMR, TMA, SLA, janela 24h Meta, distribuição/filas, tabulação, etiquetas, etapa e valor no funil, agendamentos, notas internas, disparos de origem e higienização/opt-out.',
    columns: [
      { key: 'startedAt', label: 'Abertura Conversa', type: 'datetime' },
      { key: 'lastInteractionAt', label: 'Última Interação', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'cpf', label: 'CPF', type: 'mono' },
      { key: 'creditorContract', label: 'Credor / Contrato', type: 'text' },
      { key: 'customFieldsSummary', label: 'Campos Personalizados', type: 'text' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Humano', type: 'text' },
      { key: 'convStatus', label: 'Status Conversa', type: 'badge', align: 'center' },
      { key: 'closedBy', label: 'Quem Encerrou / Situação', type: 'badge', align: 'center' },
      { key: 'channelJourney', label: 'Atuação (Robô / IA / Humano)', type: 'badge', align: 'center' },
      { key: 'handoffState', label: 'Transbordo / Retenção', type: 'badge', align: 'center' },
      { key: 'msgBreakdown', label: 'Volume Msgs (R / IA / H / C)', type: 'mono', align: 'center' },
      { key: 'waitTimeFirstReply', label: 'Espera 1º Atend. (TME)', type: 'mono', align: 'right' },
      { key: 'operatorTmr', label: 'TMR Operador', type: 'mono', align: 'right' },
      { key: 'customerTmr', label: 'TMR Devedor', type: 'mono', align: 'right' },
      { key: 'totalTma', label: 'Duração (TMA)', type: 'mono', align: 'right' },
      { key: 'slaStatus', label: 'SLA (<5m)', type: 'badge', align: 'center' },
      { key: 'windowStatus', label: 'Janela Meta 24h', type: 'badge', align: 'center' },
      { key: 'remainingTime', label: 'Tempo Livre 24h', type: 'mono', align: 'right' },
      { key: 'waitingWho', label: 'Quem Aguarda Resposta', type: 'badge', align: 'center' },
      { key: 'idleTime', label: 'Tempo Sem Interação', type: 'mono', align: 'right' },
      { key: 'primaryTabulation', label: 'Tabulação Principal', type: 'badge', align: 'center' },
      { key: 'tagsList', label: 'Etiquetas (Tags)', type: 'text' },
      { key: 'funnelStage', label: 'Etapa do Funil / Acordo', type: 'badge', align: 'center' },
      { key: 'dealValue', label: 'Valor Acordo / Negócio', type: 'currency', align: 'right' },
      { key: 'reminderStatus', label: 'Status Agendamento', type: 'badge', align: 'center' },
      { key: 'reminderDetail', label: 'Data / Nota do Agendamento', type: 'text' },
      { key: 'closingNote', label: 'Nota Interna / Observação', type: 'text' },
      { key: 'flowInfo', label: 'Fluxo / Nó do Robô', type: 'text' },
      { key: 'aiInfo', label: 'Atuação IA / Resumo Handoff', type: 'text' },
      { key: 'distributionRule', label: 'Regra de Distribuição', type: 'badge', align: 'center' },
      { key: 'distributionDetail', label: 'Resultado / Motivo da Fila', type: 'text' },
      { key: 'broadcastBatch', label: 'Campanha de Disparo (Lote)', type: 'text' },
      { key: 'broadcastTemplate', label: 'Template Meta', type: 'mono' },
      { key: 'broadcastStatus', label: 'Status do Disparo', type: 'badge', align: 'center' },
      { key: 'hygieneStatus', label: 'Higienização / Bloqueio', type: 'badge', align: 'center' },
      { key: 'hygieneDetail', label: 'Motivo Opt-out / Erro Meta / Terceiro', type: 'text' },
      { key: 'lastMessagePreview', label: 'Última Mensagem', type: 'text' },
    ],
  },
  {
    id: 'atendimentos_detalhado',
    label: 'Atendimentos detalhado (TME, TMR, Canal e Tabulação)',
    category: 'atendimento',
    categoryLabel: 'Atendimento, Tempos & Operadores',
    description:
      'Raio-X completo de cada conversa: tempo de espera na fila (TME), tempo médio de resposta do operador (TMR), atuação Humano/Robô/IA, quem encerrou e tabulação final.',
    columns: [
      { key: 'startedAt', label: 'Início / Últ. Interação', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'cpfContract', label: 'CPF / Credor', type: 'mono' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'channelJourney', label: 'Atuação (Robô / IA / Humano)', type: 'badge', align: 'center' },
      { key: 'operatorName', label: 'Operador Humano', type: 'text' },
      { key: 'waitTimeFirstReply', label: 'Espera 1º Atend. (TME)', type: 'mono', align: 'right' },
      { key: 'operatorTmr', label: 'TMR Operador', type: 'mono', align: 'right' },
      { key: 'customerTmr', label: 'TMR Devedor', type: 'mono', align: 'right' },
      { key: 'totalTma', label: 'Duração (TMA)', type: 'mono', align: 'right' },
      { key: 'closedBy', label: 'Quem Encerrou / Situação', type: 'badge', align: 'center' },
      { key: 'tabulation', label: 'Tabulação / Finalização', type: 'badge', align: 'center' },
      { key: 'tabulationDetail', label: 'Nota / Detalhe Final', type: 'text' },
    ],
  },
  {
    id: 'tempos_sla_operador',
    label: 'Produção e tempos por operador (TME, TMR, TMA e SLA)',
    category: 'atendimento',
    categoryLabel: 'Atendimento, Tempos & Operadores',
    description:
      'Desempenho individual dos operadores humanos: tempo médio para assumir a fila (TME), tempo médio para responder o devedor (TMR), duração do atendimento (TMA), encerramentos e conversões.',
    columns: [
      { key: 'operatorName', label: 'Operador', type: 'text' },
      { key: 'campaignName', label: 'Carteira Principal', type: 'text' },
      { key: 'totalConvs', label: 'Total Atend.', type: 'mono', align: 'right' },
      { key: 'openConvs', label: 'Em Aberto', type: 'mono', align: 'right' },
      { key: 'closedByOperator', label: 'Encerrados', type: 'mono', align: 'right' },
      { key: 'avgWaitTme', label: 'Espera 1ª Resp (TME)', type: 'mono', align: 'right' },
      { key: 'avgOperatorTmr', label: 'TMR ao Devedor', type: 'mono', align: 'right' },
      { key: 'avgTotalTma', label: 'TMA Total', type: 'mono', align: 'right' },
      { key: 'slaCompliance', label: 'Dentro do SLA (<5m)', type: 'percent', align: 'right' },
      { key: 'messagesSent', label: 'Msgs Enviadas', type: 'mono', align: 'right' },
      { key: 'remindersCreated', label: 'Agendamentos', type: 'mono', align: 'right' },
      { key: 'wonDeals', label: 'Acordos Ganhos', type: 'mono', align: 'right' },
    ],
  },
  {
    id: 'atuacao_robo_ia_humano',
    label: 'Jornada de canais: Robô (Fluxo) vs. IA vs. Humano',
    category: 'canais_tabulacao',
    categoryLabel: 'Canais (Robô / IA / Humano) & Tabulações',
    description:
      'Auditoria de como cada atendimento percorreu o Robô de Fluxos, o Agente de IA e o Operador Humano, incluindo motivo de transbordo, resumo da IA e quem finalizou.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'activeEngine', label: 'Participação nos Canais', type: 'badge', align: 'center' },
      { key: 'msgBreakdown', label: 'Volume de Msgs (R / IA / H / C)', type: 'mono', align: 'center' },
      { key: 'flowInfo', label: 'Fluxo / Nó do Robô', type: 'text' },
      { key: 'aiInfo', label: 'Interações IA / Resumo Handoff', type: 'text' },
      { key: 'handoffState', label: 'Transbordo p/ Humano', type: 'badge', align: 'center' },
      { key: 'operatorName', label: 'Operador que Assumiu', type: 'text' },
      { key: 'closedBy', label: 'Quem Encerrou', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'tabulacoes_desfechos',
    label: 'Tabulações, etiquetas e desfechos de atendimento',
    category: 'canais_tabulacao',
    categoryLabel: 'Canais (Robô / IA / Humano) & Tabulações',
    description:
      'Relatório analítico das finalizações de atendimento consolidando Etiquetas (Tags), Etapa no Funil (Acordo/Promessa/Perdido), Lembretes e Notas Internas de fechamento.',
    columns: [
      { key: 'datetime', label: 'Data Atualização', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'cpf', label: 'CPF', type: 'mono' },
      { key: 'primaryTabulation', label: 'Tabulação Principal', type: 'badge', align: 'center' },
      { key: 'tagsList', label: 'Etiquetas (Tags)', type: 'text' },
      { key: 'funnelStage', label: 'Etapa do Funil / Acordo', type: 'badge', align: 'center' },
      { key: 'closingNote', label: 'Nota Interna / Observação', type: 'text' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
      { key: 'convStatus', label: 'Situação da Conversa', type: 'badge', align: 'center' },
    ],
  },
  {
    id: 'auditoria_distribuicao_filas',
    label: 'Auditoria de distribuição, triagem de CPF e filas',
    category: 'atendimento',
    categoryLabel: 'Atendimento, Tempos & Operadores',
    description:
      'Histórico exato do motor de distribuição inteligente: CPFs consultados, carteira identificada, estratégia usada (Responsabilidade CPF, Menos Ocupado, Round-Robin) e tempo de roteamento.',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'cpf', label: 'CPF Triado', type: 'mono' },
      { key: 'creditorContract', label: 'Credor / Contrato', type: 'text' },
      { key: 'campaignName', label: 'Carteira Destino', type: 'text' },
      { key: 'modeStrategy', label: 'Regra de Distribuição', type: 'badge', align: 'center' },
      { key: 'routingStatus', label: 'Resultado da Fila', type: 'badge', align: 'center' },
      { key: 'assignedOperator', label: 'Operador Designado', type: 'text' },
      { key: 'reason', label: 'Detalhe / Motivo', type: 'text' },
    ],
  },
  {
    id: 'retornos_agendamentos',
    label: 'Agendamentos de retorno e promessas (Lembretes)',
    category: 'canais_tabulacao',
    categoryLabel: 'Canais (Robô / IA / Humano) & Tabulações',
    description:
      'Controle analítico de todos os lembretes e retornos agendados pelos operadores nas conversas, destacando compromissos no prazo, atrasados e concluídos.',
    columns: [
      { key: 'remindAt', label: 'Data Programada', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'comment', label: 'Compromisso / Anotação', type: 'text' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
      { key: 'status', label: 'Status do Retorno', type: 'badge', align: 'center' },
      { key: 'doneAt', label: 'Concluído em', type: 'datetime' },
    ],
  },
  {
    id: 'janela_24h_meta',
    label: 'Controle de janela 24h Meta e quem aguarda resposta',
    category: 'atendimento',
    categoryLabel: 'Atendimento, Tempos & Operadores',
    description:
      'Monitoramento da janela gratuita de 24h da Meta por conversa, indicando tempo restante para envio livre e se a conversa aguarda resposta do operador ou do devedor.',
    columns: [
      { key: 'lastInboundAt', label: 'Última Msg do Devedor', type: 'datetime' },
      { key: 'contactName', label: 'Devedor / Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'windowStatus', label: 'Janela Meta 24h', type: 'badge', align: 'center' },
      { key: 'remainingTime', label: 'Tempo Restante', type: 'mono', align: 'right' },
      { key: 'waitingWho', label: 'Quem Aguarda Resposta', type: 'badge', align: 'center' },
      { key: 'idleTime', label: 'Tempo Sem Interação', type: 'mono', align: 'right' },
      { key: 'campaignName', label: 'Carteira', type: 'text' },
      { key: 'operatorName', label: 'Operador Responsável', type: 'text' },
    ],
  },
  {
    id: 'disparos_analitico',
    label: 'Envios analíticos de disparos (Destinatário a Destinatário)',
    category: 'disparos_higienizacao',
    categoryLabel: 'Disparos em Massa & Higienização',
    description:
      'Rastreamento individual de cada contato acionado via disparo de template: horário de envio, entrega, leitura, resposta do cliente, tempo até responder e erros da Meta.',
    columns: [
      { key: 'sentAt', label: 'Data / Hora Envio', type: 'datetime' },
      { key: 'contactName', label: 'Contato', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'batchName', label: 'Campanha de Disparo', type: 'text' },
      { key: 'templateName', label: 'Template Meta', type: 'mono' },
      { key: 'deliveryStatus', label: 'Status na Meta', type: 'badge', align: 'center' },
      { key: 'readAt', label: 'Leitura', type: 'datetime' },
      { key: 'repliedAt', label: 'Resposta / Tempo', type: 'text' },
      { key: 'errorDetail', label: 'Observação / Erro Meta', type: 'text' },
    ],
  },
  {
    id: 'lotes_disparos_periodo',
    label: 'Desempenho consolidado de lotes disparados no período',
    category: 'disparos_higienizacao',
    categoryLabel: 'Disparos em Massa & Higienização',
    description:
      'Visão analítica por campanha de disparo (Broadcast): base acionada, volume entregue, lido, respondido, taxa de conversão em resposta e falhas.',
    columns: [
      { key: 'createdAt', label: 'Data do Lote', type: 'datetime' },
      { key: 'batchName', label: 'Nome da Campanha', type: 'text' },
      { key: 'templateName', label: 'Template Utilizado', type: 'mono' },
      { key: 'status', label: 'Status', type: 'badge', align: 'center' },
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
    id: 'higienizacao_bloqueios_falhas',
    label: 'Higienização de base: Opt-outs, falhas Meta e nº de terceiros',
    category: 'disparos_higienizacao',
    categoryLabel: 'Disparos em Massa & Higienização',
    description:
      'Relatório de saneamento da carteira: contatos que pediram bloqueio (Opt-out), falhas de entrega na Meta (números inexistentes/bloqueados) e relatos de "não sou eu / engano".',
    columns: [
      { key: 'datetime', label: 'Data / Hora', type: 'datetime' },
      { key: 'contactName', label: 'Contato Cadastrado', type: 'text' },
      { key: 'phone', label: 'Telefone', type: 'phone' },
      { key: 'cpf', label: 'CPF Vinculado', type: 'mono' },
      { key: 'occurrenceType', label: 'Tipo de Ocorrência', type: 'badge', align: 'center' },
      { key: 'reasonDetail', label: 'Motivo / Mensagem / Erro Meta', type: 'text' },
      { key: 'origin', label: 'Origem', type: 'text' },
      { key: 'contactState', label: 'Situação na Base', type: 'badge', align: 'center' },
    ],
  },
]

const UNRECOGNIZED_REGEX =
  /\b(n[aã]o sou eu|n[aã]o conhe[cç]o|n[aã]o reconhe[cç]o|engano|n[uú]mero errado|pessoa errada|desconhe[cç]o|terceiro|outro dono)\b/i

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

function formatElapsedSince(iso?: string | null): string {
  if (!iso) return '—'
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (diffSec < 60) return `${diffSec}s`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    const m = Math.floor((diffSec % 3600) / 60)
    return `${h}h ${m}m`
  }
  const days = Math.floor(diffSec / 86400)
  const remH = Math.floor((diffSec % 86400) / 3600)
  return `${days}d ${remH}h`
}

function avgSec(arr: number[]): number {
  if (!arr.length) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

export async function generateAnalyticalReport(
  db: SupabaseClient,
  params: AnalyticalReportFilterParams
): Promise<AnalyticalReportResult> {
  const { reportId, startDate, endDate, campaignId, operatorId, channelFilter = 'all' } = params

  const startIso = new Date(`${startDate}T00:00:00`).toISOString()
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString()

  // Shared lookup tables
  const [profilesRes, campaignsRes, campOpsRes, stagesRes, flowsRes] = await Promise.all([
    db.from('profiles').select('user_id, full_name, account_role'),
    db.from('distribution_campaigns').select('id, name, code'),
    db.from('campaign_operators').select('campaign_id, user_id'),
    db.from('pipeline_stages').select('id, name, position'),
    db.from('flows').select('id, name'),
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

  const flowNameMap = new Map<string, string>()
  for (const f of (flowsRes.data ?? []) as any[]) {
    flowNameMap.set(f.id, f.name)
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
  // 1. ATENDIMENTOS DETALHADO & RELATÓRIO COMPLETO 360° (MASTER)
  // =========================================================================
  if (
    reportId === 'relatorio_completo_detalhado' ||
    reportId === 'atendimentos_detalhado' ||
    reportId === 'atuacao_robo_ia_humano' ||
    reportId === 'tabulacoes_desfechos' ||
    reportId === 'janela_24h_meta'
  ) {
    const [
      convsRes,
      msgsRes,
      dealsRes,
      remindersRes,
      notesRes,
      flowRunsRes,
      auditsRes,
      cpfRespRes,
      customFieldsRes,
      customValuesRes,
      broadcastRecipsRes,
    ] = await Promise.all([
      db
        .from('conversations')
        .select(
          'id, contact_id, status, assigned_agent_id, campaign_id, last_message_text, last_message_from, last_message_at, ai_autoreply_disabled, ai_reply_count, ai_handoff_summary, created_at, updated_at, contact:contacts(id, name, phone, opted_out_at, opted_out_reason, contact_tags(tags(id, name)))'
        )
        .gte('updated_at', startIso)
        .lte('updated_at', endIso)
        .order('last_message_at', { ascending: false })
        .limit(800),
      db
        .from('messages')
        .select(
          'id, conversation_id, sender_type, sender_id, content_type, content_text, ai_generated, created_at'
        )
        .gte('created_at', new Date(new Date(startIso).getTime() - 86400000 * 3).toISOString())
        .lte('created_at', endIso)
        .order('created_at', { ascending: true }),
      db
        .from('deals')
        .select('id, contact_id, conversation_id, title, value, status, stage_id, notes, updated_at')
        .order('updated_at', { ascending: false }),
      db
        .from('conversation_reminders')
        .select('id, conversation_id, contact_id, remind_at, comment, done_at, created_at')
        .order('created_at', { ascending: false }),
      db
        .from('conversation_notes')
        .select('id, conversation_id, author_name, body, created_at')
        .order('created_at', { ascending: false }),
      db
        .from('flow_runs')
        .select('id, flow_id, conversation_id, contact_id, status, current_node_key, end_reason, started_at, ended_at')
        .order('started_at', { ascending: false }),
      db
        .from('distribution_audit_logs')
        .select('id, conversation_id, contact_id, cpf, campaign_id, campaign_name, assigned_agent_id, assigned_agent_name, distribution_mode, strategy_used, status, reason, created_at')
        .order('created_at', { ascending: false }),
      db
        .from('cpf_responsibilities')
        .select('cpf, creditor_name, contract_ref, debtor_name'),
      db.from('custom_fields').select('id, field_name'),
      db.from('contact_custom_values').select('contact_id, custom_field_id, value'),
      db
        .from('broadcast_recipients')
        .select('id, contact_id, status, sent_at, delivered_at, read_at, replied_at, error_message, created_at, broadcast:broadcasts(id, name, template_name)')
        .order('created_at', { ascending: false })
        .limit(1000),
    ])

    const convs = (convsRes.data ?? []) as any[]
    const msgs = (msgsRes.data ?? []) as any[]

    // Group messages per conversation
    const msgsByConv = new Map<string, any[]>()
    for (const m of msgs) {
      const list = msgsByConv.get(m.conversation_id)
      if (list) list.push(m)
      else msgsByConv.set(m.conversation_id, [m])
    }

    // Map CPF & Creditor by conversation/contact & latest distribution audit
    const cpfInfoByConv = new Map<string, { cpf: string; creditor?: string; contract?: string }>()
    const auditByConv = new Map<string, any>()
    const auditByContact = new Map<string, any>()
    const cpfRespByCpf = new Map<string, { creditor?: string; contract?: string }>()
    for (const r of (cpfRespRes.data ?? []) as any[]) {
      if (r.cpf) {
        cpfRespByCpf.set(String(r.cpf).replace(/\D/g, ''), {
          creditor: r.creditor_name,
          contract: r.contract_ref,
        })
      }
    }
    for (const a of (auditsRes.data ?? []) as any[]) {
      if (a.conversation_id && !auditByConv.has(a.conversation_id)) {
        auditByConv.set(a.conversation_id, a)
      }
      if (a.contact_id && !auditByContact.has(a.contact_id)) {
        auditByContact.set(a.contact_id, a)
      }
      if (a.conversation_id && a.cpf && !cpfInfoByConv.has(a.conversation_id)) {
        const cleanCpf = String(a.cpf).replace(/\D/g, '')
        const resp = cpfRespByCpf.get(cleanCpf)
        cpfInfoByConv.set(a.conversation_id, {
          cpf: a.cpf,
          creditor: resp?.creditor,
          contract: resp?.contract,
        })
      }
    }

    // Latest broadcast recipient per contact
    const broadcastByContact = new Map<string, any>()
    for (const br of (broadcastRecipsRes.data ?? []) as any[]) {
      if (br.contact_id && !broadcastByContact.has(br.contact_id)) {
        broadcastByContact.set(br.contact_id, br)
      }
    }

    // Also map custom field values (CPF, Credor, Contrato + all custom fields) per contact_id
    const fieldNameById = new Map<string, string>()
    const rawFieldNameById = new Map<string, string>()
    for (const cf of (customFieldsRes.data ?? []) as any[]) {
      fieldNameById.set(cf.id, String(cf.field_name || '').toLowerCase())
      rawFieldNameById.set(cf.id, String(cf.field_name || ''))
    }
    const customByContact = new Map<string, { cpf?: string; credor?: string; contrato?: string; allPairs: string[] }>()
    for (const cv of (customValuesRes.data ?? []) as any[]) {
      if (!cv.contact_id || !cv.value) continue
      const fName = fieldNameById.get(cv.custom_field_id)
      const rawName = rawFieldNameById.get(cv.custom_field_id)
      if (!fName) continue
      const entry = customByContact.get(cv.contact_id) ?? { allPairs: [] }
      if (fName === 'cpf') entry.cpf = cv.value
      else if (fName === 'credor') entry.credor = cv.value
      else if (fName === 'contrato') entry.contrato = cv.value
      if (rawName) entry.allPairs.push(`${rawName}: ${cv.value}`)
      customByContact.set(cv.contact_id, entry)
    }

    // Latest deal by conversation or contact
    const dealByConv = new Map<string, any>()
    const dealByContact = new Map<string, any>()
    for (const d of (dealsRes.data ?? []) as any[]) {
      if (d.conversation_id && !dealByConv.has(d.conversation_id)) dealByConv.set(d.conversation_id, d)
      if (d.contact_id && !dealByContact.has(d.contact_id)) dealByContact.set(d.contact_id, d)
    }

    // Latest reminder by conversation
    const reminderByConv = new Map<string, any>()
    for (const r of (remindersRes.data ?? []) as any[]) {
      if (r.conversation_id && !reminderByConv.has(r.conversation_id)) {
        reminderByConv.set(r.conversation_id, r)
      }
    }

    // Latest internal note by conversation
    const noteByConv = new Map<string, any>()
    for (const n of (notesRes.data ?? []) as any[]) {
      if (n.conversation_id && !noteByConv.has(n.conversation_id)) {
        noteByConv.set(n.conversation_id, n)
      }
    }

    // Latest flow run by conversation or contact
    const flowRunByConv = new Map<string, any>()
    const flowRunByContact = new Map<string, any>()
    for (const fr of (flowRunsRes.data ?? []) as any[]) {
      if (fr.conversation_id && !flowRunByConv.has(fr.conversation_id)) {
        flowRunByConv.set(fr.conversation_id, fr)
      }
      if (fr.contact_id && !flowRunByContact.has(fr.contact_id)) {
        flowRunByContact.set(fr.contact_id, fr)
      }
    }

    // Helper to compute full per-conversation telemetry
    const analyzeConversation = (c: any) => {
      const cMsgs = msgsByConv.get(c.id) ?? []
      let humanMsgs = 0
      let botMsgs = 0
      let aiMsgs = 0
      let customerMsgs = 0

      let firstCustomerTs: number | null = null
      let firstHumanReplyAfterCustomerTs: number | null = null
      let lastInboundIso: string | null = null
      let lastHumanSenderId: string | null = null
      let wrongPartyMsg: string | null = null

      const operatorReplyDiffsSec: number[] = []
      const customerReplyDiffsSec: number[] = []
      let lastTurn: { role: 'customer' | 'agent' | 'bot'; ts: number } | null = null

      for (const m of cMsgs) {
        const ts = new Date(m.created_at).getTime()
        if (m.sender_type === 'customer') {
          customerMsgs++
          lastInboundIso = m.created_at
          if (firstCustomerTs === null) firstCustomerTs = ts
          if (!wrongPartyMsg && m.content_text && UNRECOGNIZED_REGEX.test(String(m.content_text))) {
            wrongPartyMsg = String(m.content_text).trim()
          }
          if (lastTurn && lastTurn.role !== 'customer') {
            const diff = (ts - lastTurn.ts) / 1000
            if (diff >= 0 && diff < 86400) customerReplyDiffsSec.push(diff)
          }
          lastTurn = { role: 'customer', ts }
        } else if (m.sender_type === 'agent') {
          humanMsgs++
          if (m.sender_id) lastHumanSenderId = m.sender_id
          if (firstCustomerTs !== null && firstHumanReplyAfterCustomerTs === null && ts >= firstCustomerTs) {
            firstHumanReplyAfterCustomerTs = ts
          }
          if (lastTurn && lastTurn.role === 'customer') {
            const diff = (ts - lastTurn.ts) / 1000
            if (diff >= 0 && diff < 86400) operatorReplyDiffsSec.push(diff)
          }
          lastTurn = { role: 'agent', ts }
        } else {
          // sender_type === 'bot'
          if (m.ai_generated) aiMsgs++
          else botMsgs++
          lastTurn = { role: 'bot', ts }
        }
      }

      if ((c.ai_reply_count || 0) > aiMsgs) {
        aiMsgs = Number(c.ai_reply_count || 0)
      }

      // Channel Journey Classification
      const usedBot = botMsgs > 0 || flowRunByConv.has(c.id)
      const usedAi = aiMsgs > 0 || Boolean(c.ai_handoff_summary)
      const usedHuman = humanMsgs > 0 || Boolean(c.assigned_agent_id)

      let channelLabel = 'Aguardando Interação'
      let channelTone: 'primary' | 'info' | 'success' | 'warning' | 'neutral' = 'neutral'
      let dominantChannel: 'human' | 'bot' | 'ai' = 'human'

      if (usedBot && usedAi && usedHuman) {
        channelLabel = 'Robô → IA → Humano'
        channelTone = 'primary'
        dominantChannel = 'human'
      } else if (usedBot && usedHuman) {
        channelLabel = 'Robô → Humano'
        channelTone = 'primary'
        dominantChannel = 'human'
      } else if (usedAi && usedHuman) {
        channelLabel = 'IA → Humano'
        channelTone = 'primary'
        dominantChannel = 'human'
      } else if (usedHuman) {
        channelLabel = 'Agente Humano'
        channelTone = 'info'
        dominantChannel = 'human'
      } else if (usedAi) {
        channelLabel = '100% Agente IA'
        channelTone = 'success'
        dominantChannel = 'ai'
      } else if (usedBot) {
        channelLabel = '100% Robô (Fluxo)'
        channelTone = 'warning'
        dominantChannel = 'bot'
      }

      // Wait time for 1st human reply (TME)
      const waitSec =
        firstCustomerTs !== null && firstHumanReplyAfterCustomerTs !== null
          ? Math.max(0, Math.round((firstHumanReplyAfterCustomerTs - firstCustomerTs) / 1000))
          : 0

      const opTmrSec = avgSec(operatorReplyDiffsSec)
      const custTmrSec = avgSec(customerReplyDiffsSec)

      const startMs = new Date(c.created_at).getTime()
      const endMs = new Date(c.last_message_at || c.updated_at || c.created_at).getTime()
      const totalTmaSec = Math.max(0, Math.round((endMs - startMs) / 1000))

      const operatorIdResolved = c.assigned_agent_id || lastHumanSenderId
      const operatorName = operatorIdResolved
        ? profileMap.get(operatorIdResolved) || 'Operador'
        : usedAi
          ? 'Agente de IA'
          : usedBot
            ? 'Robô de Fluxo'
            : 'Fila Sem Operador'

      const campaignName = c.campaign_id
        ? campaignMap.get(c.campaign_id) || 'Geral'
        : operatorIdResolved
          ? userCampaignMap.get(operatorIdResolved)?.name || 'Geral'
          : 'Geral'

      // Who closed / Current state
      const flowRun = flowRunByConv.get(c.id) || flowRunByContact.get(c.contact_id)
      const isOptedOut = Boolean(c.contact?.opted_out_at)

      let closedByText = 'Em Aberto'
      let closedByTone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'primary' = 'info'

      if (isOptedOut) {
        closedByText = 'Devedor (Opt-out)'
        closedByTone = 'danger'
      } else if (c.status === 'closed') {
        if (flowRun?.status === 'timed_out') {
          closedByText = 'Inatividade (Timeout Fluxo)'
          closedByTone = 'warning'
        } else if (c.last_message_from === 'bot' && !usedHuman) {
          closedByText = usedAi ? 'Encerrado pela IA' : 'Encerrado pelo Robô'
          closedByTone = 'primary'
        } else if (operatorIdResolved) {
          const shortOp = (profileMap.get(operatorIdResolved) || 'Operador').split(' ')[0]
          closedByText = `Operador (${shortOp})`
          closedByTone = 'success'
        } else {
          closedByText = 'Encerrado pelo Sistema'
          closedByTone = 'neutral'
        }
      } else if (c.last_message_from === 'customer') {
        closedByText = 'Aguardando Operador'
        closedByTone = 'warning'
      } else {
        closedByText = 'Aguardando Devedor'
        closedByTone = 'info'
      }

      // Tabulation / Outcome synthesis
      const tags: string[] = (c.contact?.contact_tags ?? [])
        .map((ct: any) => ct?.tags?.name)
        .filter(Boolean)
      const deal = dealByConv.get(c.id) || dealByContact.get(c.contact_id)
      const reminder = reminderByConv.get(c.id)
      const note = noteByConv.get(c.id)

      let tabulationLabel = 'Sem Tabulação'
      let tabulationTone: 'success' | 'primary' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral'

      if (deal?.status === 'won') {
        tabulationLabel = 'Acordo Fechado'
        tabulationTone = 'success'
      } else if (deal?.status === 'lost') {
        tabulationLabel = 'Recusa / Perdido'
        tabulationTone = 'danger'
      } else if (isOptedOut) {
        tabulationLabel = 'Opt-out / Bloqueio'
        tabulationTone = 'danger'
      } else if (reminder && !reminder.done_at) {
        tabulationLabel = 'Promessa / Retorno Agendado'
        tabulationTone = 'warning'
      } else if (tags.length > 0) {
        tabulationLabel = tags[0]
        tabulationTone = 'primary'
      } else if (deal?.stage_id) {
        tabulationLabel = stageMap.get(deal.stage_id) || 'Em Negociação'
        tabulationTone = 'info'
      } else if (flowRun?.status === 'completed') {
        tabulationLabel = 'Concluído no Robô'
        tabulationTone = 'info'
      } else if (c.status === 'closed') {
        tabulationLabel = 'Atendimento Finalizado'
        tabulationTone = 'neutral'
      } else {
        tabulationLabel = 'Em Andamento'
        tabulationTone = 'info'
      }

      const detailParts: string[] = []
      if (tags.length > 1) detailParts.push(`Tags: ${tags.join(', ')}`)
      if (reminder?.comment) detailParts.push(`Agendado: ${reminder.comment}`)
      if (note?.body) detailParts.push(`Nota: ${note.body}`)
      if (c.ai_handoff_summary) detailParts.push(`Resumo IA: ${c.ai_handoff_summary}`)
      if (!detailParts.length && c.last_message_text) {
        detailParts.push(`Últ. msg: ${String(c.last_message_text).slice(0, 80)}`)
      }

      const auditCpf = cpfInfoByConv.get(c.id)
      const customInfo = customByContact.get(c.contact_id)
      const cpfStr = auditCpf?.cpf || customInfo?.cpf || '—'
      const creditorStr = auditCpf?.creditor || customInfo?.credor || customInfo?.contrato || ''
      const customFieldsSummary = customInfo?.allPairs?.length ? customInfo.allPairs.join(' · ') : '—'
      const auditLog = auditByConv.get(c.id) || auditByContact.get(c.contact_id)
      const broadcastRecip = broadcastByContact.get(c.contact_id)

      return {
        conv: c,
        humanMsgs,
        botMsgs,
        aiMsgs,
        customerMsgs,
        usedBot,
        usedAi,
        usedHuman,
        dominantChannel,
        channelLabel,
        channelTone,
        waitSec,
        opTmrSec,
        custTmrSec,
        totalTmaSec,
        operatorIdResolved,
        operatorName,
        campaignName,
        closedByText,
        closedByTone,
        tabulationLabel,
        tabulationTone,
        tabulationDetail: detailParts.join(' | ') || '—',
        tags,
        deal,
        reminder,
        note,
        flowRun,
        lastInboundIso,
        cpfStr,
        creditorStr,
        customFieldsSummary,
        auditLog,
        broadcastRecip,
        wrongPartyMsg,
      }
    }

    const analyzed = convs
      .filter((c) => matchesFilters(c.campaign_id, c.assigned_agent_id))
      .map(analyzeConversation)
      .filter((item) => {
        if (channelFilter === 'all') return true
        if (channelFilter === 'human') return item.usedHuman
        if (channelFilter === 'bot') return item.usedBot
        if (channelFilter === 'ai') return item.usedAi
        return true
      })

    // -----------------------------------------------------------------------
    // 1.0 RELATÓRIO COMPLETO DETALHADO 360° (MASTER - TODAS AS OPÇÕES)
    // -----------------------------------------------------------------------
    if (reportId === 'relatorio_completo_detalhado') {
      const nowMs = Date.now()
      const waitArr = analyzed.filter((a) => a.waitSec > 0).map((a) => a.waitSec)
      const tmrArr = analyzed.filter((a) => a.opTmrSec > 0).map((a) => a.opTmrSec)
      const closedCount = analyzed.filter((a) => a.conv.status === 'closed').length
      let positiveCount = 0

      const rows: AnalyticalReportRow[] = analyzed.map((a) => {
        if (a.deal?.status === 'won' || (a.reminder && !a.reminder.done_at)) {
          positiveCount++
        }

        // Conversation status badge
        const convStatusLabel =
          a.conv.status === 'closed'
            ? 'Finalizada'
            : a.conv.status === 'pending'
              ? 'Pendente'
              : 'Em Aberto'
        const convStatusTone: 'neutral' | 'warning' | 'success' =
          a.conv.status === 'closed'
            ? 'neutral'
            : a.conv.status === 'pending'
              ? 'warning'
              : 'success'

        // Handoff / Retention
        const hadAuto = a.usedBot || a.usedAi
        const handoffText =
          hadAuto && a.usedHuman
            ? 'Transbordou p/ Humano'
            : hadAuto && !a.usedHuman
              ? 'Retido 100% Automático'
              : 'Direto no Humano'
        const handoffTone: 'primary' | 'success' | 'info' =
          hadAuto && a.usedHuman ? 'primary' : hadAuto ? 'success' : 'info'

        // SLA (<5m)
        const slaOk = a.opTmrSec === 0 || a.opTmrSec <= 300
        const slaText =
          a.opTmrSec === 0
            ? 'Sem Resp. Humana'
            : slaOk
              ? `Dentro SLA (${formatSeconds(a.opTmrSec)})`
              : `Fora SLA (${formatSeconds(a.opTmrSec)})`
        const slaTone: 'neutral' | 'success' | 'danger' =
          a.opTmrSec === 0 ? 'neutral' : slaOk ? 'success' : 'danger'

        // 24h Meta window
        const expiresMs = a.lastInboundIso ? new Date(a.lastInboundIso).getTime() + 24 * 3600 * 1000 : 0
        const remSec = a.lastInboundIso ? Math.floor((expiresMs - nowMs) / 1000) : -1
        const isOpen = remSec > 0
        const isExpiring = isOpen && remSec <= 3 * 3600
        const h = isOpen ? Math.floor(remSec / 3600) : 0
        const m = isOpen ? Math.floor((remSec % 3600) / 60) : 0
        const waitingOp = a.conv.status !== 'closed' && a.conv.last_message_from === 'customer'

        // Funnel & Deal Value
        const stageLabel = a.deal
          ? `${stageMap.get(a.deal.stage_id) || 'Funil'} (${a.deal.status === 'won' ? 'Ganho' : a.deal.status === 'lost' ? 'Perdido' : 'Em Aberto'})`
          : 'Sem negócio no funil'
        const dealValueNum = Number(a.deal?.value || 0)
        const dealValueFormatted =
          dealValueNum > 0
            ? dealValueNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '—'

        // Reminder / Agendamento
        const isRemDone = Boolean(a.reminder?.done_at)
        const isRemOverdue =
          Boolean(a.reminder) && !isRemDone && new Date(a.reminder.remind_at).getTime() < nowMs
        const reminderStatusLabel = !a.reminder
          ? 'Sem Agendamento'
          : isRemDone
            ? 'Concluído'
            : isRemOverdue
              ? 'Atrasado / Vencido'
              : 'Programado no Prazo'
        const reminderStatusTone: 'neutral' | 'success' | 'danger' | 'info' = !a.reminder
          ? 'neutral'
          : isRemDone
            ? 'success'
            : isRemOverdue
              ? 'danger'
              : 'info'
        const reminderDetailText = a.reminder
          ? `${formatDateTimeBR(a.reminder.remind_at)}${a.reminder.comment ? ` · ${a.reminder.comment}` : ''}${a.reminder.done_at ? ` (Concluído em ${formatDateTimeBR(a.reminder.done_at)})` : ''}`
          : '—'

        // Flow & AI Info
        const fName = a.flowRun?.flow_id
          ? flowNameMap.get(a.flowRun.flow_id) || 'Fluxo Ativo'
          : a.usedBot
            ? 'Automação / Menu'
            : '—'
        const fNode = a.flowRun?.current_node_key
          ? `Nó: ${a.flowRun.current_node_key}`
          : a.flowRun?.status || ''
        const flowInfoText = fNode && fName !== '—' ? `${fName} (${fNode})` : fName
        const aiInfoText = a.conv.ai_handoff_summary
          ? `${a.aiMsgs} resp · "${a.conv.ai_handoff_summary}"`
          : a.aiMsgs > 0
            ? `${a.aiMsgs} respostas geradas pela IA`
            : 'Sem acionamento IA'

        // Distribution Audit
        const distRuleText = a.auditLog
          ? `${a.auditLog.distribution_mode === 'cpf_responsibility' ? 'Resp. CPF' : a.auditLog.distribution_mode === 'manual' ? 'Manual' : 'Inteligente'} (${a.auditLog.strategy_used || 'padrão'})`
          : 'Entrada Direta / Sem Fila'
        const distDetailText = a.auditLog
          ? `${a.auditLog.status === 'success' ? 'Atribuído' : a.auditLog.status === 'queued' ? 'Em Fila' : a.auditLog.status === 'triage' ? 'Triagem CPF' : a.auditLog.status} · ${a.auditLog.reason || 'Roteado pelo motor'}`
          : '—'

        // Broadcast Info
        const br = a.broadcastRecip
        const brBatch = br?.broadcast?.name || 'Orgânico / Sem Disparo'
        const brTemplate = br?.broadcast?.template_name || '—'
        const brSt = br?.status || ''
        const brBadgeMap: Record<
          string,
          { label: string; tone: 'success' | 'primary' | 'info' | 'warning' | 'danger' | 'neutral' }
        > = {
          replied: { label: 'Respondido no Disparo', tone: 'success' },
          read: { label: 'Visualizado (Lido)', tone: 'primary' },
          delivered: { label: 'Entregue no Aparelho', tone: 'info' },
          sent: { label: 'Enviado à Meta', tone: 'neutral' },
          pending: { label: 'Na Fila de Disparo', tone: 'warning' },
          failed: { label: 'Falha na Entrega', tone: 'danger' },
        }
        const brBadge = brSt
          ? brBadgeMap[brSt] ?? { label: brSt, tone: 'neutral' as const }
          : { label: 'Sem Disparo', tone: 'neutral' as const }

        // Hygiene / Opt-out / Falha Meta / Terceiro
        const isOptOut = Boolean(a.conv.contact?.opted_out_at)
        const hasBrError = brSt === 'failed' || Boolean(br?.error_message)
        let hygieneLabel = 'Base Regular (Ativo)'
        let hygieneTone: 'success' | 'danger' | 'warning' | 'primary' = 'success'
        const hygieneReasons: string[] = []

        if (isOptOut) {
          hygieneLabel = 'Opt-out / Bloqueado'
          hygieneTone = 'danger'
          hygieneReasons.push(
            a.conv.contact?.opted_out_reason ||
              `Bloqueado em ${formatDateTimeBR(a.conv.contact?.opted_out_at)}`
          )
        }
        if (hasBrError) {
          if (!isOptOut) {
            hygieneLabel = 'Falha Entrega Meta'
            hygieneTone = 'warning'
          }
          if (br?.error_message) hygieneReasons.push(`Erro Meta: ${br.error_message}`)
        }
        if (a.wrongPartyMsg) {
          if (!isOptOut && !hasBrError) {
            hygieneLabel = 'Relato de Terceiro / Engano'
            hygieneTone = 'primary'
          }
          hygieneReasons.push(`Msg Terceiro: "${a.wrongPartyMsg}"`)
        }

        const totalMsgs = a.botMsgs + a.aiMsgs + a.humanMsgs + a.customerMsgs

        return {
          id: a.conv.id,
          conversationId: a.conv.id,
          cells: {
            startedAt: {
              text: formatDateTimeBR(a.conv.created_at),
              raw: a.conv.created_at,
            },
            lastInteractionAt: {
              text: formatDateTimeBR(a.conv.last_message_at || a.conv.updated_at),
              raw: a.conv.last_message_at || a.conv.updated_at,
            },
            contactName: { text: a.conv.contact?.name || 'Devedor sem nome' },
            phone: { text: a.conv.contact?.phone || '—' },
            cpf: { text: a.cpfStr },
            creditorContract: { text: a.creditorStr || '—' },
            customFieldsSummary: { text: a.customFieldsSummary },
            campaignName: { text: a.campaignName },
            operatorName: { text: a.operatorName },
            convStatus: { text: convStatusLabel, badgeTone: convStatusTone },
            closedBy: { text: a.closedByText, badgeTone: a.closedByTone },
            channelJourney: {
              text: `${a.channelLabel} (${a.botMsgs}R/${a.aiMsgs}IA/${a.humanMsgs}H)`,
              badgeTone: a.channelTone,
            },
            handoffState: { text: handoffText, badgeTone: handoffTone },
            msgBreakdown: {
              text: `${totalMsgs} total (${a.botMsgs}R · ${a.aiMsgs}IA · ${a.humanMsgs}H · ${a.customerMsgs}C)`,
              raw: totalMsgs,
            },
            waitTimeFirstReply: {
              text: a.waitSec > 0 ? formatSeconds(a.waitSec) : '—',
              raw: a.waitSec,
            },
            operatorTmr: {
              text: a.opTmrSec > 0 ? formatSeconds(a.opTmrSec) : '—',
              raw: a.opTmrSec,
            },
            customerTmr: {
              text: a.custTmrSec > 0 ? formatSeconds(a.custTmrSec) : '—',
              raw: a.custTmrSec,
            },
            totalTma: {
              text: a.totalTmaSec > 0 ? formatSeconds(a.totalTmaSec) : '—',
              raw: a.totalTmaSec,
            },
            slaStatus: { text: slaText, badgeTone: slaTone },
            windowStatus: {
              text: isExpiring
                ? 'Expira em Breve (<3h)'
                : isOpen
                  ? 'Janela 24h Aberta'
                  : 'Expirada (Requer Template)',
              badgeTone: isExpiring ? 'warning' : isOpen ? 'success' : 'neutral',
            },
            remainingTime: {
              text: isOpen ? `${h}h ${String(m).padStart(2, '0')}m livres` : 'Encerrada',
              raw: remSec,
            },
            waitingWho: {
              text:
                a.conv.status === 'closed'
                  ? 'Conversa Finalizada'
                  : waitingOp
                    ? 'Aguardando Operador'
                    : 'Aguardando Devedor',
              badgeTone: a.conv.status === 'closed' ? 'neutral' : waitingOp ? 'danger' : 'info',
            },
            idleTime: {
              text: formatElapsedSince(a.conv.last_message_at || a.conv.updated_at),
            },
            primaryTabulation: { text: a.tabulationLabel, badgeTone: a.tabulationTone },
            tagsList: { text: a.tags.length > 0 ? a.tags.join(', ') : 'Sem etiqueta' },
            funnelStage: {
              text: stageLabel,
              badgeTone:
                a.deal?.status === 'won'
                  ? 'success'
                  : a.deal?.status === 'lost'
                    ? 'danger'
                    : 'neutral',
            },
            dealValue: {
              text: dealValueFormatted,
              raw: dealValueNum,
            },
            reminderStatus: {
              text: reminderStatusLabel,
              badgeTone: reminderStatusTone,
            },
            reminderDetail: { text: reminderDetailText },
            closingNote: {
              text: a.note?.body || a.deal?.notes || a.tabulationDetail || '—',
            },
            flowInfo: { text: flowInfoText },
            aiInfo: { text: aiInfoText },
            distributionRule: {
              text: distRuleText,
              badgeTone: a.auditLog ? 'primary' : 'neutral',
            },
            distributionDetail: { text: distDetailText },
            broadcastBatch: { text: brBatch },
            broadcastTemplate: { text: brTemplate },
            broadcastStatus: { text: brBadge.label, badgeTone: brBadge.tone },
            hygieneStatus: { text: hygieneLabel, badgeTone: hygieneTone },
            hygieneDetail: { text: hygieneReasons.join(' | ') || 'OK · Sem restrições' },
            lastMessagePreview: {
              text: a.conv.last_message_text ? String(a.conv.last_message_text).slice(0, 120) : '—',
            },
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
          {
            label: 'Total de Registros 360°',
            value: rows.length,
            sublabel: `${closedCount} finalizados · ${rows.length - closedCount} ativos`,
            tone: 'primary',
          },
          {
            label: 'TME (1ª Resp) / TMR Operador',
            value: `${formatSeconds(avgSec(waitArr))} / ${formatSeconds(avgSec(tmrArr))}`,
            sublabel: 'Espera na fila vs. tempo de resposta',
            tone: 'warning',
          },
          {
            label: 'Atuação Híbrida (Robô/IA/Humano)',
            value: `${analyzed.filter((a) => a.usedHuman).length} Hum · ${analyzed.filter((a) => a.usedBot || a.usedAi).length} Auto`,
            sublabel: 'Participação nos canais no período',
            tone: 'default',
          },
          {
            label: 'Desfechos Positivos (Acordos + Retornos)',
            value: positiveCount,
            sublabel: 'Negócios ganhos ou promessas ativas',
            tone: 'success',
          },
        ],
        rows,
      }
    }

    // -----------------------------------------------------------------------
    // 1A. ATENDIMENTOS DETALHADO
    // -----------------------------------------------------------------------
    if (reportId === 'atendimentos_detalhado') {
      const waitArr = analyzed.filter((a) => a.waitSec > 0).map((a) => a.waitSec)
      const tmrArr = analyzed.filter((a) => a.opTmrSec > 0).map((a) => a.opTmrSec)
      const closedCount = analyzed.filter((a) => a.conv.status === 'closed').length

      const rows: AnalyticalReportRow[] = analyzed.map((a) => ({
        id: a.conv.id,
        conversationId: a.conv.id,
        cells: {
          startedAt: {
            text: `${formatDateTimeBR(a.conv.created_at)} → ${formatDateTimeBR(a.conv.last_message_at || a.conv.updated_at)}`,
            raw: a.conv.last_message_at || a.conv.updated_at,
          },
          contactName: { text: a.conv.contact?.name || 'Devedor sem nome' },
          phone: { text: a.conv.contact?.phone || '—' },
          cpfContract: {
            text: a.creditorStr ? `${a.cpfStr} · ${a.creditorStr}` : a.cpfStr,
          },
          campaignName: { text: a.campaignName },
          channelJourney: {
            text: `${a.channelLabel} (${a.botMsgs}R/${a.aiMsgs}IA/${a.humanMsgs}H)`,
            badgeTone: a.channelTone,
          },
          operatorName: { text: a.operatorName },
          waitTimeFirstReply: {
            text: a.waitSec > 0 ? formatSeconds(a.waitSec) : '—',
            raw: a.waitSec,
          },
          operatorTmr: {
            text: a.opTmrSec > 0 ? formatSeconds(a.opTmrSec) : '—',
            raw: a.opTmrSec,
          },
          customerTmr: {
            text: a.custTmrSec > 0 ? formatSeconds(a.custTmrSec) : '—',
            raw: a.custTmrSec,
          },
          totalTma: {
            text: a.totalTmaSec > 0 ? formatSeconds(a.totalTmaSec) : '—',
            raw: a.totalTmaSec,
          },
          closedBy: { text: a.closedByText, badgeTone: a.closedByTone },
          tabulation: { text: a.tabulationLabel, badgeTone: a.tabulationTone },
          tabulationDetail: { text: a.tabulationDetail },
        },
      }))

      return {
        reportId,
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalRows: rows.length,
        summary: [
          { label: 'Total de Atendimentos', value: rows.length, sublabel: `${closedCount} finalizados`, tone: 'primary' },
          { label: 'Espera Média 1º Atend. (TME)', value: formatSeconds(avgSec(waitArr)), sublabel: 'Fila até 1ª resp. humana', tone: 'warning' },
          { label: 'TMR Médio do Operador', value: formatSeconds(avgSec(tmrArr)), sublabel: 'Tempo p/ responder devedor', tone: 'success' },
          {
            label: 'Atuação Híbrida (Robô/IA/Humano)',
            value: analyzed.filter((a) => a.usedHuman).length,
            sublabel: `${analyzed.filter((a) => a.usedBot || a.usedAi).length} passaram por Robô/IA`,
            tone: 'default',
          },
        ],
        rows,
      }
    }

    // -----------------------------------------------------------------------
    // 1B. JORNADA DE CANAIS: ROBÔ VS IA VS HUMANO
    // -----------------------------------------------------------------------
    if (reportId === 'atuacao_robo_ia_humano') {
      let retainedAuto = 0
      let handedToHuman = 0
      let withAiCount = 0

      const rows: AnalyticalReportRow[] = analyzed.map((a) => {
        if (a.usedAi) withAiCount++
        const hadAuto = a.usedBot || a.usedAi
        if (hadAuto && a.usedHuman) handedToHuman++
        else if (hadAuto && !a.usedHuman) retainedAuto++

        const fName = a.flowRun?.flow_id ? flowNameMap.get(a.flowRun.flow_id) || 'Fluxo Ativo' : a.usedBot ? 'Automação / Menu' : '—'
        const fNode = a.flowRun?.current_node_key ? `Nó: ${a.flowRun.current_node_key}` : a.flowRun?.status || ''

        return {
          id: a.conv.id,
          conversationId: a.conv.id,
          cells: {
            datetime: { text: formatDateTimeBR(a.conv.last_message_at || a.conv.updated_at), raw: a.conv.updated_at },
            contactName: { text: a.conv.contact?.name || 'Devedor' },
            phone: { text: a.conv.contact?.phone || '—' },
            activeEngine: { text: a.channelLabel, badgeTone: a.channelTone },
            msgBreakdown: {
              text: `${a.botMsgs} Robô · ${a.aiMsgs} IA · ${a.humanMsgs} Hum · ${a.customerMsgs} Cli`,
            },
            flowInfo: { text: fNode ? `${fName} (${fNode})` : fName },
            aiInfo: {
              text: a.conv.ai_handoff_summary
                ? `${a.aiMsgs} resp · "${a.conv.ai_handoff_summary}"`
                : a.aiMsgs > 0
                  ? `${a.aiMsgs} respostas geradas pela IA`
                  : 'Sem acionamento IA',
            },
            handoffState: {
              text:
                hadAuto && a.usedHuman
                  ? 'Transbordou p/ Humano'
                  : hadAuto && !a.usedHuman
                    ? 'Retido no Automático (Robô/IA)'
                    : 'Atendimento Direto Humano',
              badgeTone: hadAuto && a.usedHuman ? 'primary' : hadAuto ? 'success' : 'info',
            },
            operatorName: { text: a.usedHuman ? a.operatorName : '—' },
            closedBy: { text: a.closedByText, badgeTone: a.closedByTone },
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
          { label: 'Conversas Analisadas', value: rows.length, tone: 'primary' },
          { label: 'Retidos 100% no Robô / IA', value: retainedAuto, sublabel: 'Resolvidos sem ocupar operador', tone: 'success' },
          { label: 'Transbordados p/ Humano', value: handedToHuman, tone: 'warning' },
          { label: 'Com Atuação do Agente de IA', value: withAiCount, tone: 'default' },
        ],
        rows,
      }
    }

    // -----------------------------------------------------------------------
    // 1C. TABULAÇÕES, ETIQUETAS E DESFECHOS
    // -----------------------------------------------------------------------
    if (reportId === 'tabulacoes_desfechos') {
      let agreements = 0
      let scheduled = 0
      let tagged = 0

      const rows: AnalyticalReportRow[] = analyzed.map((a) => {
        if (a.deal?.status === 'won') agreements++
        if (a.reminder && !a.reminder.done_at) scheduled++
        if (a.tags.length > 0) tagged++

        const stageLabel = a.deal
          ? `${stageMap.get(a.deal.stage_id) || 'Funil'} (${a.deal.status === 'won' ? 'Ganho' : a.deal.status === 'lost' ? 'Perdido' : 'Em Aberto'})`
          : 'Sem negócio no funil'

        return {
          id: a.conv.id,
          conversationId: a.conv.id,
          cells: {
            datetime: { text: formatDateTimeBR(a.conv.updated_at), raw: a.conv.updated_at },
            contactName: { text: a.conv.contact?.name || 'Devedor' },
            phone: { text: a.conv.contact?.phone || '—' },
            cpf: { text: a.cpfStr },
            primaryTabulation: { text: a.tabulationLabel, badgeTone: a.tabulationTone },
            tagsList: { text: a.tags.length > 0 ? a.tags.join(', ') : 'Sem etiqueta' },
            funnelStage: {
              text: stageLabel,
              badgeTone: a.deal?.status === 'won' ? 'success' : a.deal?.status === 'lost' ? 'danger' : 'neutral',
            },
            closingNote: {
              text: a.note?.body || a.deal?.notes || a.reminder?.comment || a.conv.ai_handoff_summary || '—',
            },
            campaignName: { text: a.campaignName },
            operatorName: { text: a.operatorName },
            convStatus: { text: a.closedByText, badgeTone: a.closedByTone },
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
          { label: 'Atendimentos Tabulados', value: rows.length, tone: 'primary' },
          { label: 'Com Etiquetas (Tags)', value: tagged, tone: 'default' },
          { label: 'Promessas / Retornos Ativos', value: scheduled, tone: 'warning' },
          { label: 'Acordos Ganhos no Funil', value: agreements, tone: 'success' },
        ],
        rows,
      }
    }

    // -----------------------------------------------------------------------
    // 1D. JANELA 24H META E QUEM AGUARDA RESPOSTA
    // -----------------------------------------------------------------------
    const nowMs = Date.now()
    let openWindows = 0
    let waitingOperatorCount = 0

    const rows: AnalyticalReportRow[] = analyzed.map((a) => {
      const expiresMs = a.lastInboundIso ? new Date(a.lastInboundIso).getTime() + 24 * 3600 * 1000 : 0
      const remSec = a.lastInboundIso ? Math.floor((expiresMs - nowMs) / 1000) : -1
      const isOpen = remSec > 0
      const isExpiring = isOpen && remSec <= 3 * 3600
      if (isOpen) openWindows++

      const waitingOp = a.conv.status !== 'closed' && a.conv.last_message_from === 'customer'
      if (waitingOp) waitingOperatorCount++

      const h = isOpen ? Math.floor(remSec / 3600) : 0
      const m = isOpen ? Math.floor((remSec % 3600) / 60) : 0

      return {
        id: a.conv.id,
        conversationId: a.conv.id,
        cells: {
          lastInboundAt: {
            text: a.lastInboundIso ? formatDateTimeBR(a.lastInboundIso) : 'Sem msg do devedor',
            raw: a.lastInboundIso || '',
          },
          contactName: { text: a.conv.contact?.name || 'Devedor' },
          phone: { text: a.conv.contact?.phone || '—' },
          windowStatus: {
            text: isExpiring
              ? 'Expira em Breve (<3h)'
              : isOpen
                ? 'Janela 24h Aberta'
                : 'Expirada (Requer Template)',
            badgeTone: isExpiring ? 'warning' : isOpen ? 'success' : 'neutral',
          },
          remainingTime: {
            text: isOpen ? `${h}h ${String(m).padStart(2, '0')}m livres` : 'Encerrada',
            raw: remSec,
          },
          waitingWho: {
            text:
              a.conv.status === 'closed'
                ? 'Conversa Finalizada'
                : waitingOp
                  ? 'Aguardando Operador Responder'
                  : 'Aguardando Devedor Responder',
            badgeTone: a.conv.status === 'closed' ? 'neutral' : waitingOp ? 'danger' : 'info',
          },
          idleTime: {
            text: formatElapsedSince(a.conv.last_message_at || a.conv.updated_at),
          },
          campaignName: { text: a.campaignName },
          operatorName: { text: a.operatorName },
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
        { label: 'Janelas 24h Abertas Agora', value: openWindows, tone: 'success' },
        { label: 'Devedores Aguardando Operador', value: waitingOperatorCount, tone: waitingOperatorCount > 0 ? 'danger' : 'success' },
        { label: 'Total de Conversas no Período', value: rows.length, tone: 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 2. PRODUÇÃO E TEMPOS POR OPERADOR (TME, TMR, TMA E SLA)
  // =========================================================================
  if (reportId === 'tempos_sla_operador') {
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
        .select('id, user_id, assigned_to, status, created_at')
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
    const tmrDiffsByUser = new Map<string, number[]>()
    const firstWaitDiffsByUser = new Map<string, number[]>()
    const firstCustByConv = new Map<string, number>()
    const firstAgentRepliedConvs = new Set<string>()
    const lastCustByConv = new Map<string, number>()

    for (const m of msgs) {
      const ts = new Date(m.created_at).getTime()
      if (m.sender_type === 'customer') {
        if (!firstCustByConv.has(m.conversation_id)) {
          firstCustByConv.set(m.conversation_id, ts)
        }
        lastCustByConv.set(m.conversation_id, ts)
      } else if (m.sender_type === 'agent') {
        const uid = m.sender_id || convAssignee.get(m.conversation_id)
        if (!uid) continue
        sentByUser.set(uid, (sentByUser.get(uid) || 0) + 1)

        if (!firstAgentRepliedConvs.has(m.conversation_id)) {
          firstAgentRepliedConvs.add(m.conversation_id)
          const firstCustTs = firstCustByConv.get(m.conversation_id)
          if (firstCustTs && ts >= firstCustTs && ts - firstCustTs < 86400000) {
            const list = firstWaitDiffsByUser.get(uid) ?? []
            list.push((ts - firstCustTs) / 1000)
            firstWaitDiffsByUser.set(uid, list)
          }
        }

        const lastCustTs = lastCustByConv.get(m.conversation_id)
        if (lastCustTs && ts >= lastCustTs && ts - lastCustTs < 86400000) {
          const list = tmrDiffsByUser.get(uid) ?? []
          list.push((ts - lastCustTs) / 1000)
          tmrDiffsByUser.set(uid, list)
          lastCustByConv.delete(m.conversation_id)
        }
      }
    }

    const rows: AnalyticalReportRow[] = []
    const allTeamTmr: number[] = []
    const allTeamWait: number[] = []

    for (const prof of (profilesRes.data ?? []) as any[]) {
      if (prof.account_role === 'viewer') continue
      const uid = prof.user_id
      const userCamp = userCampaignMap.get(uid)
      if (!matchesFilters(userCamp?.id, uid)) continue

      const opConvs = convs.filter((c) => c.assigned_agent_id === uid)
      const openConvs = opConvs.filter((c) => c.status !== 'closed').length
      const closedConvs = opConvs.filter((c) => c.status === 'closed').length
      const totalConvs = opConvs.length

      const waitList = firstWaitDiffsByUser.get(uid) ?? []
      const tmrList = tmrDiffsByUser.get(uid) ?? []
      allTeamWait.push(...waitList)
      allTeamTmr.push(...tmrList)

      const avgWait = avgSec(waitList)
      const avgTmr = avgSec(tmrList)

      const withinSlaCount = tmrList.filter((s) => s <= 300).length
      const slaPct = tmrList.length > 0 ? Math.round((withinSlaCount / tmrList.length) * 100) : 100

      const tmaList: number[] = []
      for (const c of opConvs) {
        const dur = (new Date(c.last_message_at || c.updated_at || c.created_at).getTime() - new Date(c.created_at).getTime()) / 1000
        if (dur > 0 && dur < 86400 * 7) tmaList.push(dur)
      }
      const avgTma = avgSec(tmaList)

      const msgsSent = sentByUser.get(uid) || 0
      const remCount = reminders.filter((r) => r.user_id === uid).length
      const dealsCount = wonDeals.filter((d) => (d.assigned_to || d.user_id) === uid).length

      rows.push({
        id: uid,
        cells: {
          operatorName: { text: prof.full_name || 'Operador' },
          campaignName: { text: userCamp?.name || 'Geral' },
          totalConvs: { text: String(totalConvs), raw: totalConvs },
          openConvs: { text: String(openConvs), raw: openConvs },
          closedByOperator: { text: String(closedConvs), raw: closedConvs },
          avgWaitTme: { text: avgWait > 0 ? formatSeconds(avgWait) : '—', raw: avgWait },
          avgOperatorTmr: { text: avgTmr > 0 ? formatSeconds(avgTmr) : '—', raw: avgTmr },
          avgTotalTma: { text: avgTma > 0 ? formatSeconds(avgTma) : '—', raw: avgTma },
          slaCompliance: { text: `${slaPct}%`, raw: slaPct },
          messagesSent: { text: String(msgsSent), raw: msgsSent },
          remindersCreated: { text: String(remCount), raw: remCount },
          wonDeals: { text: String(dealsCount), raw: dealsCount },
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
        { label: 'TME Médio da Equipe (1ª Resp)', value: formatSeconds(avgSec(allTeamWait)), tone: 'warning' },
        { label: 'TMR Médio da Equipe ao Devedor', value: formatSeconds(avgSec(allTeamTmr)), tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 5. AUDITORIA DE DISTRIBUIÇÃO, TRIAGEM DE CPF E FILAS
  // =========================================================================
  if (reportId === 'auditoria_distribuicao_filas') {
    const [auditsRes, cpfRespRes] = await Promise.all([
      db
        .from('distribution_audit_logs')
        .select(
          'id, conversation_id, contact_id, cpf, campaign_id, campaign_name, assigned_agent_id, assigned_agent_name, distribution_mode, strategy_used, status, reason, execution_time_ms, created_at, contact:contacts(id, name, phone)'
        )
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false })
        .limit(800),
      db.from('cpf_responsibilities').select('cpf, creditor_name, contract_ref'),
    ])

    const cpfMap = new Map<string, string>()
    for (const r of (cpfRespRes.data ?? []) as any[]) {
      if (r.cpf) {
        cpfMap.set(
          String(r.cpf).replace(/\D/g, ''),
          [r.creditor_name, r.contract_ref].filter(Boolean).join(' · ') || 'Base CPF'
        )
      }
    }

    const rows: AnalyticalReportRow[] = []
    let routedSuccess = 0
    let queuedCount = 0
    let triageCount = 0

    for (const a of (auditsRes.data ?? []) as any[]) {
      if (!matchesFilters(a.campaign_id, a.assigned_agent_id)) continue
      if (a.status === 'success') routedSuccess++
      else if (a.status === 'queued') queuedCount++
      else if (a.status === 'triage') triageCount++

      const cleanCpf = a.cpf ? String(a.cpf).replace(/\D/g, '') : ''
      const credInfo = cleanCpf ? cpfMap.get(cleanCpf) || 'CPF Identificado' : 'Aguardando CPF'

      const statusBadge: Record<string, { label: string; tone: 'success' | 'warning' | 'info' | 'danger' }> = {
        success: { label: 'Atribuído ao Operador', tone: 'success' },
        queued: { label: 'Aguardando na Fila', tone: 'warning' },
        triage: { label: 'Em Triagem (Sem CPF)', tone: 'info' },
        conflict: { label: 'Conflito de Carteira', tone: 'danger' },
        failed: { label: 'Falha no Roteamento', tone: 'danger' },
      }
      const st = statusBadge[a.status] ?? { label: a.status, tone: 'info' }

      rows.push({
        id: a.id,
        conversationId: a.conversation_id || undefined,
        cells: {
          datetime: { text: formatDateTimeBR(a.created_at), raw: a.created_at },
          contactName: { text: a.contact?.name || 'Devedor' },
          phone: { text: a.contact?.phone || '—' },
          cpf: { text: a.cpf || 'Não informado' },
          creditorContract: { text: credInfo },
          campaignName: { text: a.campaign_name || (a.campaign_id ? campaignMap.get(a.campaign_id) : 'Geral') || 'Geral' },
          modeStrategy: {
            text: `${a.distribution_mode === 'cpf_responsibility' ? 'Resp. CPF' : a.distribution_mode === 'manual' ? 'Manual' : 'Inteligente'} (${a.strategy_used || 'padrão'})`,
            badgeTone: 'primary',
          },
          routingStatus: { text: st.label, badgeTone: st.tone },
          assignedOperator: {
            text: a.assigned_agent_name || (a.assigned_agent_id ? profileMap.get(a.assigned_agent_id) : '—') || '—',
          },
          reason: { text: a.reason || 'Roteado pelo motor de distribuição' },
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
        { label: 'Eventos de Distribuição', value: rows.length, tone: 'primary' },
        { label: 'Entregues a Operadores', value: routedSuccess, tone: 'success' },
        { label: 'Retidos em Fila', value: queuedCount, tone: 'warning' },
        { label: 'Em Triagem de CPF', value: triageCount, tone: 'default' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 6. AGENDAMENTOS DE RETORNO E PROMESSAS (REMINDERS)
  // =========================================================================
  if (reportId === 'retornos_agendamentos') {
    const { data: reminders } = await db
      .from('conversation_reminders')
      .select(
        'id, conversation_id, user_id, remind_at, comment, done_at, created_at, contact:contacts(id, name, phone)'
      )
      .gte('remind_at', startIso)
      .lte('remind_at', endIso)
      .order('remind_at', { ascending: true })

    const rows: AnalyticalReportRow[] = []
    let pending = 0
    let overdue = 0
    let done = 0
    const nowMs = Date.now()

    for (const r of (reminders ?? []) as any[]) {
      const userCamp = r.user_id ? userCampaignMap.get(r.user_id) : undefined
      if (!matchesFilters(userCamp?.id, r.user_id)) continue

      const isDone = Boolean(r.done_at)
      const isOverdue = !isDone && new Date(r.remind_at).getTime() < nowMs

      if (isDone) done++
      else if (isOverdue) overdue++
      else pending++

      rows.push({
        id: r.id,
        conversationId: r.conversation_id || undefined,
        cells: {
          remindAt: { text: formatDateTimeBR(r.remind_at), raw: r.remind_at },
          contactName: { text: r.contact?.name || 'Devedor' },
          phone: { text: r.contact?.phone || '—' },
          comment: { text: r.comment || 'Retorno agendado pelo operador' },
          campaignName: { text: userCamp?.name || 'Geral' },
          operatorName: { text: r.user_id ? profileMap.get(r.user_id) || 'Operador' : 'Equipe' },
          status: {
            text: isDone ? 'Concluído' : isOverdue ? 'Atrasado / Vencido' : 'No Prazo',
            badgeTone: isDone ? 'success' : isOverdue ? 'danger' : 'info',
          },
          doneAt: { text: r.done_at ? formatDateTimeBR(r.done_at) : '—' },
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
        { label: 'Programados no Prazo', value: pending, tone: 'default' },
        { label: 'Atrasados', value: overdue, tone: overdue > 0 ? 'danger' : 'default' },
        { label: 'Concluídos', value: done, tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 8. ENVIOS ANALÍTICOS DE DISPAROS (BROADCAST RECIPIENTS)
  // =========================================================================
  if (reportId === 'disparos_analitico') {
    const { data: recips } = await db
      .from('broadcast_recipients')
      .select(
        'id, status, sent_at, delivered_at, read_at, replied_at, error_message, created_at, contact:contacts(id, name, phone), broadcast:broadcasts(id, name, template_name)'
      )
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(1000)

    const rows: AnalyticalReportRow[] = []
    let delivered = 0
    let read = 0
    let replied = 0
    let failed = 0

    for (const r of (recips ?? []) as any[]) {
      const st = r.status || 'pending'
      if (st === 'delivered' || st === 'read' || st === 'replied') delivered++
      if (st === 'read' || st === 'replied') read++
      if (st === 'replied' || r.replied_at) replied++
      if (st === 'failed') failed++

      const sentMs = r.sent_at ? new Date(r.sent_at).getTime() : 0
      const replyMs = r.replied_at ? new Date(r.replied_at).getTime() : 0
      const replyDiffStr =
        sentMs && replyMs && replyMs >= sentMs
          ? `${formatDateTimeBR(r.replied_at)} (em ${formatSeconds((replyMs - sentMs) / 1000)})`
          : r.replied_at
            ? formatDateTimeBR(r.replied_at)
            : 'Sem resposta'

      const badgeMap: Record<string, { label: string; tone: 'success' | 'primary' | 'info' | 'warning' | 'danger' | 'neutral' }> = {
        replied: { label: 'Respondido pelo Devedor', tone: 'success' },
        read: { label: 'Visualizado (Lido)', tone: 'primary' },
        delivered: { label: 'Entregue no Aparelho', tone: 'info' },
        sent: { label: 'Enviado à Meta', tone: 'neutral' },
        pending: { label: 'Na Fila de Disparo', tone: 'warning' },
        failed: { label: 'Falha na Entrega', tone: 'danger' },
      }
      const badge = badgeMap[st] ?? { label: st, tone: 'neutral' }

      rows.push({
        id: r.id,
        cells: {
          sentAt: { text: formatDateTimeBR(r.sent_at || r.created_at), raw: r.sent_at || r.created_at },
          contactName: { text: r.contact?.name || 'Contato' },
          phone: { text: r.contact?.phone || '—' },
          batchName: { text: r.broadcast?.name || 'Disparo' },
          templateName: { text: r.broadcast?.template_name || '—' },
          deliveryStatus: { text: badge.label, badgeTone: badge.tone },
          readAt: { text: formatDateTimeBR(r.read_at) },
          repliedAt: { text: replyDiffStr },
          errorDetail: { text: r.error_message || 'OK · Processado pela Meta' },
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
        { label: 'Total Acionado no Período', value: rows.length, tone: 'primary' },
        { label: 'Entregues', value: delivered, tone: 'default' },
        { label: 'Visualizados (Lidos)', value: read, tone: 'default' },
        { label: 'Respondidos / Falhas', value: `${replied} resp · ${failed} falhas`, tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 9. DESEMPENHO CONSOLIDADO DE LOTES DISPARADOS NO PERÍODO
  // =========================================================================
  if (reportId === 'lotes_disparos_periodo') {
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
    let totalReplied = 0

    for (const b of (broadcasts ?? []) as any[]) {
      const sent = Number(b.sent_count || 0)
      const delivered = Number(b.delivered_count || 0)
      const read = Number(b.read_count || 0)
      const replied = Number(b.replied_count || 0)
      const failed = Number(b.failed_count || 0)
      const base = Number(b.total_recipients || sent + failed)
      const rate = delivered > 0 ? Math.round((replied / delivered) * 1000) / 10 : sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0

      totalSent += sent
      totalReplied += replied

      rows.push({
        id: b.id,
        cells: {
          createdAt: { text: formatDateTimeBR(b.scheduled_at || b.created_at), raw: b.created_at },
          batchName: { text: b.name || 'Campanha' },
          templateName: { text: b.template_name || '—' },
          status: {
            text: b.status === 'sent' ? 'Concluído' : b.status === 'sending' ? 'Enviando' : b.status,
            badgeTone: b.status === 'sent' ? 'success' : 'info',
          },
          totalRecipients: { text: String(base), raw: base },
          sentCount: { text: String(sent), raw: sent },
          deliveredCount: { text: String(delivered), raw: delivered },
          readCount: { text: String(read), raw: read },
          repliedCount: { text: String(replied), raw: replied },
          responseRate: { text: `${rate.toFixed(1)}%`, raw: rate },
          failedCount: { text: String(failed), raw: failed },
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
        { label: 'Campanhas Disparadas', value: rows.length, tone: 'primary' },
        { label: 'Total Enviado', value: totalSent, tone: 'default' },
        { label: 'Total Respondido', value: totalReplied, tone: 'success' },
      ],
      rows,
    }
  }

  // =========================================================================
  // 10. HIGIENIZAÇÃO DE BASE: OPT-OUTS, FALHAS META E Nº DE TERCEIROS
  // =========================================================================
  const [optOutsRes, failedRecipRes, inboundMsgsRes] = await Promise.all([
    db
      .from('contacts')
      .select('id, name, phone, opted_out_at, opted_out_reason')
      .not('opted_out_at', 'is', null)
      .gte('opted_out_at', startIso)
      .lte('opted_out_at', endIso)
      .order('opted_out_at', { ascending: false }),
    db
      .from('broadcast_recipients')
      .select('id, error_message, created_at, contact:contacts(id, name, phone), broadcast:broadcasts(name, template_name)')
      .eq('status', 'failed')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(400),
    db
      .from('messages')
      .select('id, conversation_id, content_text, created_at, conversation:conversations(id, contact:contacts(id, name, phone, opted_out_at))')
      .eq('sender_type', 'customer')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(600),
  ])

  const rows: AnalyticalReportRow[] = []
  let optOutTotal = 0
  let failedTotal = 0
  let wrongPartyTotal = 0

  for (const c of (optOutsRes.data ?? []) as any[]) {
    optOutTotal++
    rows.push({
      id: `opt-${c.id}`,
      cells: {
        datetime: { text: formatDateTimeBR(c.opted_out_at), raw: c.opted_out_at },
        contactName: { text: c.name || 'Contato' },
        phone: { text: c.phone || '—' },
        cpf: { text: '—' },
        occurrenceType: { text: 'Opt-out / Bloqueio Solicitado', badgeTone: 'danger' },
        reasonDetail: { text: c.opted_out_reason || 'Solicitou parada de envios (Opt-out)' },
        origin: { text: 'Gatilho de Opt-out' },
        contactState: { text: 'Bloqueado p/ Disparos', badgeTone: 'neutral' },
      },
    })
  }

  for (const r of (failedRecipRes.data ?? []) as any[]) {
    failedTotal++
    rows.push({
      id: `fail-${r.id}`,
      cells: {
        datetime: { text: formatDateTimeBR(r.created_at), raw: r.created_at },
        contactName: { text: r.contact?.name || 'Contato' },
        phone: { text: r.contact?.phone || '—' },
        cpf: { text: '—' },
        occurrenceType: { text: 'Falha de Entrega (API Meta)', badgeTone: 'warning' },
        reasonDetail: { text: r.error_message || 'Número inválido ou sem WhatsApp ativo' },
        origin: { text: `Lote: ${r.broadcast?.name || 'Disparo'}` },
        contactState: { text: 'Revisar / Inativar Número', badgeTone: 'warning' },
      },
    })
  }

  for (const m of (inboundMsgsRes.data ?? []) as any[]) {
    const text = (m.content_text || '').trim()
    if (!UNRECOGNIZED_REGEX.test(text)) continue
    wrongPartyTotal++
    const contact = m.conversation?.contact
    rows.push({
      id: `wrong-${m.id}`,
      conversationId: m.conversation_id,
      cells: {
        datetime: { text: formatDateTimeBR(m.created_at), raw: m.created_at },
        contactName: { text: contact?.name || 'Contato' },
        phone: { text: contact?.phone || '—' },
        cpf: { text: '—' },
        occurrenceType: { text: 'Não Reconhece / Número de Terceiro', badgeTone: 'primary' },
        reasonDetail: { text },
        origin: { text: 'Resposta na Conversa' },
        contactState: {
          text: contact?.opted_out_at ? 'Já Bloqueado' : 'Higienizar Cadastro',
          badgeTone: contact?.opted_out_at ? 'neutral' : 'info',
        },
      },
    })
  }

  rows.sort((a, b) => String(b.cells.datetime.raw || '').localeCompare(String(a.cells.datetime.raw || '')))

  return {
    reportId: 'higienizacao_bloqueios_falhas',
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    totalRows: rows.length,
    summary: [
      { label: 'Total p/ Higienização', value: rows.length, tone: 'primary' },
      { label: 'Opt-outs (Bloqueios)', value: optOutTotal, tone: 'danger' },
      { label: 'Falhas de Entrega Meta', value: failedTotal, tone: 'warning' },
      { label: 'Relatos de Terceiro / Engano', value: wrongPartyTotal, tone: 'default' },
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
