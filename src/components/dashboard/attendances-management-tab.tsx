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
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
  User,
  Bot,
  ChevronRight,
  ArrowRightLeft,
  ShieldCheck,
  Workflow,
  Check,
  X,
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
  "SLA excedido",
  "Operador em pausa",
  "Escalonamento / Supervisor",
  "Solicitação do cliente",
  "Balanceamento de fila",
  "Outro motivo",
];

/**
 * Normaliza o nome da carteira para comparação rígida anti-vazamento entre carteiras
 */
export function normalizeCampaignName(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
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
  const [attendancesList, setAttendancesList] = useState<AttendanceDetailRow[]>(initialAttendances);

  useEffect(() => {
    setAttendancesList(initialAttendances);
  }, [initialAttendances]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("waiting_desc");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [waitingFilter, setWaitingFilter] = useState<WaitingFilter>("all");

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<AttendanceDetailRow | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("queue");
  const [transferReason, setTransferReason] = useState<string>(TRANSFER_REASONS[0]);
  const [transferNote, setTransferNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const portfolios = useMemo(() => {
    const set = new Set<string>();
    attendancesList.forEach((a) => set.add(a.campaignName));
    return Array.from(set).sort();
  }, [attendancesList]);

  const processed = useMemo(() => {
    let result = [...attendancesList];

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

    if (slaFilter !== "all") {
      result = result.filter((a) => a.slaStatus === slaFilter);
    }

    if (portfolioFilter !== "all") {
      result = result.filter((a) => a.campaignName === portfolioFilter);
    }

    if (waitingFilter !== "all") {
      result = result.filter((a) => a.waitingTarget === waitingFilter);
    }

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

  const eligibleOperators = useMemo(() => {
    if (!transferItem || !operators || operators.length === 0) return [];
    return operators.filter((op) => {
      const sameCamp = isSameCampaign(op.campaignName, transferItem.campaignName);
      const isNotCurrent =
        op.name.trim().toLowerCase() !== (transferItem.operatorName ?? "").trim().toLowerCase();
      return sameCamp && isNotCurrent;
    });
  }, [transferItem, operators]);

  const handleOpenTransfer = (item: AttendanceDetailRow) => {
    setTransferItem(item);
    setTransferReason(TRANSFER_REASONS[0]);
    setTransferNote("");

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

  const handleConfirmTransfer = async () => {
    if (!transferItem) return;

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
        alert("Operador inválido para esta carteira.");
        return;
      }
      targetName = targetOp.name;
      targetInitials = targetOp.initials;
      targetAssignedType = "human";
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

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
          lastMessageSnippet: `Transferido para ${targetName} (${transferReason}${
            transferNote ? ` — ${transferNote}` : ""
          })`,
          lastMessageSender: "agent",
          lastMessageAt: "Agora",
        };
      })
    );

    setSuccessFeedback(
      `Atendimento de ${transferItem.clientName} transferido para ${targetName} (${transferItem.campaignName}).`
    );

    setIsSubmitting(false);
    setIsTransferOpen(false);
  };

  const getSlaBadge = (status: AttendanceDetailRow["slaStatus"], minutes: number) => {
    switch (status) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-0.5 text-rose-500 font-mono text-[11px] font-medium border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Crítico ({minutes}m)
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-amber-500 font-mono text-[11px] font-medium border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Alerta ({minutes}m)
          </span>
        );
      case "good":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-500 font-mono text-[11px] font-medium border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            No prazo ({minutes}m)
          </span>
        );
    }
  };

  const getStatusPill = (status: AttendanceDetailRow["negotiationStatus"], label: string) => {
    switch (status) {
      case "agreement_won":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 text-[10px] font-medium">
            {label}
          </Badge>
        );
      case "waiting_operator":
        return (
          <Badge className="bg-rose-500/15 text-rose-500 border border-rose-500/25 text-[10px] font-medium">
            {label}
          </Badge>
        );
      case "proposal_sent":
        return (
          <Badge variant="secondary" className="text-[10px] font-medium">
            {label}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border text-[10px] font-normal text-muted-foreground">
            {label}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-5">
      {successFeedback && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-xs text-foreground shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessFeedback(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Resumo de Atendimentos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Atendimentos</span>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">{stats.total}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ativos no momento</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">SLA Crítico</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-rose-500">{stats.critical}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Acima de 15 min</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pendente Equipe</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">{stats.waitingOperator}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Aguardando operador</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Pendente Cliente</span>
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">{stats.waitingClient}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Aguardando retorno</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Maior Espera</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">{stats.maxWaitMinutes}m</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Tempo máximo atual</p>
        </div>
      </div>

      {/* 2. Barra de Filtros */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="waiting_desc">Maior tempo de espera</option>
              <option value="sla_critical">SLA mais crítico</option>
              <option value="duration_desc">Maior duração total</option>
              <option value="client_asc">Cliente (A–Z)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Carteira:</span>
            <select
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todas</option>
              {portfolios.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">SLA:</span>
            <select
              value={slaFilter}
              onChange={(e) => setSlaFilter(e.target.value as SlaFilter)}
              className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todos</option>
              <option value="critical">Críticos (&gt;15m)</option>
              <option value="warning">Em alerta (5–15m)</option>
              <option value="good">No prazo (&lt;5m)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Pendente:</span>
            <select
              value={waitingFilter}
              onChange={(e) => setWaitingFilter(e.target.value as WaitingFilter)}
              className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <option value="all">Todos</option>
              <option value="operator">Operador</option>
              <option value="client">Cliente</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, CPF ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* 3. Tabela de Atendimentos */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Atendimentos em Curso ({processed.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhamento de SLA, responsável e etapa de negociação
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pl-6 pr-3">SLA</th>
                  <th className="px-3 py-2.5">Carteira</th>
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Responsável</th>
                  <th className="px-3 py-2.5 text-center">Espera</th>
                  <th className="px-3 py-2.5">Etapa</th>
                  <th className="px-3 py-2.5 text-center">Duração</th>
                  <th className="px-3 py-2.5">Última Mensagem</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Ações</th>
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
                      Nenhum atendimento encontrado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  processed.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="py-3 pl-6 pr-3">
                        {getSlaBadge(item.slaStatus, item.waitingMinutes)}
                      </td>

                      <td className="px-3 py-3">
                        <span className="font-medium text-foreground font-mono">{item.campaignName}</span>
                      </td>

                      <td className="px-3 py-3">
                        <div>
                          <p className="font-medium text-foreground">{item.clientName}</p>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                            <span>{item.cpf || "Sem CPF"}</span>
                            <span>·</span>
                            <span>{item.phone}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {item.assignedType === "human" ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              {item.operatorAvatar && <AvatarImage src={item.operatorAvatar} />}
                              <AvatarFallback className="text-[10px] bg-muted text-foreground font-semibold">
                                {item.operatorInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{item.operatorName}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px] flex items-center gap-1 w-fit">
                            <Bot className="h-3 w-3" />
                            {item.assignedType === "ai" ? "Automático" : item.operatorName || "Triagem"}
                          </Badge>
                        )}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "font-mono font-semibold text-xs",
                              item.slaStatus === "critical"
                                ? "text-rose-500"
                                : item.slaStatus === "warning"
                                ? "text-amber-500"
                                : "text-foreground"
                            )}
                          >
                            {item.waitingString}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.waitingTarget === "operator" ? "Operador" : "Cliente"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {getStatusPill(item.negotiationStatus, item.negotiationStatusLabel)}
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {item.totalDurationString}
                      </td>

                      <td className="px-3 py-3 max-w-[220px]">
                        <p className="text-[11px] text-muted-foreground truncate" title={item.lastMessageSnippet}>
                          <span className="font-medium text-foreground">
                            {item.lastMessageSender === "client" ? "Cliente: " : "Equipe: "}
                          </span>
                          {item.lastMessageSnippet}
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {item.lastMessageAt}
                        </span>
                      </td>

                      <td className="py-3 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTransfer(item)}
                            className="h-7 text-xs gap-1 font-medium cursor-pointer"
                            title={`Transferir dentro da carteira ${item.campaignName}`}
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Transferir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-primary gap-1 cursor-pointer"
                          >
                            Abrir
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

      {/* 4. MODAL DE TRANSFERÊNCIA */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border bg-card shadow-xl">
          {transferItem && (
            <div>
              <div className="p-5 pb-4 border-b border-border/60">
                <DialogTitle className="text-base font-semibold text-foreground">
                  Transferir Atendimento
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
                  <span>{transferItem.clientName}</span>
                  <span>·</span>
                  <span className="font-mono">{transferItem.cpf || "CPF não informado"}</span>
                  <span>·</span>
                  <span className="font-mono">{transferItem.campaignName}</span>
                </DialogDescription>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Transferência restrita aos operadores habilitados na carteira{" "}
                    <strong className="font-medium text-foreground">{transferItem.campaignName}</strong>.
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      Destino
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {eligibleOperators.length} operador(es) na carteira
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    <div
                      onClick={() => setSelectedTargetId("queue")}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors text-xs",
                        selectedTargetId === "queue"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Workflow className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium text-foreground">
                            Fila da carteira ({transferItem.campaignName})
                          </span>
                          <p className="text-[11px] text-muted-foreground">
                            Redistribuição automática para o próximo operador livre
                          </p>
                        </div>
                      </div>
                    </div>

                    {eligibleOperators.map((op) => (
                      <div
                        key={op.userId}
                        onClick={() => setSelectedTargetId(op.userId)}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors text-xs",
                          selectedTargetId === op.userId
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-muted text-foreground font-semibold">
                              {op.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium text-foreground">{op.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                              <span>{op.activeChats} ativos</span>
                              <span>·</span>
                              <span>{op.occupancyPercent}% ocupação</span>
                              <span>·</span>
                              <span>TMA {op.tmaString}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {op.conversionRate.toFixed(0)}% conv.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    Motivo
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {TRANSFER_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setTransferReason(r)}
                        className={cn(
                          "rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-left transition-colors cursor-pointer",
                          transferReason === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Observação interna (opcional)..."
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="h-8 text-xs bg-background mt-2"
                  />
                </div>
              </div>

              <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
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
                  className="text-xs h-8 gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Transferindo...</span>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Confirmar
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
