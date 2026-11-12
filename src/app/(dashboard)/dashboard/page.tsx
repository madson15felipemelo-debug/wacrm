"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  LayoutDashboard,
  Radio,
  Flame,
  CalendarCheck,
  Activity,
} from 'lucide-react'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import {
  loadOperationalDashboardData,
  type OperationalDashboardData,
} from '@/lib/dashboard/operational-queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { OperatorsProductivityTable } from '@/components/dashboard/operators-productivity-table'
import { CampaignsProductivityTable } from '@/components/dashboard/campaigns-productivity-table'
import { ChannelBreakdownCard } from '@/components/dashboard/channel-breakdown-card'
import { CpfLossFunnelCard } from '@/components/dashboard/cpf-loss-funnel-card'
import { DashboardFiltersBar, type FilterState } from '@/components/dashboard/dashboard-filters-bar'
import { AttendancesManagementTab } from '@/components/dashboard/attendances-management-tab'
import { LiveMonitorTab } from '@/components/dashboard/live-monitor-tab'
import { MailingPerformanceTab } from '@/components/dashboard/mailing-performance-tab'
import { ScheduledAgreementsTab } from '@/components/dashboard/scheduled-agreements-tab'
import { OperatorEvolutionTab } from '@/components/dashboard/operator-evolution-tab'
import { Badge } from '@/components/ui/badge'

import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const { defaultCurrency } = useAuth()

  // View Mode: 'operational' (Cobrança, Operadores & Campanhas) or 'pipeline' (Vendas & Pipeline)
  const [viewMode, setViewMode] = useState<'operational' | 'pipeline'>('operational')

  // Operational Sub-tabs: 'overview' | 'attendances' | 'evolution' | 'live' | 'mailings' | 'scheduled'
  const [operationalSubTab, setOperationalSubTab] = useState<'overview' | 'attendances' | 'evolution' | 'live' | 'mailings' | 'scheduled'>('overview')

  // Global Filters State
  const [filters, setFilters] = useState<FilterState>({
    datePreset: '30d',
    dateLabel: 'Últimos 30 dias',
    campaign: 'all',
    flow: 'all',
    channelType: 'all',
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('agora')

  // Operational Data State
  const [operationalData, setOperationalData] = useState<OperationalDashboardData | null>(null)
  const [operationalLoading, setOperationalLoading] = useState(true)

  // Pipeline Metrics State
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const loadAll = useCallback((rangeDays: number = 30) => {
    const db = createClient()

    // 1. Operational data for debt collection & distribution
    void loadOperationalDashboardData(db, rangeDays)
      .then((data) => {
        setOperationalData(data)
        const now = new Date()
        setLastUpdated(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      })
      .catch((err) => console.error('[dashboard] operational data failed:', err))
      .finally(() => {
        setOperationalLoading(false)
        setIsRefreshing(false)
      })

    // 2. Legacy pipeline & general metrics
    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))
  }, [])

  useEffect(() => {
    loadAll(30)
  }, [loadAll])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    const days = filters.datePreset === 'today' ? 1 : filters.datePreset === 'yesterday' ? 2 : filters.datePreset === '7d' ? 7 : filters.datePreset === '15d' ? 15 : 30
    loadAll(days)
  }, [filters.datePreset, loadAll])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    const days = newFilters.datePreset === 'today' ? 1 : newFilters.datePreset === 'yesterday' ? 2 : newFilters.datePreset === '7d' ? 7 : newFilters.datePreset === '15d' ? 15 : 30
    setOperationalLoading(true)
    loadAll(days)
  }

  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  // Dynamic filter application on operational data
  const filteredOperators = useMemo(() => {
    if (!operationalData) return []
    if (filters.campaign === 'all') return operationalData.operators
    return operationalData.operators.filter((op) =>
      op.campaignName?.toLowerCase().includes(filters.campaign.toLowerCase())
    )
  }, [operationalData, filters.campaign])

  const filteredCampaigns = useMemo(() => {
    if (!operationalData) return []
    if (filters.campaign === 'all') return operationalData.campaigns
    return operationalData.campaigns.filter((c) =>
      c.name.toLowerCase().includes(filters.campaign.toLowerCase()) ||
      c.code?.toLowerCase().includes(filters.campaign.toLowerCase())
    )
  }, [operationalData, filters.campaign])

  const filteredMailings = useMemo(() => {
    if (!operationalData) return []
    if (filters.campaign === 'all') return operationalData.mailings
    return operationalData.mailings.filter(
      (m) =>
        m.campaignName.toLowerCase().includes(filters.campaign.toLowerCase()) ||
        m.name.toLowerCase().includes(filters.campaign.toLowerCase())
    )
  }, [operationalData, filters.campaign])

  const filteredLiveQueue = useMemo(() => {
    if (!operationalData) return []
    let items = operationalData.liveQueue
    if (filters.campaign !== 'all') {
      items = items.filter((q) => q.campaignName.toLowerCase().includes(filters.campaign.toLowerCase()))
    }
    if (filters.channelType !== 'all') {
      items = items.filter((q) => q.currentChannel === filters.channelType)
    }
    return items
  }, [operationalData, filters.campaign, filters.channelType])

  const filteredLiveHuman = useMemo(() => {
    if (!operationalData) return []
    if (filters.campaign === 'all') return operationalData.liveHuman
    return operationalData.liveHuman.filter((h) =>
      h.campaignName.toLowerCase().includes(filters.campaign.toLowerCase())
    )
  }, [operationalData, filters.campaign])

  const filteredScheduled = useMemo(() => {
    if (!operationalData) return []
    if (filters.campaign === 'all') return operationalData.scheduled
    return operationalData.scheduled.filter((s) =>
      s.campaignName.toLowerCase().includes(filters.campaign.toLowerCase())
    )
  }, [operationalData, filters.campaign])

  return (
    <div className="space-y-6">
      {/* Header with View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {viewMode === 'operational'
              ? 'Operações'
              : t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewMode === 'operational'
              ? 'Acompanhamento de filas, atendimento, campanhas e produtividade'
              : t('description')}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('operational')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
              viewMode === 'operational'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Operações & Cobrança
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
              viewMode === 'pipeline'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Pipeline & Vendas
          </button>
        </div>
      </div>

      {viewMode === 'operational' ? (
        /* ================= OPERATIONAL & COBRANÇA VIEW ================= */
        <div className="space-y-6">
          <DashboardFiltersBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            lastUpdated={lastUpdated}
          />

          {/* Sub-Abas Operacionais */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="inline-flex flex-wrap items-center rounded-lg border border-border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                onClick={() => setOperationalSubTab('overview')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer',
                  operationalSubTab === 'overview'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Visão Geral
              </button>

              <button
                type="button"
                onClick={() => setOperationalSubTab('attendances')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer',
                  operationalSubTab === 'attendances'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Atendimentos
                {operationalData && operationalData.attendances.length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {operationalData.attendances.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOperationalSubTab('evolution')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer',
                  operationalSubTab === 'evolution'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Desempenho & Evolução
              </button>

              <button
                type="button"
                onClick={() => setOperationalSubTab('live')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer',
                  operationalSubTab === 'live'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Tempo Real
                {filteredLiveQueue.length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {filteredLiveQueue.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOperationalSubTab('mailings')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer',
                  operationalSubTab === 'mailings'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Disparos
              </button>

              <button
                type="button"
                onClick={() => setOperationalSubTab('scheduled')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all cursor-pointer',
                  operationalSubTab === 'scheduled'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Agendamentos
                {filteredScheduled.length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {filteredScheduled.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* CONTEÚDO DA SUB-ABA SELECIONADA */}
          {operationalSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Operational KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {operationalLoading || !operationalData ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                ) : (
                  <>
                    <MetricCard
                      title="Taxa de Resposta (Inbound)"
                      value={`${operationalData.kpis.responseRate.toFixed(1)}%`}
                      icon={MessageSquare}
                      delta={{
                        sign: operationalData.kpis.responseRateDelta,
                        label: `+${operationalData.kpis.responseRateDelta}% vs mês anterior`,
                      }}
                    />
                    <MetricCard
                      title="Taxa de Acordo s/ Respostas"
                      value={`${operationalData.kpis.agreementRateOnResponses.toFixed(1)}%`}
                      icon={CheckCircle2}
                      delta={{
                        sign: operationalData.kpis.agreementRateDelta,
                        label: `+${operationalData.kpis.agreementRateDelta}% vs mês anterior`,
                      }}
                    />
                    <MetricCard
                      title="Conversas Ativas & Fila"
                      value={operationalData.kpis.activeConversations.toString()}
                      icon={Users}
                      subtitle={`${operationalData.kpis.queuedConversations} aguardando na fila`}
                    />
                    <MetricCard
                      title="Tempo Médio Atendimento (TMA)"
                      value="4m 05s"
                      icon={Clock}
                      subtitle="Velocidade média de tratativa humana"
                    />
                  </>
                )}
              </div>

              {/* Row 1: Channels (Robô vs IA vs Humano) + CPF Loss Funnel (Onde o CPF está parando) */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  {operationalData ? (
                    <ChannelBreakdownCard
                      channels={operationalData.channels}
                      loading={operationalLoading}
                    />
                  ) : (
                    <SkeletonCard />
                  )}
                </div>
                <div className="lg:col-span-3">
                  {operationalData ? (
                    <CpfLossFunnelCard
                      stages={operationalData.funnel.stages}
                      insights={operationalData.funnel.insights}
                      loading={operationalLoading}
                    />
                  ) : (
                    <SkeletonCard />
                  )}
                </div>
              </div>

              {/* Row 2: Detalhamento de Produtividade Individual (Visão Global) */}
              <OperatorsProductivityTable
                operators={filteredOperators}
                loading={operationalLoading}
              />

              {/* Row 3: Detalhamento de Produtividade por Assessoria / Campanha */}
              <CampaignsProductivityTable
                campaigns={filteredCampaigns}
                loading={operationalLoading}
              />
            </div>
          )}

          {operationalSubTab === 'attendances' && (
            <AttendancesManagementTab
              attendances={operationalData?.attendances ?? []}
              operators={operationalData?.operators ?? []}
              loading={operationalLoading}
            />
          )}

          {operationalSubTab === 'evolution' && operationalData && (
            <OperatorEvolutionTab
              analyst={operationalData.evolution.analyst}
              summary={operationalData.evolution.summary}
              operators={operationalData.evolution.operators}
              loading={operationalLoading}
            />
          )}

          {operationalSubTab === 'live' && (
            <LiveMonitorTab
              realtime={operationalData?.realtime ?? {
                operatorsOnline: 14,
                operatorsAvailable: 11,
                operatorsInBreak: 2,
                operatorsDisconnected: 1,
                waitingResponses: 8,
                tmrOperator: '00:01:18',
                tmrClient: '00:02:45',
                tmf: '00:04:12',
                inRobot: 42,
                inQueue: 6,
                inHuman: 18,
                inAi: 12,
              }}
              liveQueue={filteredLiveQueue}
              liveHuman={filteredLiveHuman}
              loading={operationalLoading}
            />
          )}

          {operationalSubTab === 'mailings' && (
            <MailingPerformanceTab
              mailings={filteredMailings}
              loading={operationalLoading}
            />
          )}

          {operationalSubTab === 'scheduled' && (
            <ScheduledAgreementsTab
              scheduled={filteredScheduled}
              loading={operationalLoading}
            />
          )}
        </div>
      ) : (
        /* ================= PIPELINE & SALES VIEW ================= */
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricsLoading || !metrics ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <MetricCard
                  title={t('activeConversations')}
                  value={metrics.activeConversations.current.toLocaleString()}
                  icon={MessageSquare}
                  delta={{
                    sign: metrics.activeConversations.previous,
                    label: deltaLabel(
                      metrics.activeConversations.previous,
                      t('newTodayVsYesterday'),
                      t('noChange', { suffix: t('newTodayVsYesterday') })
                    ),
                  }}
                />
                <MetricCard
                  title={t('newContactsToday')}
                  value={metrics.newContactsToday.current.toLocaleString()}
                  icon={UserPlus}
                  delta={{
                    sign:
                      metrics.newContactsToday.current - metrics.newContactsToday.previous,
                    label: deltaLabel(
                      metrics.newContactsToday.current - metrics.newContactsToday.previous,
                      t('vsYesterday'),
                      t('noChange', { suffix: t('vsYesterday') })
                    ),
                  }}
                />
                <MetricCard
                  title={t('openDealsValue')}
                  value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
                  icon={DollarSign}
                  subtitle={t('openDeals', { count: metrics.openDealsCount })}
                />
                <MetricCard
                  title={t('messagesSentToday')}
                  value={metrics.messagesSentToday.current.toLocaleString()}
                  icon={Send}
                  delta={{
                    sign:
                      metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                    label: deltaLabel(
                      metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                      t('vsYesterday'),
                      t('noChange', { suffix: t('vsYesterday') })
                    ),
                  }}
                />
              </>
            )}
          </div>

          {/* Quick actions */}
          <QuickActions />

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="h-full lg:col-span-3">
              <ConversationsChart
                series={series}
                loading={seriesLoading}
                range={range}
                onRangeChange={handleRangeChange}
              />
            </div>
            <div className="h-full lg:col-span-2">
              <PipelineDonut
                data={pipeline}
                loading={pipelineLoading}
                currency={defaultCurrency}
              />
            </div>
          </div>

          {/* Response time */}
          <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

          {/* Activity feed */}
          <ActivityFeed items={activity} loading={activityLoading} />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string, noChangeLabel: string): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}
