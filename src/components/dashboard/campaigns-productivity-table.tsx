"use client";

import type { CampaignProductivityRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CampaignsProductivityTableProps {
  campaigns: CampaignProductivityRow[];
  loading?: boolean;
}

export function CampaignsProductivityTable({
  campaigns,
  loading = false,
}: CampaignsProductivityTableProps) {
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-emerald-500";
    if (percent >= 65) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-sm font-semibold text-foreground">
            Produtividade por Carteira / Assessoria
          </CardTitle>
          <CardDescription className="text-xs">
            Volume recebido, conversão em acordos e tempo médio por assessoria
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pl-6 pr-3">Carteira / Assessoria</th>
                <th className="px-3 py-2.5 text-center">Operadores Online</th>
                <th className="px-3 py-2.5 text-center">CPFs Recebidos</th>
                <th className="px-3 py-2.5 text-center">Finalizados</th>
                <th className="px-3 py-2.5 text-center font-semibold text-foreground">Acordos</th>
                <th className="px-3 py-2.5 text-center font-semibold text-emerald-500">Conversão</th>
                <th className="px-3 py-2.5 text-center">TMA</th>
                <th className="py-2.5 pl-3 pr-6 text-right">Ocupação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Carregando dados das carteiras...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Nenhuma assessoria cadastrada ou sem atividade no período.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.campaignId} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 pl-6 pr-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{camp.name}</span>
                          {camp.code && (
                            <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">
                              {camp.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Contratante: {camp.clientName || "Ambiental"}
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {camp.onlineOperators}/{camp.totalOperators}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {camp.cpfsReceived}
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {camp.cpfsCompleted}
                    </td>

                    <td className="px-3 py-3 text-center font-mono font-semibold text-foreground">
                      {camp.agreementsCount}
                    </td>

                    <td className="px-3 py-3 text-center font-mono font-semibold text-emerald-500">
                      {camp.conversionRate.toFixed(1)}%
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {camp.avgTmaString}
                    </td>

                    <td className="py-3 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                              camp.occupancyPercent
                            )}`}
                            style={{ width: `${Math.min(100, Math.max(5, camp.occupancyPercent))}%` }}
                          />
                        </div>
                        <span className="w-8 font-mono text-[11px] text-muted-foreground">
                          {camp.occupancyPercent}%
                        </span>
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
  );
}
