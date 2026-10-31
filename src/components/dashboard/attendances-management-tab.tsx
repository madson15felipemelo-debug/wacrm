"use client";

import { useState, useMemo } from "react";
import type { AttendanceDetailRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Search,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  ArrowUpDown,
  Building2,
  Users,
  User,
  Bot,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Flame,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendancesManagementTabProps {
  attendances: AttendanceDetailRow[];
  loading?: boolean;
}

type SortOption = "waiting_desc" | "sla_critical" | "duration_desc" | "client_asc";
type SlaFilter = "all" | "critical" | "warning" | "good";
type WaitingFilter = "all" | "operator" | "client";

export function AttendancesManagementTab({
  attendances,
  loading = false,
}: AttendancesManagementTabProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("waiting_desc");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [waitingFilter, setWaitingFilter] = useState<WaitingFilter>("all");

  // Distinct portfolios from attendances
  const portfolios = useMemo(() => {
    const set = new Set<string>();
    attendances.forEach((a) => set.add(a.campaignName));
    return Array.from(set).sort();
  }, [attendances]);

  // Filter and Sort Attendances
  const processed = useMemo(() => {
    let result = [...attendances];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.clientName.toLowerCase().includes(q) ||
          (a.cpf && a.cpf.toLowerCase().includes(q)) ||
          a.phone.includes(q) ||
          (a.operatorName && a.operatorName.toLowerCase().includes(q)) ||
          a.campaignName.toLowerCase().includes(q)
      );
    }

    // SLA filter
    if (slaFilter !== "all") {
      result = result.filter((a) => a.slaStatus === slaFilter);
    }

    // Portfolio / Carteira filter
    if (portfolioFilter !== "all") {
      result = result.filter((a) => a.campaignName === portfolioFilter);
    }

    // Waiting Target filter (Operador devendo resposta vs Cliente)
    if (waitingFilter !== "all") {
      result = result.filter((a) => a.waitingTarget === waitingFilter);
    }

    // Sorting logic
    result.sort((a, b) => {
      switch (sortBy) {
        case "waiting_desc":
          // Quem está há mais tempo aguardando primeiro
          return b.waitingMinutes - a.waitingMinutes;
        case "sla_critical": {
          const score = (s: AttendanceDetailRow["slaStatus"]) =>
            s === "critical" ? 3 : s === "warning" ? 2 : 1;
          const diff = score(b.slaStatus) - score(a.slaStatus);
          return diff !== 0 ? diff : b.waitingMinutes - a.waitingMinutes;
        }
        case "duration_desc":
          return b.totalDurationMinutes - a.totalDurationMinutes;
        case "client_asc":
          return a.clientName.localeCompare(b.clientName);
        default:
          return 0;
      }
    });

    return result;
  }, [attendances, search, sortBy, slaFilter, portfolioFilter, waitingFilter]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    const total = attendances.length;
    const critical = attendances.filter((a) => a.slaStatus === "critical").length;
    const waitingOperator = attendances.filter((a) => a.waitingTarget === "operator").length;
    const waitingClient = attendances.filter((a) => a.waitingTarget === "client").length;
    const maxWaitMinutes = Math.max(...attendances.map((a) => a.waitingMinutes), 0);

    return {
      total,
      critical,
      waitingOperator,
      waitingClient,
      maxWaitMinutes,
    };
  }, [attendances]);

  const getSlaBadge = (status: AttendanceDetailRow["slaStatus"], minutes: number) => {
    switch (status) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-500 font-mono text-[11px] font-semibold border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            Crítico ({minutes}m)
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-500 font-mono text-[11px] font-semibold border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Alerta ({minutes}m)
          </span>
        );
      case "good":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-mono text-[11px] font-semibold border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Normal ({minutes}m)
          </span>
        );
    }
  };

  const getStatusPill = (status: AttendanceDetailRow["negotiationStatus"], label: string) => {
    switch (status) {
      case "agreement_won":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
            {label}
          </Badge>
        );
      case "waiting_operator":
        return (
          <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
            {label}
          </Badge>
        );
      case "proposal_sent":
        return (
          <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-semibold">
            {label}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border/80 text-[10px] font-medium text-foreground">
            {label}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Top Metric Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {/* Total Atendimentos */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Atendimentos</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">{stats.total}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Em acompanhamento</p>
        </div>

        {/* SLA Crítico */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">SLA Estourado</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-rose-400">{stats.critical}</p>
          <p className="mt-0.5 text-[10px] text-rose-400/80">&gt; 15m sem resposta</p>
        </div>

        {/* Aguardando Operador */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Aguardando Operador</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-amber-400">{stats.waitingOperator}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Fila de resposta da equipe</p>
        </div>

        {/* Aguardando Cliente */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">Aguardando Cliente</span>
            <User className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-sky-400">{stats.waitingClient}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Proposta sob análise</p>
        </div>

        {/* Maior Tempo de Espera */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">Maior Espera</span>
            <Flame className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-purple-400">{stats.maxWaitMinutes}m</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Gargalo máximo atual</p>
        </div>
      </div>

      {/* 2. Barra de Classificação e Filtros Específicos do Atendimento */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-3.5 backdrop-blur-xs shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Classificar Por (Sort) */}
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
              Classificar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="waiting_desc">⚡ Mais tempo aguardando</option>
              <option value="sla_critical">🚨 SLA Mais Crítico primeiro</option>
              <option value="duration_desc">⏱️ Maior Duração Total</option>
              <option value="client_asc">🔤 Nome do Cliente (A-Z)</option>
            </select>
          </div>

          {/* Filtro por Carteira / Campanha */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Carteira:</span>
            <select
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todas as Carteiras</option>
              {portfolios.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por SLA */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">SLA:</span>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value as SlaFilter)}
              className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todos os SLAs</option>
              <option value="critical">🔴 Apenas Críticos (&gt;15m)</option>
              <option value="warning">🟡 Apenas Alertas (5-15m)</option>
              <option value="good">🟢 Saudáveis (&lt;5m)</option>
            </select>
          </div>

          {/* Filtro por Quem Aguarda */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Aguardando:</span>
            <select
              value={waitingFilter}
              onChange={(e) => setWaitingFilter(e.target.value as WaitingFilter)}
              className="h-8 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todos</option>
              <option value="operator">👤 Aguardando Operador</option>
              <option value="client">📱 Aguardando Cliente</option>
            </select>
          </div>
        </div>

        {/* Busca por Cliente / CPF / Telefone */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, CPF ou tel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* 3. Tabela Estruturada de Atendimentos */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Central de Gestão por Atendimento ({processed.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Controle individual de conversas por SLA, tempo de espera, carteira e responsável
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pl-6 pr-3">SLA Status</th>
                  <th className="px-3 py-2.5">Carteira / Campanha</th>
                  <th className="px-3 py-2.5">Cliente (Devedor)</th>
                  <th className="px-3 py-2.5">Responsável Atual</th>
                  <th className="px-3 py-2.5 text-center">Aguardando Há</th>
                  <th className="px-3 py-2.5">Status da Negociação</th>
                  <th className="px-3 py-2.5 text-center">Duração Total</th>
                  <th className="px-3 py-2.5">Última Mensagem</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                      Carregando atendimentos...
                    </td>
                  </tr>
                ) : processed.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum atendimento corresponde aos filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  processed.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        item.slaStatus === "critical" && "bg-rose-500/[0.02]"
                      )}
                    >
                      {/* SLA */}
                      <td className="py-3 pl-6 pr-3">
                        {getSlaBadge(item.slaStatus, item.waitingMinutes)}
                      </td>

                      {/* Carteira / Campanha */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-foreground font-mono">{item.campaignName}</span>
                      </td>

                      {/* Cliente + CPF + Telefone */}
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.clientName}</p>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            <span>{item.cpf || "CPF na triagem"}</span>
                            <span>•</span>
                            <span>{item.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Responsável (Operador / Robô / IA) */}
                      <td className="px-3 py-3">
                        {item.assignedType === "human" ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {item.operatorAvatar && <AvatarImage src={item.operatorAvatar} />}
                              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                                {item.operatorInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{item.operatorName}</span>
                          </div>
                        ) : item.assignedType === "ai" ? (
                          <Badge variant="outline" className="border-purple-500/30 text-purple-400 font-mono text-[10px] flex items-center gap-1 w-fit">
                            <Sparkles className="h-3 w-3" />
                            IA Autônoma
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-sky-500/30 text-sky-400 font-mono text-[10px] flex items-center gap-1 w-fit">
                            <Bot className="h-3 w-3" />
                            Robô Triagem
                          </Badge>
                        )}
                      </td>

                      {/* Aguardando Há (Quem deve a próxima resposta?) */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "font-mono font-bold text-xs",
                              item.slaStatus === "critical"
                                ? "text-rose-500"
                                : item.slaStatus === "warning"
                                ? "text-amber-500"
                                : "text-emerald-500"
                            )}
                          >
                            {item.waitingString}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {item.waitingTarget === "operator" ? "👤 Operador" : "📱 Cliente"}
                          </span>
                        </div>
                      </td>

                      {/* Status da Negociação */}
                      <td className="px-3 py-3">
                        {getStatusPill(item.negotiationStatus, item.negotiationStatusLabel)}
                      </td>

                      {/* Duração Total */}
                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {item.totalDurationString}
                      </td>

                      {/* Última Mensagem */}
                      <td className="px-3 py-3 max-w-[220px]">
                        <p className="text-[11px] text-muted-foreground truncate" title={item.lastMessageSnippet}>
                          <span className="font-semibold text-foreground">
                            {item.lastMessageSender === "client" ? "Devedor: " : "Atendente: "}
                          </span>
                          {item.lastMessageSnippet}
                        </p>
                        <span className="text-[9px] font-mono text-muted-foreground">
                          às {item.lastMessageAt}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 pl-3 pr-6 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1"
                        >
                          Abrir Chat
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
