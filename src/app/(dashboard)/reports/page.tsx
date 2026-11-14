"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  ANALYTICAL_REPORT_DEFINITIONS,
  exportAnalyticalReportToCsv,
  generateAnalyticalReport,
  type AnalyticalReportId,
  type AnalyticalReportResult,
} from "@/lib/reports/analytical-reports"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MiniCalendarPicker } from "@/components/dashboard/mini-calendar-picker"
import { ExecutiveReportsView } from "@/components/reports/executive-reports-view"
import {
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Download,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Clock,
  FileText,
  Users,
  Briefcase,
} from "lucide-react"

function toLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatYmdBr(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd
  const [y, m, d] = ymd.split("-")
  return `${d}/${m}/${y}`
}

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

const SUMMARY_TONE_CLASSES: Record<string, string> = {
  default: "border-border bg-card",
  primary: "border-primary/25 bg-primary/[0.04]",
  success: "border-emerald-500/25 bg-emerald-500/[0.04]",
  warning: "border-amber-500/25 bg-amber-500/[0.04]",
  danger: "border-rose-500/25 bg-rose-500/[0.04]",
}

export default function ReportsPage() {
  // 2-Part Module Switcher ('part1_analytical' | 'part2_executive')
  const [activePart, setActivePart] = useState<"part1_analytical" | "part2_executive">("part1_analytical")

  // Report Selection & Filters
  const [selectedReportId, setSelectedReportId] = useState<AnalyticalReportId>("atendimentos_detalhado")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const initialDates = useMemo(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 29 * 86400000)
    return {
      start: toLocalYmd(start),
      end: toLocalYmd(end),
      label: "Últimos 30 dias",
    }
  }, [])

  const [startDate, setStartDate] = useState<string>(initialDates.start)
  const [endDate, setEndDate] = useState<string>(initialDates.end)
  const [dateLabel, setDateLabel] = useState<string>(initialDates.label)
  const [campaignId, setCampaignId] = useState<string>("all")
  const [operatorId, setOperatorId] = useState<string>("all")
  const [channelFilter, setChannelFilter] = useState<"all" | "human" | "bot" | "ai">("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Filter Option Lists
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
  const [operators, setOperators] = useState<{ id: string; name: string }[]>([])

  // Report Data State
  const [reportData, setReportData] = useState<AnalyticalReportResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  const activeDefinition = useMemo(
    () =>
      ANALYTICAL_REPORT_DEFINITIONS.find((d) => d.id === selectedReportId) ??
      ANALYTICAL_REPORT_DEFINITIONS[0],
    [selectedReportId]
  )

  // Load campaigns and operators once for filter dropdowns
  useEffect(() => {
    const db = createClient()
    Promise.all([
      db.from("distribution_campaigns").select("id, name").order("name"),
      db.from("profiles").select("user_id, full_name, account_role").order("full_name"),
    ])
      .then(([campRes, profRes]) => {
        setCampaigns(
          ((campRes.data ?? []) as any[]).map((c) => ({
            id: c.id,
            name: c.name,
          }))
        )
        setOperators(
          ((profRes.data ?? []) as any[])
            .filter((p) => p.account_role !== "viewer")
            .map((p) => ({
              id: p.user_id,
              name: p.full_name || "Operador",
            }))
        )
      })
      .catch((err) => console.error("[reports] filter options load error:", err))
  }, [])

  // Fetch analytical report whenever report type, date range, campaign, operator, or channel changes
  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const db = createClient()
      const res = await generateAnalyticalReport(db, {
        reportId: selectedReportId,
        startDate,
        endDate,
        campaignId,
        operatorId,
        channelFilter,
      })
      setReportData(res)
      setCurrentPage(1)
      const now = new Date()
      setLastUpdated(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    } catch (err) {
      console.error("[reports] analytical query failed:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedReportId, startDate, endDate, campaignId, operatorId, channelFilter])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  // Client-side search across all cells of the active report
  const filteredRows = useMemo(() => {
    if (!reportData) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return reportData.rows
    return reportData.rows.filter((row) =>
      Object.values(row.cells).some((cell) =>
        String(cell?.text ?? "")
          .toLowerCase()
          .includes(q)
      )
    )
  }, [reportData, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize
    return filteredRows.slice(startIdx, startIdx + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const handleExportCsv = () => {
    if (!filteredRows.length) return
    const csv = exportAnalyticalReportToCsv(activeDefinition, filteredRows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute(
      "download",
      `relatorio_${activeDefinition.id}_${startDate}_a_${endDate}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Group definitions by category for the organized LUMA selector
  const groupedDefinitions = useMemo(() => {
    const groups: {
      category: string
      categoryLabel: string
      items: typeof ANALYTICAL_REPORT_DEFINITIONS
    }[] = [
      { category: "atendimento", categoryLabel: "Atendimento, Tempos (TME/TMR) & Operadores", items: [] },
      { category: "canais_tabulacao", categoryLabel: "Canais (Robô / IA / Humano) & Tabulações", items: [] },
      { category: "disparos_higienizacao", categoryLabel: "Disparos em Massa & Higienização de Base", items: [] },
    ]
    for (const def of ANALYTICAL_REPORT_DEFINITIONS) {
      const grp = groups.find((g) => g.category === def.category)
      if (grp) grp.items.push(def)
    }
    return groups
  }, [])

  return (
    <div className="space-y-6">
      {/* ================= TOP HEADER & 2-PART SWITCHER ================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Relatórios da Operação
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Auditoria analítica de tempos (TME e TMR), canais (Humano, Robô e IA), encerramentos e tabulações
          </p>
        </div>

        {/* 2-Part Switcher (Same proportion as Dashboard switcher) */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActivePart("part1_analytical")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
              activePart === "part1_analytical"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
            <span>Relatórios Analíticos</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePart("part2_executive")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
              activePart === "part2_executive"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Relatórios Gerenciais</span>
          </button>
        </div>
      </div>

      {activePart === "part1_analytical" ? (
        /* ================= PARTE 1: RELATÓRIOS ANALÍTICOS ================= */
        <div className="space-y-5">
          {/* LUMA ALIGNED 12-COLUMN CONTROL BAR (5 | 4 | 3 on Row 1, 3+2 | 4 | 3 on Row 2) */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            {/* ROW 1: Report Type (5 cols) | Date Range Popover (4 cols) | Actions (3 cols) */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              {/* Col 1..5: Tipo de Relatório */}
              <div className="lg:col-span-5">
                <label
                  htmlFor="analytical-report-select"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Modelo de Relatório Analítico
                </label>
                <div className="relative">
                  <select
                    id="analytical-report-select"
                    value={selectedReportId}
                    onChange={(e) => setSelectedReportId(e.target.value as AnalyticalReportId)}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background pr-8 pl-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40 focus:border-primary focus:outline-none cursor-pointer"
                  >
                    {groupedDefinitions.map((grp) => (
                      <optgroup key={grp.category} label={grp.categoryLabel}>
                        {grp.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Col 6..9: Período / Data do Relatório */}
              <div className="lg:col-span-4">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Período / Data do Relatório
                </span>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger
                    className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 cursor-pointer"
                  >
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
                        setStartDate(format(start, "yyyy-MM-dd"))
                        setEndDate(format(end, "yyyy-MM-dd"))
                        setDateLabel(label)
                        setCalendarOpen(false)
                      }}
                      onCancel={() => setCalendarOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Col 10..12: Ações (Atualizar + Exportar CSV) */}
              <div className="lg:col-span-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <span>Ações</span>
                  {lastUpdated && (
                    <span className="font-mono text-[10px] font-normal lowercase">
                      às {lastUpdated}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchReport()}
                    disabled={loading}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
                    title="Atualizar dados"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    <span>Atualizar</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={loading || filteredRows.length === 0}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-2xs transition-opacity hover:opacity-95 disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Exportar CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ROW 2: Carteira (3 cols) + Operador (2 cols) [=5] | Canal Segmented (4 cols) | Busca (3 cols) */}
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border/60 pt-3 lg:grid-cols-12">
              {/* Col 1..3: Carteira */}
              <div className="lg:col-span-3">
                <label
                  htmlFor="report-campaign-filter"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Carteira
                </label>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="report-campaign-filter"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background pr-7 pl-8 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todas as carteiras</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Col 4..5: Operador */}
              <div className="lg:col-span-2">
                <label
                  htmlFor="report-operator-filter"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Operador
                </label>
                <div className="relative">
                  <Users className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <select
                    id="report-operator-filter"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background pr-7 pl-8 text-xs font-medium text-foreground transition-colors hover:bg-muted/40 focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              {/* Col 6..9: Canal de Atuação (Segmented Control identical to Dashboard) */}
              <div className="lg:col-span-4">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Canal de Atuação
                </span>
                <div className="grid h-9 grid-cols-4 items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
                  {(
                    [
                      { id: "all", label: "Todos" },
                      { id: "human", label: "Humano" },
                      { id: "bot", label: "Robô" },
                      { id: "ai", label: "Agente IA" },
                    ] as const
                  ).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChannelFilter(ch.id)}
                      className={cn(
                        "h-full rounded-md font-medium transition-all cursor-pointer",
                        channelFilter === ch.id
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Col 10..12: Busca Rápida */}
              <div className="lg:col-span-3">
                <label
                  htmlFor="report-table-search"
                  className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Busca Rápida
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="report-table-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Devedor, telefone, CPF, tabulação..."
                    className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE REPORT SUMMARY KPI STRIP */}
          {reportData && reportData.summary.length > 0 && (
            <div
              className={cn(
                "grid grid-cols-1 gap-3 sm:grid-cols-2",
                reportData.summary.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"
              )}
            >
              {reportData.summary.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-4 shadow-2xs",
                    SUMMARY_TONE_CLASSES[item.tone || "default"]
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-2xl font-bold tracking-tight text-foreground">
                      {loading ? "—" : item.value}
                    </span>
                    {item.sublabel && !loading && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ANALYTICAL DATA TABLE CARD */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {/* Table Header Strip */}
            <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">
                    {activeDefinition.label}
                  </h2>
                  <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {activeDefinition.categoryLabel}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {activeDefinition.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Registros:{" "}
                  <strong className="font-semibold text-foreground">
                    {loading ? "..." : filteredRows.length}
                  </strong>
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  aria-label="Registros por página"
                  className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground cursor-pointer"
                >
                  <option value={25}>25 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                </select>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {activeDefinition.columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          "whitespace-nowrap px-4 py-3",
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left"
                        )}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-4 py-3 text-right">
                      Auditoria
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {activeDefinition.columns.map((col) => (
                          <td key={col.key} className="px-4 py-3.5">
                            <div className="h-4 w-24 rounded bg-muted/60" />
                          </td>
                        ))}
                        <td className="px-4 py-3.5 text-right">
                          <div className="ml-auto h-4 w-16 rounded bg-muted/60" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeDefinition.columns.length + 1}
                        className="px-6 py-12 text-center"
                      >
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <FileText className="h-5 w-5" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            Nenhum registro encontrado neste período
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Altere o período no calendário acima ou selecione outro modelo de relatório analítico.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        {activeDefinition.columns.map((col) => {
                          const cell = row.cells[col.key]
                          if (!cell) {
                            return (
                              <td key={col.key} className="px-4 py-3 text-muted-foreground">
                                —
                              </td>
                            )
                          }

                          return (
                            <td
                              key={col.key}
                              className={cn(
                                "px-4 py-3 align-middle",
                                col.align === "right"
                                  ? "text-right"
                                  : col.align === "center"
                                    ? "text-center"
                                    : "text-left",
                                col.type === "mono" || col.type === "phone" || col.type === "datetime"
                                  ? "font-mono text-[11px] whitespace-nowrap"
                                  : "text-xs",
                                col.type === "currency" || col.type === "percent"
                                  ? "font-mono font-semibold whitespace-nowrap"
                                  : ""
                              )}
                            >
                              {col.type === "badge" || cell.badgeTone ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                                    BADGE_TONE_CLASSES[cell.badgeTone || "neutral"]
                                  )}
                                >
                                  {cell.text}
                                </span>
                              ) : (
                                <span className="line-clamp-2 max-w-[360px] text-foreground">
                                  {cell.text}
                                </span>
                              )}
                            </td>
                          )
                        })}

                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {row.mediaUrl && (
                              <a
                                href={row.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Anexo
                              </a>
                            )}
                            {row.conversationId ? (
                              <Link
                                href={`/inbox?conversation=${row.conversationId}`}
                                className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                              >
                                <span>Abrir Conversa</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {!loading && filteredRows.length > 0 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border bg-muted/15 px-4 py-3 text-xs sm:flex-row sm:px-5">
                <span className="text-muted-foreground">
                  Exibindo{" "}
                  <strong className="text-foreground">
                    {(currentPage - 1) * pageSize + 1}
                  </strong>{" "}
                  a{" "}
                  <strong className="text-foreground">
                    {Math.min(currentPage * pageSize, filteredRows.length)}
                  </strong>{" "}
                  de{" "}
                  <strong className="text-foreground">{filteredRows.length}</strong>{" "}
                  registros
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </button>
                  <span className="px-2 font-mono text-xs font-semibold text-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40 cursor-pointer"
                  >
                    Próxima
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= PARTE 2: VISÃO GERENCIAL & ESTRATÉGICA ================= */
        <ExecutiveReportsView
          startDate={startDate}
          endDate={endDate}
          dateLabel={dateLabel}
          onDateChange={(s, e, lbl) => {
            setStartDate(s)
            setEndDate(e)
            setDateLabel(lbl)
          }}
          campaignId={campaignId}
          onCampaignChange={setCampaignId}
          campaigns={campaigns}
        />
      )}
    </div>
  )
}
