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
  Sparkles,
  UserCheck,
  Radio,
  ArrowRight,
  Send,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  UserX,
  Coffee,
  CheckCircle,
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
  loading = false,
}: LiveMonitorTabProps) {
  const [activeSubView, setActiveSubView] = useState<"queue" | "human">("queue");

  const getSlaBadge = (status: "good" | "warning" | "critical") => {
    switch (status) {
      case "good":
        return (
          <span className="flex items-center gap-1.5 text-emerald-500 font-medium text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Normal (&lt;5m)
          </span>
        );
      case "warning":
        return (
          <span className="flex items-center gap-1.5 text-amber-500 font-medium text-[11px]">
            <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
            Alerta (&gt;5m)
          </span>
        );
      case "critical":
        return (
          <span className="flex items-center gap-1.5 text-rose-500 font-medium text-[11px]">
            <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-ping" />
            Crítico (&gt;15m)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Grid Superior: Operadores & Tempos de Resposta em Tempo Real (Foto 1) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {/* Operadores Online */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Online</span>
            <Users className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">{realtime.operatorsOnline}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Operadores logados</p>
        </div>

        {/* Disponíveis */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Disponíveis</span>
            <CheckCircle className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-sky-400">{realtime.operatorsAvailable}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Prontos p/ receber</p>
        </div>

        {/* Em Pausa */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Em Pausa</span>
            <Coffee className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-amber-400">{realtime.operatorsInBreak}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Almoço / intervalo</p>
        </div>

        {/* Desconectados */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Offline</span>
            <UserX className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-muted-foreground">{realtime.operatorsDisconnected}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Desconectados</p>
        </div>

        {/* Aguardando Respostas */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Aguardando</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-amber-400">{realtime.waitingResponses}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Clientes na espera</p>
        </div>

        {/* TMR Operador */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">TMR Operador</span>
            <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-foreground">{realtime.tmrOperator}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Tempo resp. equipe</p>
        </div>

        {/* TMR Cliente */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">TMR Cliente</span>
            <Send className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-foreground">{realtime.tmrClient}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Tempo resp. devedor</p>
        </div>

        {/* TMF */}
        <div className="rounded-xl border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">TMF</span>
            <Clock className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-foreground">{realtime.tmf}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Finalização média</p>
        </div>
      </div>

      {/* 2. Onde está o atendimento agora? (Canais Ao Vivo - Foto 2) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* No Robô */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 uppercase tracking-wider">
              <Bot className="h-4 w-4" />
              Em Triagem (Robô)
            </span>
            <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-foreground">{realtime.inRobot}</span>
            <Badge variant="outline" className="border-sky-500/30 text-[10px] text-sky-400 font-mono">
              Coletando CPF
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Navegando no fluxo automático antes do transbordo
          </p>
        </div>

        {/* Em Fila / Não Distribuído */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
              <Clock className="h-4 w-4" />
              Em Fila (Não Distribuído)
            </span>
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-foreground">{realtime.inQueue}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSubView("queue")}
              className="h-6 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/20 px-2"
            >
              Ver Fila
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            CPF já validado aguardando operador livre
          </p>
        </div>

        {/* Em Atendimento Humano */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <UserCheck className="h-4 w-4" />
              Em Atendimento Humano
            </span>
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-foreground">{realtime.inHuman}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSubView("human")}
              className="h-6 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-2"
            >
              Ver Detalhes
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Negociação direta e fechamento de acordos
          </p>
        </div>

        {/* Na IA Autônoma */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              Na IA Autônoma
            </span>
            <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-foreground">{realtime.inAi}</span>
            <Badge variant="outline" className="border-purple-500/30 text-[10px] text-purple-400 font-mono">
              Auto-resolução
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Resolução contextual guiada pela base de conhecimento
          </p>
        </div>
      </div>

      {/* 3. Tabelas Vivas de Fila de Espera vs Atendimento Humano (Fotos 3 e 5) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                Monitoramento Operacional Ao Vivo
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhe o tempo de espera na fila e os atendimentos humanos em curso
              </CardDescription>
            </div>

            {/* Sub-view switcher */}
            <div className="inline-flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveSubView("queue")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-all ${
                  activeSubView === "queue"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Fila de Espera ({liveQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubView("human")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-all ${
                  activeSubView === "human"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                Em Atendimento Humano ({liveHuman.length})
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeSubView === "queue" ? (
            /* TABELA 1: FILA DE ESPERA (Aguardando Distribuição) */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-6 pr-3">SLA</th>
                    <th className="px-3 py-2.5">Campanha / Assessoria</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5">Contato</th>
                    <th className="px-3 py-2.5 text-center">Em Espera Há</th>
                    <th className="px-3 py-2.5 text-center">Canal Atual</th>
                    <th className="px-3 py-2.5 text-center">Prioridade</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {liveQueue.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted/30">
                      {/* SLA */}
                      <td className="py-3 pl-6 pr-3">{getSlaBadge(item.slaStatus)}</td>

                      {/* Campanha */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-foreground">{item.campaignName}</span>
                      </td>

                      {/* Cliente + CPF */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{item.clientName}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({item.cpf || "CPF na triagem"})
                          </span>
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="px-3 py-3 font-mono text-muted-foreground">{item.contactPhone}</td>

                      {/* Em Espera Há */}
                      <td className="px-3 py-3 text-center font-mono font-medium text-amber-400">
                        {item.waitingTime}
                      </td>

                      {/* Canal Atual */}
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono capitalize">
                          {item.currentChannel === "queue"
                            ? "Fila de Transbordo"
                            : item.currentChannel === "robot"
                            ? "Robô Triagem"
                            : "IA Autônoma"}
                        </Badge>
                      </td>

                      {/* Prioridade */}
                      <td className="px-3 py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            item.priority === "VIP"
                              ? "bg-purple-500/15 text-purple-400"
                              : item.priority === "Alta"
                              ? "bg-amber-500/15 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.priority}
                        </Badge>
                      </td>

                      {/* Ação */}
                      <td className="py-3 pl-3 pr-6 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                        >
                          Puxar Atendimento
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* TABELA 2: EM ATENDIMENTO HUMANO */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pl-6 pr-3">SLA</th>
                    <th className="px-3 py-2.5">Campanha</th>
                    <th className="px-3 py-2.5">Operador</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-3 py-2.5 text-center">Início</th>
                    <th className="px-3 py-2.5 text-center">Última Mensagem</th>
                    <th className="px-3 py-2.5">Status / Tabulação</th>
                    <th className="py-2.5 pl-3 pr-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {liveHuman.map((att) => (
                    <tr key={att.id} className="transition-colors hover:bg-muted/30">
                      {/* SLA */}
                      <td className="py-3 pl-6 pr-3">{getSlaBadge(att.slaStatus)}</td>

                      {/* Campanha */}
                      <td className="px-3 py-3 font-semibold text-foreground">{att.campaignName}</td>

                      {/* Operador Avatar + Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {att.agentAvatar && <AvatarImage src={att.agentAvatar} />}
                            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                              {att.agentInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">{att.agentName}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-3 py-3 font-medium text-foreground">
                        {att.clientName}
                        <p className="text-[10px] font-mono text-muted-foreground">{att.contactPhone}</p>
                      </td>

                      {/* Início */}
                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {att.startedAt}
                      </td>

                      {/* Última Mensagem */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`font-mono text-[11px] font-medium ${
                            att.lastInteraction === "client" ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {att.lastInteraction === "client" ? "Devedor " : "Operador "}
                          ({att.lastMessageTime})
                        </span>
                      </td>

                      {/* Status / Tabulação */}
                      <td className="px-3 py-3">
                        <Badge variant="outline" className="text-[10px] font-medium text-foreground">
                          {att.statusTabulation}
                        </Badge>
                      </td>

                      {/* Ações */}
                      <td className="py-3 pl-3 pr-6 text-right">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:underline">
                          Abrir Chat
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
