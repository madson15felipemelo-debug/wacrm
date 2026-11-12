"use client";

import { useState } from "react";
import type {
  RealtimeCounters,
  LiveQueueItem,
  LiveHumanAttendance,
} from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Clock,
  MessageSquare,
  Bot,
  UserCheck,
  Send,
  UserX,
  Coffee,
  CheckCircle,
  Workflow,
} from "lucide-react";

interface LiveMonitorTabProps {
  realtime: RealtimeCounters;
  liveQueue: LiveQueueItem[];
  liveHuman: LiveHumanAttendance[];
  loading?: boolean;
}

export function LiveMonitorTab({
  realtime,
  liveQueue,
  liveHuman,
}: LiveMonitorTabProps) {
  const [activeSubView, setActiveSubView] = useState<"queue" | "human">("queue");

  const getSlaBadge = (status: "good" | "warning" | "critical") => {
    switch (status) {
      case "good":
        return (
          <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            No prazo
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1.5 text-amber-500 font-medium text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Alerta
          </span>
        );
      case "critical":
        return (
          <span className="inline-flex items-center gap-1.5 text-rose-500 font-medium text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Crítico
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Contadores em Tempo Real */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Online</span>
            <Users className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-foreground">{realtime.operatorsOnline}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Logados</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Disponíveis</span>
            <CheckCircle className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-foreground">{realtime.operatorsAvailable}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Com vaga</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Em Pausa</span>
            <Coffee className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-foreground">{realtime.operatorsInBreak}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Intervalo</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Offline</span>
            <UserX className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-muted-foreground">{realtime.operatorsDisconnected}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Desconectados</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Em Espera</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-2 text-xl font-semibold font-mono text-foreground">{realtime.waitingResponses}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Sem resposta</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">TMR Equipe</span>
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-lg font-semibold font-mono text-foreground">{realtime.tmrOperator}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Resp. operador</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">TMR Cliente</span>
            <Send className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-lg font-semibold font-mono text-foreground">{realtime.tmrClient}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Resp. cliente</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">TMF</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-lg font-semibold font-mono text-foreground">{realtime.tmf}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Finalização</p>
        </div>
      </div>

      {/* 2. Volume por Canal Atual */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Workflow className="h-4 w-4 text-sky-500" />
              Triagem
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-foreground">{realtime.inRobot}</span>
            <span className="text-[11px] text-muted-foreground">Coleta de CPF</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-amber-500" />
              Fila de Espera
            </span>
            <button
              type="button"
              onClick={() => setActiveSubView("queue")}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              Ver fila
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-foreground">{realtime.inQueue}</span>
            <span className="text-[11px] text-muted-foreground">Aguardando atribuição</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              Atendimento Humano
            </span>
            <button
              type="button"
              onClick={() => setActiveSubView("human")}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              Ver ativos
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-foreground">{realtime.inHuman}</span>
            <span className="text-[11px] text-muted-foreground">Em negociação</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Bot className="h-4 w-4 text-primary" />
              Atendimento Automático
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold font-mono text-foreground">{realtime.inAi}</span>
            <span className="text-[11px] text-muted-foreground">Sem transbordo</span>
          </div>
        </div>
      </div>

      {/* 3. Tabelas de Fila e Atendimento */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Acompanhamento de Fila e Operadores
              </CardTitle>
              <CardDescription className="text-xs">
                Conversas aguardando distribuição e negociações em andamento
              </CardDescription>
            </div>

            <div className="inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveSubView("queue")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  activeSubView === "queue"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fila de Espera ({liveQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView("human")}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  activeSubView === "human"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Atendimento Humano ({liveHuman.length})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeSubView === "queue" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-6 pr-3">SLA</th>
                    <th className="px-3 py-2.5">Carteira</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5">Telefone</th>
                    <th className="px-3 py-2.5 text-center">Espera</th>
                    <th className="px-3 py-2.5 text-center">Etapa</th>
                    <th className="px-3 py-2.5 text-center">Prioridade</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {liveQueue.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/30">
                      <td className="py-3 pl-6 pr-3">{getSlaBadge(item.slaStatus)}</td>

                      <td className="px-3 py-3 font-medium text-foreground">
                        {item.campaignName}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{item.clientName}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({item.cpf || "Sem CPF"})
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3 font-mono text-muted-foreground">{item.contactPhone}</td>

                      <td className="px-3 py-3 text-center font-mono font-medium text-foreground">
                        {item.waitingTime}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                          {item.currentChannel === "queue"
                            ? "Fila"
                            : item.currentChannel === "robot"
                            ? "Triagem"
                            : "Automático"}
                        </Badge>
                      </td>

                      <td className="px-3 py-3 text-center">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {item.priority}
                        </Badge>
                      </td>

                      <td className="py-3 pl-3 pr-6 text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Assumir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-6 pr-3">SLA</th>
                    <th className="px-3 py-2.5">Carteira</th>
                    <th className="px-3 py-2.5">Operador</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5 text-center">Início</th>
                    <th className="px-3 py-2.5 text-center">Última Interação</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {liveHuman.map((att) => (
                    <tr key={att.id} className="transition-colors hover:bg-muted/30">
                      <td className="py-3 pl-6 pr-3">{getSlaBadge(att.slaStatus)}</td>

                      <td className="px-3 py-3 font-medium text-foreground">{att.campaignName}</td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {att.agentAvatar && <AvatarImage src={att.agentAvatar} />}
                            <AvatarFallback className="text-[10px] bg-muted text-foreground font-semibold">
                              {att.agentInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{att.agentName}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3 font-medium text-foreground">
                        {att.clientName}
                        <p className="text-[10px] font-mono text-muted-foreground">{att.contactPhone}</p>
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {att.startedAt}
                      </td>

                      <td className="px-3 py-3 text-center">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {att.lastInteraction === "client" ? "Cliente " : "Operador "}
                          ({att.lastMessageTime})
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                          {att.statusTabulation}
                        </Badge>
                      </td>

                      <td className="py-3 pl-3 pr-6 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary">
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
