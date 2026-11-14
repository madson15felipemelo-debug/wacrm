"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
  FileSpreadsheet,
  Calendar,
  Download,
  RefreshCw,
  Search,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Sparkles,
  Users,
  Briefcase,
} from "lucide-react"

type DatePreset = "today" | "yesterday" | "7d" | "15d" | "30d" | "this_month" | "single_day" | "custom"

function toLocalYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const now = new Date()
  const today = toLocalYmd(now)

  if (preset === "today" || preset === "single_day") {
    return { start: today, end: today }
  }
  if (preset === "yesterday") {
    const y = new Date(now.getTime() - 86400000)
    const ymd = toLocalYmd(y)
    return { start: ymd, end: ymd }
  }
  if (preset === "7d") {
    const s = new Date(now.getTime() - 6 * 86400000)
    return { start: toLocalYmd(s), end: today }
  }
  if (preset === "15d") {
    const s = new Date(now.getTime() - 14 * 86400000)
    return { start: toLocalYmd(s), end: today }
  }
  if (preset === "this_month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: toLocalYmd(first), end: today }
  }
  // Default 30d
  const s = new Date(now.getTime() - 29 * 86400000)
  return { start: toLocalYmd(s), end: today }
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
  const [selectedReportId, setSelectedReportId] = useState<AnalyticalReportId>("envios_analiticos")
  const [datePreset, setDatePreset] = useState<DatePreset>("30d")
  const initialRange = useMemo(() => getPresetDates("30d"), [])
  const [startDate, setStartDate] = useState<string>(initialRange.start)
  const [endDate, setEndDate] = useState<string>(initialRange.end)
  const [campaignId, setCampaignId] = useState<string>("all")
  const [operatorId, setOperatorId] = useState<string>("all")
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

  // Fetch analytical report whenever report type, date range, campaign, or operator changes
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
      })
      setReportData(res)
      setCurrentPage(1)
      const now = new Date()
      setLastUpdated(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    } catch (err) {
      console.error("[reports] analytical query failed:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedReportId, startDate, endDate, campaignId, operatorId])

  useEffect(() => {
    void fetchReport()
  }, [fetchReport])

  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset !== "custom") {
      const { start, end } = getPresetDates(preset)
      setStartDate(start)
      setEndDate(end)
    }
  }

  const handleStartDateChange = (val: string) => {
    if (!val) return
    setStartDate(val)
    if (datePreset === "single_day") {
      setEndDate(val)
    } else {
      if (val > endDate) setEndDate(val)
      setDatePreset("custom")
    }
  }

  const handleEndDateChange = (val: string) => {
    if (!val) return
    setEndDate(val)
    if (val < startDate) setStartDate(val)
    setDatePreset("custom")
  }

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
      { category: "disparos", categoryLabel: "Disparos & Entregas", items: [] },
      { category: "respostas", categoryLabel: "Respostas & Comportamento do Cliente", items: [] },
      { category: "negociacao", categoryLabel: "Negociação, Funil & Operação", items: [] },
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-primary uppercase">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Central de Inteligência
            </span>
            {lastUpdated && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Atualizado às {lastUpdated}
              </span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
            Relatórios da Operação
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Auditoria analítica de envios, respostas, qualificação de carteira, janela 24h e produtividade
          </p>
        </div>

        {/* 2-Part Switcher */}
        <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActivePart("part1_analytical")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all cursor-pointer",
              activePart === "part1_analytical"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
            <span>Parte 1 · Relatórios Analíticos</span>
            <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-bold text-primary">
              15
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePart("part2_executive")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all cursor-pointer",
              activePart === "part2_executive"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Parte 2 · Relatórios Gerenciais</span>
          </button>
        </div>
      </div>

      {activePart === "part1_analytical" ? (
        /* ================= PARTE 1: RELATÓRIOS ANALÍTICOS ================= */
        <div className="space-y-5">
          {/* LUMA CONTROL PANEL: REPORT SELECTOR + DATE PICKER + FILTERS */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* 1. Analytical Report Selector Dropdown */}
              <div className="lg:col-span-4">
                <label
                  htmlFor="analytical-report-select"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Tipo de Relatório Analítico
                </label>
                <div className="relative">
                  <select
                    id="analytical-report-select"
                    value={selectedReportId}
                    onChange={(e) => setSelectedReportId(e.target.value as AnalyticalReportId)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3.5 pr-9 text-sm font-semibold text-foreground shadow-2xs transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer"
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
                </div>
              </div>

              {/* 2. Date Selector (Specific Date or Range) */}
              <div className="lg:col-span-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Data / Período do Relatório
                  </span>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        { id: "today", label: "Hoje" },
                        { id: "yesterday", label: "Ontem" },
                        { id: "single_day", label: "Dia único" },
                        { id: "7d", label: "7D" },
                        { id: "30d", label: "30D" },
                        { id: "this_month", label: "Mês" },
                      ] as { id: DatePreset; label: string }[]
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handlePresetSelect(p.id)}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer",
                          datePreset === p.id
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {datePreset === "single_day" ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        aria-label="Data do relatório"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePresetSelect("custom")}
                      className="h-10 shrink-0 rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      Intervalo de datas
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
                        De
                      </span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        aria-label="Data inicial"
                        className="h-10 w-full rounded-xl border border-border bg-background pr-2.5 pl-9 text-xs font-medium text-foreground shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none sm:text-sm"
                      />
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[11px] font-medium text-muted-foreground">
                        Até
                      </span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        aria-label="Data final"
                        className="h-10 w-full rounded-xl border border-border bg-background pr-2.5 pl-10 text-xs font-medium text-foreground shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Action Buttons (Refresh + CSV Export) */}
              <div className="flex items-end gap-2 lg:col-span-3">
                <button
                  type="button"
                  onClick={() => void fetchReport()}
                  disabled={loading}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
                  title="Atualizar dados do relatório"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={loading || filteredRows.length === 0}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar Excel (CSV)</span>
                </button>
              </div>
            </div>

            {/* Quick Category Pills + Secondary Filters Row */}
            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Quick Pills for the 15 reports */}
              <div className="flex flex-wrap items-center gap-1.5">
                {ANALYTICAL_REPORT_DEFINITIONS.map((def) => {
                  const active = def.id === selectedReportId
                  return (
                    <button
                      key={def.id}
                      type="button"
                      onClick={() => setSelectedReportId(def.id)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                        active
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                          : "border-border/70 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {def.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Secondary Filter Bar: Carteira, Operador, Search */}
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border/70 pt-4 sm:grid-cols-12">
              <div className="sm:col-span-3">
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    aria-label="Filtrar por carteira"
                    className="h-9 w-full rounded-lg border border-border bg-background pr-7 pl-8 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todas as Carteiras</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <div className="relative">
                  <Users className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    aria-label="Filtrar por operador"
                    className="h-9 w-full rounded-lg border border-border bg-background pr-7 pl-8 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos os Operadores</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Filtrar linhas por nome, telefone, CPF, modelo, operador ou mensagem..."
                    className="h-9 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE REPORT HEADER BANNER + SUMMARY KPI STRIP */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(reportData?.summary ?? []).map((item, idx) => (
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
                    <span className="text-xs font-semibold text-muted-foreground">
                      {item.sublabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ANALYTICAL DATA TABLE CARD */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            {/* Table Header Strip */}
            <div className="flex flex-col gap-2 border-b border-border bg-muted/20 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Registros encontrados:{" "}
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
                  className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
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
                      Ação
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
                            Altere o intervalo de datas acima ou selecione outro relatório analítico para consultar os registros salvos no banco.
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
                                <span>Conversa</span>
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
        /* ================= PARTE 2: VISÃO GERENCIAL (ESTRUTURA PRONTA P/ ETAPA 2) ================= */
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Parte 2 · Relatórios Gerenciais & Consolidados
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-muted-foreground">
            A estrutura da Parte 2 já está reservada aqui no módulo de Relatórios para receber a segunda etapa conforme a sua definição.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setActivePart("part1_analytical")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-95 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Voltar para Parte 1 · Relatórios Analíticos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
