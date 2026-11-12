"use client";

import { useMemo, useState } from "react";
import type { OperatorProductivityRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface OperatorsProductivityTableProps {
  operators: OperatorProductivityRow[];
  loading?: boolean;
}

export function OperatorsProductivityTable({
  operators,
  loading = false,
}: OperatorsProductivityTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return operators;
    const q = search.toLowerCase();
    return operators.filter((op) => op.name.toLowerCase().includes(q));
  }, [operators, search]);

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-emerald-500";
    if (percent >= 65) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Produtividade por Operador
            </CardTitle>
            <CardDescription className="text-xs">
              Conversão em acordos, tempo médio de atendimento e ocupação
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar operador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pl-6 pr-3">Operador</th>
                <th className="px-3 py-2.5 text-center">Ativos</th>
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
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Carregando operadores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Nenhum operador com atividade no período selecionado.
                  </td>
                </tr>
              ) : (
                filtered.map((op) => (
                  <tr key={op.userId} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-mono text-[11px] text-muted-foreground">
                          {op.rank}º
                        </span>
                        <Avatar className="h-7 w-7">
                          {op.avatarUrl && <AvatarImage src={op.avatarUrl} alt={op.name} />}
                          <AvatarFallback className="text-[10px] font-semibold bg-muted text-foreground">
                            {op.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{op.name}</p>
                          {op.campaignName && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {op.campaignName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {op.activeChats}
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {op.completedChats}
                    </td>

                    <td className="px-3 py-3 text-center font-mono font-semibold text-foreground">
                      {op.agreementsCount}
                    </td>

                    <td className="px-3 py-3 text-center font-mono font-semibold text-emerald-500">
                      {op.conversionRate.toFixed(1)}%
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {op.tmaString}
                    </td>

                    <td className="py-3 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                              op.occupancyPercent
                            )}`}
                            style={{ width: `${Math.min(100, Math.max(5, op.occupancyPercent))}%` }}
                          />
                        </div>
                        <span className="w-8 font-mono text-[11px] text-muted-foreground">
                          {op.occupancyPercent}%
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
