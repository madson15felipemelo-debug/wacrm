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
  MessageSquare,
  Bot,
  RefreshCw,
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

const DEFAULT_ANALYST: QualityAnalystProfile = {
  name: "Bekah",
  role: "Analista de Qualidade LUMA",
  badge: "LUMA Quality Intelligence",
  avatar: "/avatars/bekah.jpg",
  status: "Auditando atendimentos e fluxos de negociação em tempo real",
  auditedConversationsCount: 1240,
  scriptAdherencePercent: 78.5,
  generalInsight:
    "Olá time! Auditei as últimas 4 semanas de atendimento da nossa equipe de cobrança. Temos 2 pontos de atenção crítica onde devedores estão desistindo (especialmente nas carteiras PG Negócios e Condor), mas identifiquei uma recuperação fantástica do Thiago Alves (+28.4%) e o modelo benchmark da Roselene. Preparei diagnósticos detalhados e planos de ação para cada um abaixo.",
  criticalAlert:
    "Atenção especial com Gabriel Souza (PG Negócios): 64% dos clientes saem sem contraproposta. Recomendo travar a concorrência em 6 chats e aplicar script de contorno com urgência.",
};

export function OperatorEvolutionTab({
  analyst = DEFAULT_ANALYST,
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
  const [isAuditing, setIsAuditing] = useState(false);

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
          op.role.toLowerCase().includes(q) ||
          op.aiDiagnostic.analystQuote.toLowerCase().includes(q)
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
      setFeedbackToast(
        `Bekah confirmou: Intervenção ativada para ${operatorName} ("${actionTitle}"). Monitorando os próximos 20 atendimentos.`
      );
    } else {
      setFeedbackToast(`Intervenção pausada para ${operatorName}.`);
    }

    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
  };

  // Re-audit trigger by Bekah
  const handleRequestReaudit = async () => {
    setIsAuditing(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsAuditing(false);
    setFeedbackToast(
      "Bekah reauditou as últimas 150 mensagens com sucesso! Todos os índices de SLA e acordos estão sincronizados."
    );
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
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
      {/* Toast Feedback da Bekah */}
      {feedbackToast && (
        <div className="flex items-center justify-between rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-xs text-orange-400 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-6 w-6 ring-1 ring-orange-500/50">
              <AvatarImage src={analyst.avatar} alt="Bekah" />
              <AvatarFallback className="bg-orange-500 text-white font-bold text-[10px]">BK</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-foreground">{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-orange-400 hover:text-orange-300 text-xs cursor-pointer font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 1. CENTRAL DE QUALIDADE LUMA — SPOTLIGHT EXECUTIVO DA BEKAH */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 via-card/95 to-card p-5 shadow-lg">
        {/* Glow de fundo laranja suave */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Perfil da Bekah com Foto Oficial LUMA */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 ring-4 ring-orange-500/40 shadow-md">
                <AvatarImage src={analyst.avatar} alt="Bekah" className="object-cover" />
                <AvatarFallback className="text-lg bg-orange-500 text-white font-bold">BK</AvatarFallback>
              </Avatar>
              <span
                className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background ring-2 ring-emerald-500/40 animate-pulse"
                title="Online e auditando em tempo real"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight">{analyst.name}</h3>
                <Badge className="bg-orange-500/25 text-orange-400 border-orange-500/40 text-[10px] font-semibold">
                  {analyst.badge}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-orange-400/90">{analyst.role}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {analyst.status}
              </p>
            </div>
          </div>

          {/* Métricas de Auditoria & Botão de Análise */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Conversas Auditadas
              </span>
              <span className="text-base font-bold font-mono text-foreground">
                {analyst.auditedConversationsCount.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-center shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Aderência ao Script
              </span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {analyst.scriptAdherencePercent}%
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleRequestReaudit}
              disabled={isAuditing}
              className="h-10 text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white gap-2 shadow-xs cursor-pointer transition-all"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Auditando...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Pedir Parecer da Bekah
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Parecer Executivo Geral da Bekah para a Supervisão */}
        <div className="mt-4 rounded-xl border border-orange-500/30 bg-background/70 p-4 space-y-2 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">
              Parecer Executivo da Bekah para a Supervisão
            </span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed italic">
            "{analyst.generalInsight}"
          </p>
          <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <span className="text-rose-400 font-medium">
              <strong>Ponto de Intervenção Imediata da Bekah:</strong> {analyst.criticalAlert}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Strip de KPIs da Operação & Controles de Layout */}
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-muted/20 p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-foreground">
                Matriz de Risco Operacional & Evolução Histórica
              </h2>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-mono">
                Auditado por Bekah
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Mapeamento de negociadores com histórico de SLA crítico ou baixa conversão, aferição de tendência semanal (30d vs 7d) e intervenções recomendadas pela Bekah.
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
            <p className="mt-0.5 text-[10px] text-rose-400/80">Intervenção urgente sugerida</p>
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

      {/* 3. Barra de Filtros e Segmentação por Trajetória */}
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

      {/* 4. VISÃO EM CARDS DETALHADOS COM O PARECER DA BEKAH */}
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

                  {/* Curva de Tendência Semanal (Sparkline 4 Semanas) */}
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

                  {/* PARECER DA ANALISTA DE QUALIDADE BEKAH (AUDITORIA DE CONVERSAS) */}
                  <div className="rounded-xl border border-orange-500/35 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-2 ring-orange-500/40">
                          <AvatarImage src={analyst.avatar} alt="Bekah" />
                          <AvatarFallback className="text-[10px] bg-orange-500 text-white font-bold">BK</AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span>Parecer da Bekah</span>
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[9px] py-0 font-medium">
                              Auditoria LUMA
                            </Badge>
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">Feedback Qualitativo</span>
                    </div>

                    <div className="rounded-lg bg-background/70 border border-orange-500/20 p-2.5">
                      <p className="text-[11px] text-foreground italic leading-relaxed">
                        "{op.aiDiagnostic.analystQuote}"
                      </p>
                    </div>

                    <div className="text-[10px] text-muted-foreground pt-0.5 space-y-0.5">
                      <p><strong>Causa Raiz Técnica:</strong> {op.aiDiagnostic.keyFinding}</p>
                      <p className="text-orange-400/90 font-medium"><strong>Impacto Projetado:</strong> {op.aiDiagnostic.impactDescription}</p>
                    </div>
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
        /* 5. VISÃO EM TABELA MATRIZ RESUMIDA */
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Matriz Comparativa de Risco & Histórico de Operadores ({filteredOperators.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Auditado por Bekah • Comparativo direto de SLA passado (30d) vs recente (7d), evolução em acordos e intervenções recomendadas
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
                    <th className="px-3 py-2.5">Parecer da Bekah</th>
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

                        {/* Parecer da Bekah */}
                        <td className="px-3 py-3 max-w-[240px]">
                          <div className="flex items-start gap-1.5">
                            <Avatar className="h-4 w-4 shrink-0 mt-0.5">
                              <AvatarImage src={analyst.avatar} alt="Bekah" />
                              <AvatarFallback className="text-[8px] bg-orange-500 text-white">BK</AvatarFallback>
                            </Avatar>
                            <p className="text-[11px] text-muted-foreground truncate" title={op.aiDiagnostic.analystQuote}>
                              "{op.aiDiagnostic.analystQuote}"
                            </p>
                          </div>
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
