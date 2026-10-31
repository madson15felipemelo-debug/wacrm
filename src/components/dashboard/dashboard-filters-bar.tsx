"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  Building2,
  GitBranch,
  Bot,
  Sparkles,
  UserCheck,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface FilterState {
  datePreset: "today" | "yesterday" | "7d" | "15d" | "30d" | "month" | "custom";
  dateLabel: string;
  startDate?: string;
  endDate?: string;
  campaign: string;
  flow: string;
  channelType: "all" | "robot" | "ai" | "human";
}

interface DashboardFiltersBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
}

const DATE_PRESETS = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "15d", label: "Últimos 15 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "month", label: "Este Mês" },
] as const;

const CAMPAIGNS = [
  { id: "all", label: "Todas as Campanhas / Assessorias" },
  { id: "colombo", label: "Assessoria Colombo" },
  { id: "berlanda", label: "Assessoria Berlanda" },
  { id: "facil", label: "Fácil Resultado" },
  { id: "condor", label: "Condor Recuperação" },
  { id: "pg", label: "PG Negócios" },
  { id: "nexus", label: "Nexus Cobrança" },
  { id: "koerich", label: "Koerich_2631" },
  { id: "ambiental", label: "Ambiental" },
];

const FLOWS = [
  { id: "all", label: "Todos os Fluxos" },
  { id: "triage", label: "Triagem & Qualificação CPF" },
  { id: "cpc", label: "Negociação CPC Ativa" },
  { id: "preventive", label: "Cobrança Preventiva" },
  { id: "critical", label: "Recuperação Atraso >90d" },
  { id: "renegotiation", label: "Promessa Quebrada / Reacordo" },
];

export function DashboardFiltersBar({
  filters,
  onFilterChange,
  onRefresh,
  isRefreshing = false,
  lastUpdated = "agora",
}: DashboardFiltersBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handleSelectPreset = (preset: typeof DATE_PRESETS[number]["id"], label: string) => {
    onFilterChange({
      ...filters,
      datePreset: preset,
      dateLabel: label,
    });
    setCalendarOpen(false);
  };

  const handleApplyCustom = () => {
    if (!customStart) return;
    onFilterChange({
      ...filters,
      datePreset: "custom",
      dateLabel: `${customStart} até ${customEnd || customStart}`,
      startDate: customStart,
      endDate: customEnd,
    });
    setCalendarOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs shadow-xs lg:flex-row lg:items-center lg:justify-between">
      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5 text-primary" />
          Filtros:
        </span>

        {/* 1. Calendário Premium / Date Range Popover */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            className="inline-flex items-center h-8 gap-2 rounded-md border border-border/80 bg-background px-3 text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            <span>{filters.dateLabel}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-foreground">Selecionar Período</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id, p.label)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                      filters.datePreset === p.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>{p.label}</span>
                    {filters.datePreset === p.id && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="border-t border-border/60 pt-2.5 space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">Intervalo Personalizado</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Início</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full rounded-md border border-border/80 bg-background px-2 py-1 text-xs text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Fim</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full rounded-md border border-border/80 bg-background px-2 py-1 text-xs text-foreground"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full h-7 text-xs font-semibold"
                  onClick={handleApplyCustom}
                >
                  Aplicar Datas
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 2. Seletor de Campanha / Assessoria */}
        <div className="relative">
          <select
            value={filters.campaign}
            onChange={(e) => onFilterChange({ ...filters, campaign: e.target.value })}
            className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer appearance-none pr-7"
          >
            {CAMPAIGNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <Building2 className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* 3. Seletor de Fluxo / Chatbot */}
        <div className="relative">
          <select
            value={filters.flow}
            onChange={(e) => onFilterChange({ ...filters, flow: e.target.value })}
            className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer appearance-none pr-7"
          >
            {FLOWS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <GitBranch className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* 4. Tipo de Atendimento (Robô / IA / Humano) */}
        <div className="inline-flex items-center rounded-lg border border-border/80 bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "all" })}
            className={cn(
              "rounded-md px-2 py-1 font-medium transition-colors",
              filters.channelType === "all"
                ? "bg-muted text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "robot" })}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors",
              filters.channelType === "robot"
                ? "bg-sky-500/15 text-sky-400 font-semibold"
                : "text-muted-foreground hover:text-sky-400"
            )}
            title="Robô (Triagem)"
          >
            <Bot className="h-3 w-3" />
            Robô
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "ai" })}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors",
              filters.channelType === "ai"
                ? "bg-purple-500/15 text-purple-400 font-semibold"
                : "text-muted-foreground hover:text-purple-400"
            )}
            title="IA (Agentes Autônomos)"
          >
            <Sparkles className="h-3 w-3" />
            IA
          </button>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, channelType: "human" })}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors",
              filters.channelType === "human"
                ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                : "text-muted-foreground hover:text-emerald-400"
            )}
            title="Humano (Operadores)"
          >
            <UserCheck className="h-3 w-3" />
            Humano
          </button>
        </div>
      </div>

      {/* Refresh Button & Live Status */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Ao vivo: {lastUpdated}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-semibold"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
