"use client";

import { useState, useMemo } from "react";
import type {
  OperatorEvolutionProfile,
  OperatorEvolutionSummary,
  QualityAnalystProfile,
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
  Clock,
  Target,
  ArrowUpRight,
  Minus,
  Search,
  Check,
  LayoutGrid,
  List,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OperatorEvolutionTabProps {
  analyst?: QualityAnalystProfile;
  summary: OperatorEvolutionSummary;
  operators: OperatorEvolutionProfile[];
  loading?: boolean;
}

type TrajectoryFilter = "all" | TrajectoryType;
type ViewLayout = "cards" | "table";

export function OperatorEvolutionTab({
  summary,
  operators: initialOperators,
}: OperatorEvolutionTabProps) {
  const [operatorsList] = useState<OperatorEvolutionProfile[]>(initialOperators);
  const [trajectoryFilter, setTrajectoryFilter] = useState<TrajectoryFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewLayout, setViewLayout] = useState<ViewLayout>("cards");
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({
    "act-6": true,
    "act-8": true,
  });
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const campaigns = useMemo(() => {
    const set = new Set<string>();
    operatorsList.forEach((op) => set.add(op.campaignName));
    return Array.from(set).sort();
  }, [operatorsList]);

  const filteredOperators = useMemo(() => {
    return operatorsList.filter((op) => {
      if (trajectoryFilter !== "all" && op.trajectory !== trajectoryFilter) {
        return false;
      }
      if (campaignFilter !== "all" && op.campaignName !== campaignFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          op.name.toLowerCase().includes(q) ||
          op.campaignName.toLowerCase().includes(q) ||
          op.role.toLowerCase().includes(q) ||
          op.aiDiagnostic.summary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [operatorsList, trajectoryFilter, campaignFilter, search]);

  const handleToggleAction = (operatorName: string, actionId: string, actionTitle: string) => {
    const isNowApplied = !appliedActions[actionId];
    setAppliedActions((prev) => ({
      ...prev,
      [actionId]: isNowApplied,
    }));

    if (isNowApplied) {
      setFeedbackToast(`Ajuste registrado para ${operatorName}: ${actionTitle}`);
    } else {
      setFeedbackToast(`Ajuste removido para ${operatorName}.`);
    }

    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-500">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Crítico
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Atenção
          </span>
        );
      case "stable":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-500">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Estável
          </span>
        );
      case "stellar":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Destaque
          </span>
        );
    }
  };

  const getTrajectoryIndicator = (trajectory: TrajectoryType, delta: number) => {
    const formatted = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
    switch (trajectory) {
      case "rapid_improving":
      case "recovering":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-emerald-500">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {formatted}
          </span>
        );
      case "stagnant":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-muted-foreground">
            <Minus className="h-3 w-3" />
            {formatted}
          </span>
        );
      case "degrading":
        return (
          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-rose-500">
            <TrendingDown className="h-3.5 w-3.5" />
            {formatted}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {feedbackToast && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-xs text-foreground shadow-xs">
          <span>{feedbackToast}</span>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Resumo de Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Eficiência da Equipe</span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-foreground">
              {summary.overallTeamHealthScore}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
            <span className="text-xs font-medium text-emerald-500 font-mono">
              +{summary.healthScoreDelta}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Média ponderada (30d vs 7d)</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Em Evolução</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-foreground">
              {summary.recoveringOperatorsCount}
            </span>
            <span className="text-xs text-muted-foreground">operadores</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Reduzindo tempo de resposta</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Atenção Crítica</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-rose-500">
              {summary.criticalOperatorsCount}
            </span>
            <span className="text-xs text-muted-foreground">operadores</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Acima do limite de SLA</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Volume Retido (SLA)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-foreground">
              {summary.potentialLossFromCriticalSla}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Em negociações com atraso</p>
        </div>
      </div>

      {/* 2. Barra de Filtros e Alternador de Visão */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTrajectoryFilter("all")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              trajectoryFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Todos ({operatorsList.length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("degrading")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              trajectoryFilter === "degrading"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Críticos ({operatorsList.filter((o) => o.trajectory === "degrading").length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("rapid_improving")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              trajectoryFilter === "rapid_improving"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Em evolução ({operatorsList.filter((o) => o.trajectory === "rapid_improving").length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("recovering")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              trajectoryFilter === "recovering"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Em recuperação ({operatorsList.filter((o) => o.trajectory === "recovering").length})
          </button>

          <button
            type="button"
            onClick={() => setTrajectoryFilter("stagnant")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
              trajectoryFilter === "stagnant"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            Estáveis ({operatorsList.filter((o) => o.trajectory === "stagnant").length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            <option value="all">Todas as carteiras</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="relative w-44">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar operador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewLayout("cards")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors cursor-pointer",
                viewLayout === "cards"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visualização em cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("table")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors cursor-pointer",
                viewLayout === "table"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Visualização em tabela"
            >
              <List className="h-3.5 w-3.5" />
              Tabela
            </button>
          </div>
        </div>
      </div>

      {/* 3. VISÃO EM CARDS */}
      {viewLayout === "cards" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredOperators.map((op) => {
            const actionApplied = appliedActions[op.recommendedAction.id] ?? false;

            return (
              <Card
                key={op.operatorId}
                className="border border-border bg-card shadow-xs overflow-hidden"
              >
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        {op.avatar && <AvatarImage src={op.avatar} />}
                        <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                          {op.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {op.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                            {op.campaignName}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{op.role}</p>
                      </div>
                    </div>

                    {/* Único indicador limpo de status + tendência (sem empilhar badges repetidos) */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {getTrajectoryIndicator(op.trajectory, op.trajectoryDelta)}
                      {getRiskBadge(op.riskLevel)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Comparativo 30d vs 7d */}
                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-border/60 bg-muted/15 p-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        Estouro SLA
                      </span>
                      <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="text-sm font-semibold font-mono text-foreground">
                          {op.sla.burstRateRecent}%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono line-through">
                          {op.sla.burstRatePast}%
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        TMR: {op.sla.tmrRecentString}
                      </p>
                    </div>

                    <div className="space-y-0.5 border-x border-border/60 px-3">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        Conversão
                      </span>
                      <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="text-sm font-semibold font-mono text-emerald-500">
                          {op.agreements.conversionRateRecent}%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono line-through">
                          {op.agreements.conversionRatePast}%
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {op.agreements.totalAgreementsPeriod} acordos
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-muted-foreground" />
                        Abandono
                      </span>
                      <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="text-sm font-semibold font-mono text-foreground">
                          {op.dropoff.rateRecent}%
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono line-through">
                          {op.dropoff.ratePast}%
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate" title={op.dropoff.primaryDropoffStage}>
                        {op.dropoff.primaryDropoffStage}
                      </p>
                    </div>
                  </div>

                  {/* Evolução nas últimas 4 semanas */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Eficiência semanal (4 semanas)</span>
                      <span className="font-mono font-medium text-foreground">
                        {op.healthScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 h-10 bg-muted/20 rounded-md p-1.5 items-end border border-border/40">
                      {op.trendCurve.map((point) => {
                        const heightPct = Math.max(18, Math.min(100, point.score));
                        const isGood = point.score >= 50;

                        return (
                          <div key={point.weekLabel} className="flex flex-col items-center gap-1 h-full justify-end">
                            <div
                              className={cn(
                                "w-full rounded-xs transition-all",
                                isGood ? "bg-emerald-500/70" : "bg-rose-500/70"
                              )}
                              style={{ height: `${heightPct}%` }}
                              title={`${point.weekLabel}: ${point.score}/100`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diagnóstico e Ação Recomendada em bloco único e sóbrio */}
                  <div className="rounded-lg border border-border/70 bg-muted/15 p-3 space-y-2.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <strong className="font-medium text-foreground">Diagnóstico: </strong>
                      {op.aiDiagnostic.analystQuote}
                    </p>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {op.recommendedAction.title}
                        </p>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {op.recommendedAction.expectedGain}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant={actionApplied ? "secondary" : "outline"}
                        onClick={() =>
                          handleToggleAction(op.name, op.recommendedAction.id, op.recommendedAction.title)
                        }
                        className="h-7 text-xs font-medium shrink-0 gap-1.5 cursor-pointer"
                      >
                        {actionApplied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-500" />
                            Aplicado
                          </>
                        ) : (
                          "Aplicar"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* 4. VISÃO EM TABELA */
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold text-foreground">
              Histórico de Desempenho por Operador ({filteredOperators.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativo de SLA (30d vs 7d), taxa de conversão e ajustes operacionais
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-6 pr-3">Operador</th>
                    <th className="px-3 py-2.5">Carteira</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Tendência</th>
                    <th className="px-3 py-2.5">Estouro SLA (30d → 7d)</th>
                    <th className="px-3 py-2.5">Conversão (30d → 7d)</th>
                    <th className="px-3 py-2.5">Observação</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOperators.map((op) => {
                    const actionApplied = appliedActions[op.recommendedAction.id] ?? false;

                    return (
                      <tr key={op.operatorId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pl-6 pr-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              {op.avatar && <AvatarImage src={op.avatar} />}
                              <AvatarFallback className="text-[10px] bg-muted text-foreground font-semibold">
                                {op.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">{op.name}</p>
                              <span className="text-[10px] text-muted-foreground">{op.role}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {op.campaignName}
                        </td>

                        <td className="px-3 py-3">
                          {getRiskBadge(op.riskLevel)}
                        </td>

                        <td className="px-3 py-3">
                          {getTrajectoryIndicator(op.trajectory, op.trajectoryDelta)}
                        </td>

                        <td className="px-3 py-3 font-mono">
                          <span className="text-muted-foreground line-through mr-1.5">
                            {op.sla.burstRatePast}%
                          </span>
                          <span className="font-semibold text-foreground">{op.sla.burstRateRecent}%</span>
                          <div className="text-[10px] text-muted-foreground">TMR: {op.sla.tmrRecentString}</div>
                        </td>

                        <td className="px-3 py-3 font-mono">
                          <span className="text-muted-foreground line-through mr-1.5">
                            {op.agreements.conversionRatePast}%
                          </span>
                          <span className="font-semibold text-emerald-500">
                            {op.agreements.conversionRateRecent}%
                          </span>
                          <div className="text-[10px] text-muted-foreground">
                            {op.agreements.totalAgreementsPeriod} acordos
                          </div>
                        </td>

                        <td className="px-3 py-3 max-w-[240px]">
                          <p className="text-[11px] text-muted-foreground truncate" title={op.aiDiagnostic.summary}>
                            {op.aiDiagnostic.summary}
                          </p>
                        </td>

                        <td className="py-3 pl-3 pr-6 text-right">
                          <Button
                            size="sm"
                            variant={actionApplied ? "secondary" : "outline"}
                            onClick={() =>
                              handleToggleAction(op.name, op.recommendedAction.id, op.recommendedAction.title)
                            }
                            className="h-7 text-xs font-medium gap-1 cursor-pointer"
                          >
                            {actionApplied ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                Aplicado
                              </>
                            ) : (
                              "Aplicar"
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
