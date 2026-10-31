"use client";

import { useState, useMemo, useEffect } from "react";
import type { AttendanceDetailRow, OperatorProductivityRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ArrowRightLeft,
  ShieldCheck,
  Workflow,
  Check,
  X,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendancesManagementTabProps {
  attendances: AttendanceDetailRow[];
  operators?: OperatorProductivityRow[];
  loading?: boolean;
}

type SortOption = "waiting_desc" | "sla_critical" | "duration_desc" | "client_asc";
type SlaFilter = "all" | "critical" | "warning" | "good";
type WaitingFilter = "all" | "operator" | "client";

const TRANSFER_REASONS = [
  "SLA Estourado / Fila Travada",
  "Operador em Pausa / Almoço",
  "Negociação Complexa / Supervisor",
  "Solicitação do Devedor",
  "Redistribuição de Carteira",
  "Outro Motivo",
];

/**
 * Normaliza o nome da carteira para comparação rígida anti-vazamento entre carteiras
 */
export function normalizeCampaignName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, "") // apenas alfanumérico
    .trim();
}

/**
 * Trava de segurança anti-erro: verifica se operador pertence estritamente à mesma campanha
 */
export function isSameCampaign(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const cleanA = normalizeCampaignName(a);
  const cleanB = normalizeCampaignName(b);
  if (cleanA === cleanB) return true;

  // Lida com variações de prefixo ("Assessoria Berlanda" vs "Berlanda", etc.)
  const stripPrefix = (s: string) => s.replace(/^(assessoria|campanha|cobranca)/, "");
  const strippedA = stripPrefix(cleanA);
  const strippedB = stripPrefix(cleanB);
  return strippedA === strippedB && strippedA.length > 2;
}

export function AttendancesManagementTab({
  attendances: initialAttendances,
  operators = [],
  loading = false,
}: AttendancesManagementTabProps) {
  // Local state for attendances to support immediate reactive transfer
  const [attendancesList, setAttendancesList] = useState<AttendanceDetailRow[]>(initialAttendances);

  useEffect(() => {
    setAttendancesList(initialAttendances);
  }, [initialAttendances]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("waiting_desc");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [waitingFilter, setWaitingFilter] = useState<WaitingFilter>("all");

  // Transfer Modal State
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<AttendanceDetailRow | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("queue");
  const [transferReason, setTransferReason] = useState<string>(TRANSFER_REASONS[0]);
  const [transferNote, setTransferNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Distinct portfolios from attendances
  const portfolios = useMemo(() => {
    const set = new Set<string>();
    attendancesList.forEach((a) => set.add(a.campaignName));
    return Array.from(set).sort();
  }, [attendancesList]);

  // Filter and Sort Attendances
  const processed = useMemo(() => {
    let result = [...attendancesList];

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
  }, [attendancesList, search, sortBy, slaFilter, portfolioFilter, waitingFilter]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    const total = attendancesList.length;
    const critical = attendancesList.filter((a) => a.slaStatus === "critical").length;
    const waitingOperator = attendancesList.filter((a) => a.waitingTarget === "operator").length;
    const waitingClient = attendancesList.filter((a) => a.waitingTarget === "client").length;
    const maxWaitMinutes = Math.max(...attendancesList.map((a) => a.waitingMinutes), 0);

    return {
      total,
      critical,
      waitingOperator,
      waitingClient,
      maxWaitMinutes,
    };
  }, [attendancesList]);

  // Strictly filter eligible operators: SAME CAMPAIGN ONLY + NOT CURRENT OPERATOR
  const eligibleOperators = useMemo(() => {
    if (!transferItem || !operators || operators.length === 0) return [];
    return operators.filter((op) => {
      const sameCamp = isSameCampaign(op.campaignName, transferItem.campaignName);
      const isNotCurrent =
        op.name.trim().toLowerCase() !== (transferItem.operatorName ?? "").trim().toLowerCase();
      return sameCamp && isNotCurrent;
    });
  }, [transferItem, operators]);

  // Open Transfer Dialog handler
  const handleOpenTransfer = (item: AttendanceDetailRow) => {
    setTransferItem(item);
    setTransferReason(TRANSFER_REASONS[0]);
    setTransferNote("");

    // Look for eligible peers in the exact same campaign
    const peers = operators.filter(
      (op) =>
        isSameCampaign(op.campaignName, item.campaignName) &&
        op.name.trim().toLowerCase() !== (item.operatorName ?? "").trim().toLowerCase()
    );

    if (peers.length > 0) {
      setSelectedTargetId(peers[0].userId);
    } else {
      setSelectedTargetId("queue");
    }

    setIsTransferOpen(true);
  };

  // Confirm Transfer Action
  const handleConfirmTransfer = async () => {
    if (!transferItem) return;

    // Strict Security Check: Verify that selected operator belongs to the exact same campaign
    let targetName = "";
    let targetInitials = "OP";
    let targetAssignedType: AttendanceDetailRow["assignedType"] = "human";

    if (selectedTargetId === "queue") {
      targetName = `Fila ${transferItem.campaignName}`;
      targetInitials = "FQ";
      targetAssignedType = "robot";
    } else {
      const targetOp = eligibleOperators.find((o) => o.userId === selectedTargetId);
      if (!targetOp || !isSameCampaign(targetOp.campaignName, transferItem.campaignName)) {
        alert("Erro de Segurança: O operador de destino não pertence a esta carteira.");
        return;
      }
      targetName = targetOp.name;
      targetInitials = targetOp.initials;
      targetAssignedType = "human";
    }

    setIsSubmitting(true);

    // Simulate transfer API call
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Update local attendance row immediately
    setAttendancesList((prev) =>
      prev.map((att) => {
        if (att.id !== transferItem.id) return att;
        return {
          ...att,
          operatorName: targetName,
          operatorInitials: targetInitials,
          assignedType: targetAssignedType,
          waitingMinutes: 0,
          waitingString: "agora",
          slaStatus: "good",
          waitingTarget: "operator",
          lastMessageSnippet: `[Transferência de Atendimento] ${targetName} assumiu a conversa. Motivo: ${transferReason}${
            transferNote ? ` (${transferNote})` : ""
          }`,
          lastMessageSender: "agent",
          lastMessageAt: "Agora",
        };
      })
    );

    setSuccessFeedback(
      `Atendimento de ${transferItem.clientName} transferido com sucesso para ${targetName} na carteira ${transferItem.campaignName}.`
    );

    setIsSubmitting(false);
    setIsTransferOpen(false);
  };

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
      {/* Success Notification Banner */}
      {successFeedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="font-medium text-foreground">{successFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessFeedback(null)}
            className="rounded-md p-1 hover:bg-emerald-500/20 transition-colors text-emerald-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
                            {item.operatorName || "Robô Triagem"}
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

                      {/* Ações: Transferir + Abrir Chat */}
                      <td className="py-3 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTransfer(item)}
                            className="h-7 text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 gap-1 font-medium transition-colors cursor-pointer"
                            title={`Transferir atendimento dentro da carteira ${item.campaignName}`}
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Transferir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                          >
                            Abrir Chat
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. MODAL SEGURO DE TRANSFERÊNCIA DE ATENDIMENTO COM TRAVA DE CARTEIRA */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/80 bg-card shadow-2xl">
          {transferItem && (
            <div>
              {/* Header */}
              <div className="p-5 pb-4 border-b border-border/60">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                    <ArrowRightLeft className="h-4 w-4" />
                  </div>
                  <span>Transferir Atendimento</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                  <span>Cliente: <strong className="text-foreground">{transferItem.clientName}</strong></span>
                  <span>•</span>
                  <span>CPF: <span className="font-mono text-foreground">{transferItem.cpf || "Não informado"}</span></span>
                  <span>•</span>
                  <span>Tel: <span className="font-mono text-foreground">{transferItem.phone}</span></span>
                </DialogDescription>
              </div>

              {/* Trava de Segurança Anti-Vazamento de Carteira */}
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          Trava de Carteira Ativa
                        </span>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono text-[10px] py-0">
                          {transferItem.campaignName}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        Regra de isolamento estrito: apenas negociadores credenciados exclusivamente na carteira{" "}
                        <strong className="text-foreground font-semibold">{transferItem.campaignName}</strong> estão autorizados a receber esta conversa. O envio para operadores de outras carteiras está bloqueado.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Situação Atual */}
                <div className="grid grid-cols-2 gap-2 text-xs rounded-lg border border-border/60 bg-muted/20 p-2.5">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                      Responsável Atual:
                    </span>
                    <span className="font-medium text-foreground">
                      {transferItem.operatorName || "Robô / Triagem"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                      Tempo de Espera:
                    </span>
                    <span className="font-mono font-semibold text-amber-400">
                      {transferItem.waitingString}
                    </span>
                  </div>
                </div>

                {/* Lista de Destinos Permitidos (Apenas da Mesma Carteira) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Destino da Transferência ({transferItem.campaignName})
                    </label>
                    <span className="text-[10px] text-muted-foreground">
                      {eligibleOperators.length} negociador(es) apto(s)
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {/* Opção 1: Fila Geral da Carteira */}
                    <div
                      onClick={() => setSelectedTargetId("queue")}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all text-xs",
                        selectedTargetId === "queue"
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                            selectedTargetId === "queue" ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                        >
                          {selectedTargetId === "queue" && (
                            <div className="h-1.5 w-1.5 rounded-full bg-background" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Workflow className="h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold text-foreground">
                              Fila Geral da Carteira ({transferItem.campaignName})
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono border-primary/30 text-primary py-0"
                            >
                              Auto Distribuição
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Retorna para a fila de espera da campanha. O motor distribuirá por round-robin ou menor carga.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Opção 2..N: Negociadores Habilitados da Mesma Carteira */}
                    {eligibleOperators.map((op) => (
                      <div
                        key={op.userId}
                        onClick={() => setSelectedTargetId(op.userId)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all text-xs",
                          selectedTargetId === op.userId
                            ? "border-amber-500 bg-amber-500/10 shadow-xs"
                            : "border-border/60 bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                              selectedTargetId === op.userId ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
                            )}
                          >
                            {selectedTargetId === op.userId && (
                              <div className="h-1.5 w-1.5 rounded-full bg-background" />
                            )}
                          </div>
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                              {op.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{op.name}</span>
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Online
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 font-mono">
                              <span>{op.activeChats} chats ativos</span>
                              <span>•</span>
                              <span>{op.occupancyPercent}% ocupação</span>
                              <span>•</span>
                              <span>TMA {op.tmaString}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                          {op.conversionRate.toFixed(0)}% conversão
                        </Badge>
                      </div>
                    ))}

                    {eligibleOperators.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border/80 p-3 text-center text-xs text-muted-foreground">
                        Nenhum outro operador humano da carteira <strong>{transferItem.campaignName}</strong> está disponível no momento. Selecione a <em>Fila Geral da Carteira</em> acima.
                      </div>
                    )}
                  </div>
                </div>

                {/* Motivo da Transferência */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Motivo da Transferência
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {TRANSFER_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTransferReason(r)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-[11px] font-medium text-left transition-colors cursor-pointer",
                          transferReason === r
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Observação interna para o novo operador (opcional)..."
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="h-8 text-xs bg-background mt-2"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTransferOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmTransfer}
                  disabled={!selectedTargetId || isSubmitting}
                  className="text-xs h-8 bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Transferindo...</span>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Confirmar Transferência
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
