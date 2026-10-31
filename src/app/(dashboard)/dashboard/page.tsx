"use client"

import { useCallback, useEffect, useState } from 'react'
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

import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const { defaultCurrency } = useAuth()

  // View Mode: 'operational' (Cobrança, Operadores & Campanhas) or 'pipeline' (Vendas & Pipeline)
  const [viewMode, setViewMode] = useState<'operational' | 'pipeline'>('operational')

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

  const loadAll = useCallback(() => {
    const db = createClient()

    // 1. Operational data for debt collection & distribution
    void loadOperationalDashboardData(db, 30)
      .then((data) => setOperationalData(data))
      .catch((err) => console.error('[dashboard] operational data failed:', err))
      .finally(() => setOperationalLoading(false))

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
    loadAll()
  }, [loadAll])

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

  return (
    <div className="space-y-6">
      {/* Header with View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {viewMode === 'operational'
              ? 'Centro de Operações & Distribuição Inteligente'
              : t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {viewMode === 'operational'
              ? 'Acompanhamento de resposta, conversão em acordos, canais e produtividade por operador e assessoria'
              : t('description')}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('operational')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'operational'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Operações & Cobrança
            <span className="ml-1 flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
              viewMode === 'pipeline'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Pipeline & Vendas
          </button>
        </div>
      </div>

      {viewMode === 'operational' ? (
        /* ================= OPERATIONAL & COBRANÇA VIEW ================= */
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
            operators={operationalData?.operators ?? []}
            loading={operationalLoading}
          />

          {/* Row 3: Detalhamento de Produtividade por Assessoria / Campanha */}
          <CampaignsProductivityTable
            campaigns={operationalData?.campaigns ?? []}
            loading={operationalLoading}
          />
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
