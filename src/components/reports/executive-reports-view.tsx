"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  exportExecutiveReportToCsv,
  generateExecutiveReport,
  type ExecutiveReportData,
} from "@/lib/reports/executive-reports"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MiniCalendarPicker } from "@/components/dashboard/mini-calendar-picker"
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
  RefreshCw,
  Briefcase,
  Clock,
  TrendingUp,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GitMerge,
  CalendarRange,
} from "lucide-react"

const BADGE_TONE_CLASSES: Record<string, string> = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  primary:
    "border-primary/30 bg-primary/10 text-primary",
  info:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  neutral:
    "border-border bg-muted/60 text-muted-foreground",
}

function formatYmdBr(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd
  const [y, m, d] = ymd.split("-")
  return `${d}/${m}/${y}`
}

interface ExecutiveReportsViewProps {
  startDate: string
  endDate: string
  dateLabel: string
  onDateChange: (start: string, end: string, label: string) => void
  campaignId: string
  onCampaignChange: (id: string) => void
  campaigns: { id: string; name: string }[]
}

export function ExecutiveReportsView({
  startDate,
  endDate,
  dateLabel,
  onDateChange,
  campaignId,
  onCampaignChange,
  campaigns,
}: ExecutiveReportsViewProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [data, setData] = useState<ExecutiveReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState("")

  const fetchExecutiveData = useCallback(async () => {
    setLoading(true)
    try {
      const db = createClient()
      const res = await generateExecutiveReport(db, {
        startDate,
        endDate,
        campaignId,
      })
      setData(res)
      const now = new Date()
      setLastUpdated(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    } catch (err) {
      console.error("[reports] executive query failed:", err)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, campaignId])

  useEffect(() => {
    void fetchExecutiveData()
  }, [fetchExecutiveData])

  const handleExportCsv = () => {
    if (!data) return
    const csv = exportExecutiveReportToCsv(data)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `fechamento_gerencial_${startDate}_a_${endDate}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* ================= TOP FILTER BAR (12-COLUMN ALIGNED) ================= */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Col 1..5: Carteira / Escopo */}
          <div className="lg:col-span-5">
            <label
              htmlFor="exec-campaign-select"
              className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
            >
              Escopo da Carteira / Credor
            </label>
            <div className="relative">
              <Briefcase className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                id="exec-campaign-select"
                value={campaignId}
                onChange={(e) => onCampaignChange(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background pr-8 pl-8 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="all">Visão Consolidada (Todas as Carteiras)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    Carteira: {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Col 6..9: Período / Data */}
          <div className="lg:col-span-4">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Período de Fechamento
            </span>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 cursor-pointer">
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">{dateLabel}</span>
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    ({startDate === endDate
                      ? formatYmdBr(startDate)
                      : `${formatYmdBr(startDate)} — ${formatYmdBr(endDate)}`})
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border border-border bg-card p-3 shadow-xl"
                align="start"
              >
                <MiniCalendarPicker
                  initialStart={startDate ? new Date(`${startDate}T12:00:00`) : null}
                  initialEnd={endDate ? new Date(`${endDate}T12:00:00`) : null}
                  onApply={(start, end, label) => {
                    onDateChange(
                      format(start, "yyyy-MM-dd"),
                      format(end, "yyyy-MM-dd"),
                      label
                    )
                    setCalendarOpen(false)
                  }}
                  onCancel={() => setCalendarOpen(false)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Col 10..12: Ações */}
          <div className="lg:col-span-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <span>Exportação</span>
              {lastUpdated && (
                <span className="font-mono text-[10px] font-normal lowercase">
                  às {lastUpdated}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchExecutiveData()}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                <span>Atualizar</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={loading || !data}
                className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs transition-opacity hover:opacity-95 disabled:opacity-40 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Exportar CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= EXECUTIVE KPI STRIP (4 CARDS) ================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between rounded-xl border border-primary/25 bg-primary/[0.04] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Acionamentos & Resposta
            </span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading || !data ? "—" : data.kpis.totalBroadcastSent}
            </span>
            {!loading && data && (
              <span className="font-mono text-xs font-semibold text-primary">
                {data.kpis.broadcastReplyRate}% resp.
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {loading || !data
              ? "Calculando entregas..."
              : `Taxa de entrega Meta: ${data.kpis.broadcastDeliveryRate}%`}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Retenção no Automático (Robô / IA)
            </span>
            <Bot className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading || !data ? "—" : `${data.kpis.autoRetentionRate}%`}
            </span>
            {!loading && data && (
              <span className="font-mono text-xs text-muted-foreground">
                de {data.kpis.totalConversations} atend.
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Conversas conduzidas sem ocupar operador humano
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              TME (1ª Resp) & TMR Operador
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading || !data ? "—" : data.kpis.avgOperatorTmrLabel}
            </span>
            {!loading && data && (
              <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                1ª resp: {data.kpis.avgWaitTmeLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tempo médio que o operador leva para responder o devedor
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Desfechos Positivos (Acordos + Promessas)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {loading || !data ? "—" : data.kpis.positiveOutcomesTotal}
            </span>
            {!loading && data && (
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {data.kpis.positiveOutcomeRate}% conv.
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Acordos ganhos no funil + retornos/promessas agendados
          </p>
        </div>
      </div>

      {/* ================= BLOCO 2A & 2B: IMPACTO DO TMR NO ABANDONO + FUNIL DE MATURAÇÃO ================= */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 2A. Impacto do Tempo de Resposta do Operador no Abandono do Devedor (7 cols) */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-7">
          <div className="border-b border-border bg-muted/20 px-5 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground">
                Impacto da Demora do Operador no Abandono do Devedor (TMR × Conversão)
              </h2>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Auditoria de Pico
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mostra quantos devedores continuam negociando vs. quantos esfriam/abandonam conforme o tempo que o operador demora para responder.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="px-4 py-3">Faixa de Tempo do Operador</th>
                  <th className="px-3 py-3 text-right">Conversas</th>
                  <th className="px-3 py-3 text-right">Devedor Continuou</th>
                  <th className="px-3 py-3 text-right">Esfriou (Abandono)</th>
                  <th className="px-4 py-3 text-right">Acordo / Promessa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(data?.tmrCorrelation ?? []).map((b) => (
                  <tr key={b.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold",
                            BADGE_TONE_CLASSES[b.tone]
                          )}
                        >
                          {b.rangeBadge}
                        </span>
                        <span className="font-medium text-foreground">
                          {b.bucketLabel}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold text-foreground">
                      {b.conversationsCount}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {b.continuedPercent}%
                      </span>{" "}
                      <span className="text-[11px] text-muted-foreground">
                        ({b.continuedCount})
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono">
                      <span
                        className={cn(
                          "font-semibold",
                          b.abandonedPercent >= 40
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground"
                        )}
                      >
                        {b.abandonedPercent}%
                      </span>{" "}
                      <span className="text-[11px] text-muted-foreground">
                        ({b.abandonedCount})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-primary">
                      {b.positiveOutcomePercent}% ({b.positiveOutcomeCount})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reaction Time Strip Inside Card Footer */}
          <div className="mt-auto border-t border-border bg-muted/15 px-5 py-3.5">
            <span className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Velocidade de Reação do Devedor após o Envio da Ação
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(data?.reactionTimes ?? []).map((rt, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/80 bg-background p-2.5"
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {rt.percent}%
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {rt.count} resp
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                    {rt.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{rt.sublabel}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2B. Funil Completo de Maturação da Ação (5 cols) */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-5">
          <div className="border-b border-border bg-muted/20 px-5 py-3.5">
            <h2 className="text-sm font-bold text-foreground">
              Funil de Maturação da Ação (Do Disparo ao Desfecho)
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Conversão acumulada desde o envio até a tabulação positiva no período.
            </p>
          </div>

          <div className="flex-1 space-y-2.5 p-5">
            {(data?.actionFunnel ?? []).map((stage) => (
              <div key={stage.step} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    <strong className="mr-1.5 font-mono text-muted-foreground">
                      {stage.step}.
                    </strong>
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">{stage.count}</span>
                    <span className="w-12 text-right text-[11px] text-muted-foreground">
                      ({stage.percentOfTop}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.max(4, stage.percentOfTop)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= BLOCO 1: FECHAMENTO DIÁRIO DA OPERAÇÃO ================= */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-1 border-b border-border bg-muted/20 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Fechamento Diário da Operação (Série Histórica do Período)
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Balanço consolidado dia a dia de acionamentos, respostas, divisão Robô/IA vs. Humano, tempos (TME/TMR) e desfechos.
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {data?.dailySeries.length ?? 0} dias com movimentação
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Disparos Enviados</th>
                <th className="px-4 py-3 text-right">Msgs de Devedores</th>
                <th className="px-4 py-3 text-right">Conversas Ativas</th>
                <th className="px-4 py-3 text-right">100% Robô / IA</th>
                <th className="px-4 py-3 text-right">Atend. Humano</th>
                <th className="px-4 py-3 text-right">TME (1ª Resp)</th>
                <th className="px-4 py-3 text-right">TMR Operador</th>
                <th className="px-4 py-3 text-right">Encerradas</th>
                <th className="px-4 py-3 text-right">Acordos / Promessas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-16 rounded bg-muted/60" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (data?.dailySeries ?? []).length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhuma movimentação registrada no intervalo selecionado.
                  </td>
                </tr>
              ) : (
                (data?.dailySeries ?? []).map((d) => (
                  <tr key={d.dateKey} className="hover:bg-muted/25">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-foreground">
                      {d.dateLabel}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{d.broadcastSent}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.inboundReplies}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {d.activeConversations}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sky-600 dark:text-sky-400">
                      {d.retainedAutoCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{d.humanAttendedCount}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.avgWaitTmeLabel}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.avgOperatorTmrLabel}</td>
                    <td className="px-4 py-3 text-right font-mono">{d.closedCount}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {d.positiveOutcomesCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BLOCO 3: COMPARATIVO CONSOLIDADO POR CARTEIRA / CREDOR ================= */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="border-b border-border bg-muted/20 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Comparativo Consolidado por Carteira / Credor
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Eficiência operacional, retenção automática, tempos de atendimento e conversão comparados entre carteiras.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <th className="px-4 py-3">Carteira</th>
                <th className="px-4 py-3">Cliente / Credor</th>
                <th className="px-3 py-3 text-right">Operadores</th>
                <th className="px-3 py-3 text-right">CPFs Triados</th>
                <th className="px-3 py-3 text-right">Conversas</th>
                <th className="px-3 py-3 text-right">% Retido Robô/IA</th>
                <th className="px-3 py-3 text-right">TME Médio</th>
                <th className="px-3 py-3 text-right">TMR Médio</th>
                <th className="px-3 py-3 text-right">Promessas</th>
                <th className="px-3 py-3 text-right">Acordos</th>
                <th className="px-4 py-3 text-right">Conversão (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(data?.campaignsComparison ?? []).map((c) => (
                <tr key={c.campaignId} className="hover:bg-muted/25">
                  <td className="px-4 py-3 font-semibold text-foreground">{c.campaignName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.clientOrCreditor}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.operatorsCount}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.cpfsTriaged}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold">
                    {c.totalConversations}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{c.autoRetainedPercent}%</td>
                  <td className="px-3 py-3 text-right font-mono">{c.avgTmeLabel}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.avgTmrLabel}</td>
                  <td className="px-3 py-3 text-right font-mono">{c.promisesCount}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {c.agreementsCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-primary">
                    {c.positiveConversionPercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= BLOCO 4 & 5: EFICIÊNCIA DOS CANAIS (ROBÔ/IA/HUMANO) + MATRIZ DE TABULAÇÕES ================= */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Bloco 4: Eficiência Robô / IA / Humano (6 cols) */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-6">
          <div className="border-b border-border bg-muted/20 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Eficiência por Canal: Robô (Fluxo) + IA vs. Humano
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Participação, duração média e resolução de cada modelo de atendimento.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="px-4 py-3">Modalidade de Atendimento</th>
                  <th className="px-3 py-3 text-right">Conversas</th>
                  <th className="px-3 py-3 text-right">% Share</th>
                  <th className="px-3 py-3 text-right">TMA Médio</th>
                  <th className="px-4 py-3 text-right">Desfecho Positivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(data?.channelsEfficiency ?? []).map((ch) => (
                  <tr key={ch.channelKey} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          BADGE_TONE_CLASSES[ch.badgeTone]
                        )}
                      >
                        {ch.channelLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold">
                      {ch.conversationsCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                      {ch.sharePercent}%
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{ch.avgDurationLabel}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {ch.positiveOutcomesCount} ({ch.positiveRatePercent}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fluxos Conversacionais Sub-table if any flow ran */}
          {(data?.flowsEfficiency ?? []).length > 0 && (
            <div className="border-t border-border bg-muted/10 px-5 py-3">
              <span className="block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Desempenho por Fluxo do Robô (Retenção vs. Parada)
              </span>
              <div className="mt-2 space-y-1.5">
                {(data?.flowsEfficiency ?? []).map((fl) => (
                  <div
                    key={fl.flowId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{fl.flowName}</span>
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        Nó principal: {fl.topStopNode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span>{fl.totalRuns} exec.</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {fl.completedInBot} concluídos ({fl.retentionPercent}%)
                      </span>
                      <span className="text-primary">{fl.handedOffToHuman} transbordos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bloco 5: Matriz de Tabulações e Quem Encerrou (6 cols) */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:col-span-6">
          <div className="border-b border-border bg-muted/20 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                Matriz de Tabulações, Finalizações e Quem Encerrou
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Distribuição percentual dos desfechos de atendimento e quem realizou o encerramento.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="px-4 py-3">Tabulação / Desfecho</th>
                  <th className="px-3 py-3 text-right">Qtd.</th>
                  <th className="px-3 py-3 text-right">% Total</th>
                  <th className="px-3 py-3 text-right">Enc. Operador</th>
                  <th className="px-3 py-3 text-right">Enc. Robô/IA</th>
                  <th className="px-4 py-3">Operador Destaque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {(data?.tabulationMatrix ?? []).map((tm, idx) => (
                  <tr key={idx} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          BADGE_TONE_CLASSES[tm.categoryTone]
                        )}
                      >
                        {tm.tabulation}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold">
                      {tm.count}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-muted-foreground">
                      {tm.sharePercent}%
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{tm.closedByOperator}</td>
                    <td className="px-3 py-3 text-right font-mono">{tm.closedByAuto}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {tm.topOperatorName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
