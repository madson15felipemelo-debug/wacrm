"use client";

import type { ChannelBreakdown } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, UserCheck, Workflow } from "lucide-react";

interface ChannelBreakdownCardProps {
  channels: ChannelBreakdown;
  loading?: boolean;
}

export function ChannelBreakdownCard({ channels }: ChannelBreakdownCardProps) {
  const { robot, ai, human } = channels;

  return (
    <Card className="h-full border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-sm font-semibold text-foreground">
            Canais de Atendimento
          </CardTitle>
          <CardDescription className="text-xs">
            Distribuição de volume entre triagem, automação e equipe humana
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted flex">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${robot.percentage}%` }}
              title={`Triagem: ${robot.percentage}%`}
            />
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${ai.percentage}%` }}
              title={`Automático: ${ai.percentage}%`}
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${human.percentage}%` }}
              title={`Humano: ${human.percentage}%`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              Triagem {robot.percentage}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Automático {ai.percentage}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Humano {human.percentage}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Workflow className="h-3.5 w-3.5 text-sky-500" />
                Triagem
              </span>
              <span className="text-[10px] font-mono">&lt; 2s</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-foreground font-mono">{robot.count}</span>
              <span className="text-xs font-mono text-muted-foreground">{robot.percentage}%</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Identificação e coleta de CPF
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
                Automático
              </span>
              <span className="text-[10px] font-mono">~6s</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-foreground font-mono">{ai.count}</span>
              <span className="text-xs font-mono text-muted-foreground">{ai.percentage}%</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Atendimento sem transbordo
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/15 p-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                Humano
              </span>
              <span className="text-[10px] font-mono text-emerald-500">{human.agreementRate}% conv.</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-lg font-semibold text-foreground font-mono">{human.count}</span>
              <span className="text-xs font-mono text-muted-foreground">{human.percentage}%</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Negociação e fechamento
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
