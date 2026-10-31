"use client";

import type { ChannelBreakdown } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, Sparkles, UserCheck, Zap } from "lucide-react";

interface ChannelBreakdownCardProps {
  channels: ChannelBreakdown;
  loading?: boolean;
}

export function ChannelBreakdownCard({ channels, loading = false }: ChannelBreakdownCardProps) {
  const { robot, ai, human } = channels;

  return (
    <Card className="h-full border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Robô vs IA vs Humano
            </CardTitle>
            <CardDescription className="text-xs">
              Divisão de carga de atendimento e eficiência operacional por canal
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 3-way Visual Stacked Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
            <div
              className="h-full bg-sky-500 transition-all duration-500"
              style={{ width: `${robot.percentage}%` }}
              title={`Robô: ${robot.percentage}%`}
            />
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${ai.percentage}%` }}
              title={`IA: ${ai.percentage}%`}
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${human.percentage}%` }}
              title={`Humano: ${human.percentage}%`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground font-medium px-0.5">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Robô {robot.percentage}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              IA {ai.percentage}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Humano {human.percentage}%
            </span>
          </div>
        </div>

        {/* 3 Comparative Cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* Robô */}
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-sky-500 flex items-center gap-1">
                <Bot className="h-3.5 w-3.5" />
                Robô (Triagem)
              </span>
              <span className="text-[10px] text-muted-foreground">Velocidade &lt; 2s</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-foreground font-mono">{robot.count}</span>
              <span className="text-xs font-semibold text-sky-500">{robot.percentage}%</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Qualificação automática e coleta de CPF sem intervenção
            </p>
          </div>

          {/* IA */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                IA (Agentes)
              </span>
              <span className="text-[10px] text-muted-foreground">Tempo ~6s</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-foreground font-mono">{ai.count}</span>
              <span className="text-xs font-semibold text-purple-500">{ai.percentage}%</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Respostas contextuais com base na base de conhecimento
            </p>
          </div>

          {/* Humano */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                Humano (Equipes)
              </span>
              <span className="text-[10px] text-emerald-500 font-semibold">{human.agreementRate}% acordos</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-bold text-foreground font-mono">{human.count}</span>
              <span className="text-xs font-semibold text-emerald-500">{human.percentage}%</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Negociação ativa de valores e fechamento de contratos
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
