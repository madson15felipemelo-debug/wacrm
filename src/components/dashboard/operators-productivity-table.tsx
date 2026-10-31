"use client";

import { useMemo, useState } from "react";
import type { OperatorProductivityRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Search } from "lucide-react";
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

  const getRankBadge = (rank?: number) => {
    if (rank === 1) return <span className="text-base" title="1º Lugar">🥇</span>;
    if (rank === 2) return <span className="text-base" title="2º Lugar">🥈</span>;
    if (rank === 3) return <span className="text-base" title="3º Lugar">🥉</span>;
    return null;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-emerald-500";
    if (percent >= 65) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getAvatarBg = (idx: number) => {
    const colors = [
      "bg-amber-500 text-white",
      "bg-emerald-500 text-white",
      "bg-blue-600 text-white",
      "bg-indigo-600 text-white",
      "bg-purple-600 text-white",
      "bg-rose-600 text-white",
    ];
    return colors[idx % colors.length];
  };

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Trophy className="h-4 w-4 text-amber-500" />
              Detalhamento de Produtividade Individual (Visão Global)
            </CardTitle>
            <CardDescription className="text-xs">
              Ranking comparativo de conversão em acordos, tempo médio e ocupação entre negociadores
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar negociador..."
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
              <tr className="border-y border-border/80 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pl-6 pr-3">Operador</th>
                <th className="px-3 py-2.5 text-center">Ativos</th>
                <th className="px-3 py-2.5 text-center">Finalizados</th>
                <th className="px-3 py-2.5 text-center font-bold text-foreground">Acordos</th>
                <th className="px-3 py-2.5 text-center font-bold text-emerald-500">Conversão</th>
                <th className="px-3 py-2.5 text-center">TMA</th>
                <th className="py-2.5 pl-3 pr-6 text-right">Produtividade (Ocupação)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Carregando métricas de operadores...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Nenhum operador com atividade no período selecionado.
                  </td>
                </tr>
              ) : (
                filtered.map((op, idx) => (
                  <tr key={op.userId} className="transition-colors hover:bg-muted/30">
                    {/* Operador Avatar + Name + Medal */}
                    <td className="py-3 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex w-6 items-center justify-center font-bold">
                          {getRankBadge(op.rank) || (
                            <span className="text-[11px] text-muted-foreground">{op.rank}º</span>
                          )}
                        </div>
                        <Avatar className="h-8 w-8">
                          {op.avatarUrl && <AvatarImage src={op.avatarUrl} alt={op.name} />}
                          <AvatarFallback className={`text-xs font-semibold ${getAvatarBg(idx)}`}>
                            {op.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground">{op.name}</p>
                          {op.campaignName && (
                            <Badge variant="outline" className="mt-0.5 text-[9px] text-muted-foreground">
                              {op.campaignName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ativos */}
                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {op.activeChats}
                    </td>

                    {/* Finalizados */}
                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {op.completedChats}
                    </td>

                    {/* Acordos (em negrito de destaque) */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-foreground">
                      {op.agreementsCount}
                    </td>

                    {/* Conversão (Verde) */}
                    <td className="px-3 py-3 text-center font-mono font-semibold text-emerald-500">
                      {op.conversionRate.toFixed(1)}%
                    </td>

                    {/* TMA */}
                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {op.tmaString}
                    </td>

                    {/* Produtividade / Ocupação com Barra de Progresso */}
                    <td className="py-3 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                              op.occupancyPercent
                            )}`}
                            style={{ width: `${Math.min(100, Math.max(5, op.occupancyPercent))}%` }}
                          />
                        </div>
                        <span className="w-8 font-mono text-[11px] font-medium text-foreground">
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
