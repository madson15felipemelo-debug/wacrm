"use client";

import { useState, useMemo } from "react";
import type {
  OperatorEvolutionProfile,
  OperatorEvolutionSummary,
  TrajectoryType,
  RiskLevel,
} from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Award,
  Sliders,
  Filter,
  Search,
  Building2,
  Users,
  Check,
  LayoutGrid,
  List,
  Flame,
  ShieldAlert,
  HelpCircle,
  Activity,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OperatorEvolutionTabProps {
  summary: OperatorEvolutionSummary;
  operators: OperatorEvolutionProfile[];
  loading?: boolean;
}

type TrajectoryFilter = "all" | TrajectoryType;
type ViewLayout = "cards" | "table";

export function OperatorEvolutionTab({
  summary,
  operators: initialOperators,
  loading = false,
}: OperatorEvolutionTabProps) {
  const [operatorsList, setOperatorsList] = useState<OperatorEvolutionProfile[]>(initialOperators);
  const [trajectoryFilter, setTrajectoryFilter] = useState<TrajectoryFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewLayout, setViewLayout] = useState<ViewLayout>("cards");
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({
    "act-6": true,
    "act-8": true,
  });
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Distinct campaigns
  const campaigns = useMemo(() => {
    const set = new Set<string>();
    operatorsList.forEach((op) => set.add(op.campaignName));
    return Array.from(set).sort();
  }, [operatorsList]);

  // Filter operators
  const filteredOperators = useMemo(() => {
    return operatorsList.filter((op) => {
      // Trajectory filter
      if (trajectoryFilter !== "all" && op.trajectory !== trajectoryFilter) {
        return false;
      }
      // Campaign filter
      if (campaignFilter !== "all" && op.campaignName !== campaignFilter) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          op.name.toLowerCase().includes(q) ||
          op.campaignName.toLowerCase().includes(q) ||
          op.role.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [operatorsList, trajectoryFilter, campaignFilter, search]);

  // Toggle Action handler (supervisor applies intervention)
  const handleToggleAction = (operatorName: string, actionId: string, actionTitle: string) => {
    const isNowApplied = !appliedActions[actionId];
    setAppliedActions((prev) => ({
      ...prev,
      [actionId]: isNowApplied,
    }));

    if (isNowApplied) {
      setFeedbackToast(`Intervenção ativada para ${operatorName}: "${actionTitle}".`);
    } else {
      setFeedbackToast(`Intervenção pausada para ${operatorName}.`);
    }

    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  const getTrajectoryBadge = (trajectory: TrajectoryType, delta: number, label: string) => {
    switch (trajectory) {
      case "rapid_improving":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-400 font-medium text-xs border border-emerald-500/30">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>{label}</span>
            <span className="font-mono font-bold text-[11px] text-emerald-300">+{delta.toFixed(1)}%</span>
          </span>
        );
      case "recovering":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-400 font-medium text-xs border border-sky-500/30">
            <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" />
            <span>{label}</span>
            <span className="font-mono font-bold text-[11px] text-sky-300">+{delta.toFixed(1)}%</span>
          </span>
        );
      case "stagnant":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-400 font-medium text-xs border border-amber-500/30">
            <Minus className="h-3.5 w-3.5 text-amber-400" />
            <span>{label}</span>
            <span className="font-mono font-bold text-[11px] text-amber-300">{delta.toFixed(1)}%</span>
          </span>
        );
      case "degrading":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-rose-400 font-medium text-xs border border-rose-500/30 animate-pulse">
            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
            <span>{label}</span>
            <span className="font-mono font-bold text-[11px] text-rose-300">{delta.toFixed(1)}%</span>
          </span>
        );
    }
  };

  const getRiskScorePill = (score: number, level: RiskLevel) => {
    switch (level) {
      case "critical":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-rose-500/15 px-2 py-0.5 border border-rose-500/30 text-rose-400 font-mono text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            Risco Crítico ({score}/100)
          </div>
        );
      case "warning":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-0.5 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Atenção ({score}/100)
          </div>
        );
      case "stable":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-sky-500/15 px-2 py-0.5 border border-sky-500/30 text-sky-400 font-mono text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Estável ({score}/100)
          </div>
        );
      case "stellar":
        return (
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Benchmark ({score}/100)
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="font-semibold text-foreground">{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-400 hover:text-emerald-300 text-xs cursor-pointer font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. Header Estratégico & Indicadores de Risco Operacional */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-muted/20 p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Raio-X de Risco Operacional & Evolução Histórica
              </h2>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-mono">
                IA Diagnostics
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Mapeamento de negociadores com histórico de SLA crítico ou baixa conversão, aferição de tendência semanal (30d vs 7d) e planos práticos de reversão.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-lg border border-border/80 bg-background/80 p-1 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setViewLayout("cards")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-colors cursor-pointer",
                  viewLayout === "cards"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards Detalhados
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("table")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-colors cursor-pointer",
                  viewLayout === "table"
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" />
                Matriz Resumida
              </button>
            </div>
          </div>
        </div>

        {/* 4 Strip KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Índice de Saúde da Equipe */}
          <div className="rounded-xl border border-border/60 bg-background/60 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Saúde Operacional</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {summary.overallTeamHealthScore}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
              <span className="text-xs font-semibold text-emerald-400 font-mono">
                +{summary.healthScoreDelta}%
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Média ponderada da equipe</p>
          </div>

          {/* Risco Crítico / Alerta Vermelho */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Risco Crítico</span>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-400">
                {summary.criticalOperatorsCount}
              </span>
              <span className="text-xs text-rose-400/80">operadores</span>
            </div>
            <p className="mt-0.5 text-[10px] text-rose-400/80">Requerem intervenção imediata</p>
          </div>

          {/* Em Forte Evolução / Revertendo */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Revertendo Risco</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {summary.recoveringOperatorsCount}
              </span>
              <span className="text-xs text-emerald-400/80">em evolução</span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Superando histórico crítico</p>
          </div>

          {/* Potencial Sob Risco (Gargalo Ativo) */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Sob Risco Ativo</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-400">
                {summary.potentialLossFromCriticalSla}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Em propostas com SLA expirado</p>
          </div>
        </div>
      </div>

      {/* 2. Barra de Filtros e Segmentação por Trajetória */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">
            Trajetória:
          </span>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
              trajectoryFilter === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
            )}
          >
            Todos ({operatorsList.length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("degrading")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1",
              trajectoryFilter === "degrading"
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
            )}
          >
            <TrendingDown className="h-3 w-3" />
            Críticos / Em Degradação ({operatorsList.filter((o) => o.trajectory === "degrading").length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("rapid_improving")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1",
              trajectoryFilter === "rapid_improving"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            )}
          >
            <TrendingUp className="h-3 w-3" />
            Forte Evolução ({operatorsList.filter((o) => o.trajectory === "rapid_improving").length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("recovering")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1",
              trajectoryFilter === "recovering"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
            )}
          >
            <ArrowUpRight className="h-3 w-3" />
            Em Recuperação ({operatorsList.filter((o) => o.trajectory === "recovering").length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("stagnant")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1",
              trajectoryFilter === "stagnant"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            )}
          >
            <Minus className="h-3 w-3" />
            Estagnado ({operatorsList.filter((o) => o.trajectory === "stagnant").length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Filtro por Carteira */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Carteira:</span>
            <select
              value={campaignFilter}
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todas as Carteiras</option>
              {campaigns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Busca por Operador */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar operador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* 3. VISÃO EM CARDS DETALHADOS (MASTERPIECE VIEW) */}
      {viewLayout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredOperators.map((op) => {
            const actionApplied = appliedActions[op.recommendedAction.id] ?? false;

            return (
              <Card
                key={op.operatorId}
                className={cn(
                  "border transition-all shadow-xs overflow-hidden",
                  op.riskLevel === "critical"
                    ? "border-rose-500/40 bg-card hover:border-rose-500/60"
                    : op.riskLevel === "warning"
                    ? "border-amber-500/30 bg-card hover:border-amber-500/50"
                    : "border-border/80 bg-card hover:border-border"
                )}
              >
                {/* Card Header */}
                <CardHeader className="pb-3 border-b border-border/60 bg-muted/10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                        {op.avatar && <AvatarImage src={op.avatar} />}
                        <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                          {op.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{op.name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono border-border/80">
                            {op.campaignName}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{op.role}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {getRiskScorePill(op.riskScore, op.riskLevel)}
                      {getTrajectoryBadge(op.trajectory, op.trajectoryDelta, op.trajectoryLabel)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Comparativo dos 3 Pilares Históricos (Passado 30d vs Recente 7d) */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                    {/* Pilar 1: SLA & Tempo de Resposta */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" />
                          Estouro SLA
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold font-mono text-foreground">
                          {op.sla.burstRateRecent}%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono line-through">
                          {op.sla.burstRatePast}%
                        </span>
                      </div>
                      <p className="text-[10px] font-medium font-mono text-muted-foreground">
                        TMR: <strong className="text-foreground">{op.sla.tmrRecentString}</strong>
                      </p>
                    </div>

                    {/* Pilar 2: Taxa de Acordos */}
                    <div className="space-y-1 border-x border-border/60 px-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <Target className="h-3 w-3 text-emerald-400" />
                          Acordos
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold font-mono text-emerald-400">
                          {op.agreements.conversionRateRecent}%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono line-through">
                          {op.agreements.conversionRatePast}%
                        </span>
                      </div>
                      <p className="text-[10px] font-mono font-medium text-emerald-400">
                        {op.agreements.deltaPercentagePoints > 0 ? "+" : ""}
                        {op.agreements.deltaPercentagePoints} p.p. ({op.agreements.totalAgreementsPeriod} acordos)
                      </p>
                    </div>

                    {/* Pilar 3: Abandono de Devedor */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-amber-400" />
                          Abandono
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold font-mono text-foreground">
                          {op.dropoff.rateRecent}%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono line-through">
                          {op.dropoff.ratePast}%
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate" title={op.dropoff.primaryDropoffStage}>
                        Gargalo: {op.dropoff.primaryDropoffStage}
                      </p>
                    </div>
                  </div>

                  {/* Sparkline Semanal das 4 Semanas */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Curva de Eficiência Operacional (Últimas 4 Semanas)</span>
                      <span className="font-mono text-primary font-bold">
                        Score Atual: {op.healthScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 h-12 bg-muted/15 rounded-lg p-1.5 items-end border border-border/40">
                      {op.trendCurve.map((point) => {
                        const heightPct = Math.max(15, Math.min(100, point.score));
                        const isImproving = point.score >= 50;

                        return (
                          <div key={point.weekLabel} className="flex flex-col items-center gap-1 h-full justify-end">
                            <div
                              className={cn(
                                "w-full rounded-xs transition-all relative group",
                                isImproving ? "bg-emerald-500/70 hover:bg-emerald-500" : "bg-rose-500/70 hover:bg-rose-500"
                              )}
                              style={{ height: `${heightPct}%` }}
                              title={`${point.weekLabel}: Score ${point.score} | Estouro SLA: ${point.slaBurstRate}% | Conv: ${point.conversionRate}%`}
                            />
                            <span className="text-[9px] font-mono text-muted-foreground">
                              {point.weekLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diagnóstico da Causa Raiz por IA (Root Cause Analysis) */}
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground">
                        Diagnóstico de Causa Raiz da IA
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground leading-snug">
                      "{op.aiDiagnostic.summary}"
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      <strong>Fato Relevante:</strong> {op.aiDiagnostic.keyFinding}
                    </p>
                  </div>

                  {/* Plano de Intervenção Recomendado com Botão de Ação */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-amber-400">
                          {op.recommendedAction.title}
                        </span>
                        <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 py-0">
                          {op.recommendedAction.badge}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {op.recommendedAction.description}
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-emerald-400 font-mono">
                        📈 {op.recommendedAction.expectedGain}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() =>
                        handleToggleAction(op.name, op.recommendedAction.id, op.recommendedAction.title)
                      }
                      className={cn(
                        "h-8 text-xs font-semibold shrink-0 gap-1.5 transition-all cursor-pointer",
                        actionApplied
                          ? "bg-emerald-500 hover:bg-emerald-600 text-black shadow-xs"
                          : "bg-amber-500 hover:bg-amber-600 text-black shadow-xs"
                      )}
                    >
                      {actionApplied ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Intervenção Ativa
                        </>
                      ) : (
                        <>
                          <Sliders className="h-3.5 w-3.5" />
                          Aplicar Ação
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* 4. VISÃO EM TABELA MATRIZ RESUMIDA */
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Matriz Comparativa de Risco & Histórico de Operadores ({filteredOperators.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativo direto de SLA passado (30d) vs recente (7d), evolução em acordos e intervenções recomendadas
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-6 pr-3">Operador</th>
                    <th className="px-3 py-2.5">Carteira</th>
                    <th className="px-3 py-2.5 text-center">Score de Risco</th>
                    <th className="px-3 py-2.5">Trajetória</th>
                    <th className="px-3 py-2.5">SLA (30d vs 7d)</th>
                    <th className="px-3 py-2.5">Acordos (30d vs 7d)</th>
                    <th className="px-3 py-2.5">Diagnóstico IA</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Ação Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOperators.map((op) => {
                    const actionApplied = appliedActions[op.recommendedAction.id] ?? false;

                    return (
                      <tr key={op.operatorId} className="hover:bg-muted/30 transition-colors">
                        {/* Operador */}
                        <td className="py-3 pl-6 pr-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              {op.avatar && <AvatarImage src={op.avatar} />}
                              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                                {op.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{op.name}</p>
                              <span className="text-[10px] text-muted-foreground">{op.role}</span>
                            </div>
                          </div>
                        </td>

                        {/* Carteira */}
                        <td className="px-3 py-3 font-mono font-medium text-foreground">
                          {op.campaignName}
                        </td>

                        {/* Score de Risco */}
                        <td className="px-3 py-3 text-center">
                          {getRiskScorePill(op.riskScore, op.riskLevel)}
                        </td>

                        {/* Trajetória */}
                        <td className="px-3 py-3">
                          {getTrajectoryBadge(op.trajectory, op.trajectoryDelta, op.trajectoryLabel)}
                        </td>

                        {/* SLA (30d vs 7d) */}
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs">
                            <span className="font-bold text-foreground">{op.sla.burstRateRecent}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1 line-through">
                              ({op.sla.burstRatePast}%)
                            </span>
                            <div className="text-[10px] text-muted-foreground">TMR: {op.sla.tmrRecentString}</div>
                          </div>
                        </td>

                        {/* Acordos (30d vs 7d) */}
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs">
                            <span className="font-bold text-emerald-400">{op.agreements.conversionRateRecent}%</span>
                            <span className="text-[10px] text-muted-foreground ml-1 line-through">
                              ({op.agreements.conversionRatePast}%)
                            </span>
                            <div className="text-[10px] text-emerald-400">
                              {op.agreements.totalAgreementsPeriod} acordos ({op.agreements.projectedMonthlyRecovery})
                            </div>
                          </div>
                        </td>

                        {/* Diagnóstico IA */}
                        <td className="px-3 py-3 max-w-[220px]">
                          <p className="text-[11px] text-muted-foreground truncate" title={op.aiDiagnostic.summary}>
                            {op.aiDiagnostic.summary}
                          </p>
                        </td>

                        {/* Ação Recomendada */}
                        <td className="py-3 pl-3 pr-6 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleToggleAction(op.name, op.recommendedAction.id, op.recommendedAction.title)
                            }
                            className={cn(
                              "h-7 text-xs font-semibold gap-1 cursor-pointer transition-colors",
                              actionApplied
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                            )}
                          >
                            {actionApplied ? (
                              <>
                                <Check className="h-3 w-3" />
                                Ativa
                              </>
                            ) : (
                              <>
                                <Sliders className="h-3 w-3" />
                                Aplicar
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
