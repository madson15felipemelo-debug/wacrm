"use client";

import { useState, useMemo } from "react";
import type { MailingPerformanceRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  AlertOctagon,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Trophy,
  Search,
  Download,
  Flame,
  ArrowUpRight,
} from "lucide-react";

interface MailingPerformanceTabProps {
  mailings: MailingPerformanceRow[];
  loading?: boolean;
}

export function MailingPerformanceTab({
  mailings,
  loading = false,
}: MailingPerformanceTabProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return mailings;
    const q = search.toLowerCase();
    return mailings.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.campaignName.toLowerCase().includes(q)
    );
  }, [mailings, search]);

  // Aggregate executive metrics
  const totals = useMemo(() => {
    const totalSent = mailings.reduce((acc, m) => acc + m.sentCount, 0);
    const totalInvalid = mailings.reduce((acc, m) => acc + m.invalidCount, 0);
    const totalDelivered = mailings.reduce((acc, m) => acc + m.deliveredCount, 0);
    const totalReplied = mailings.reduce((acc, m) => acc + m.repliedCount, 0);
    const totalTransferred = mailings.reduce((acc, m) => acc + m.transferredToHumanCount, 0);
    const totalAgreements = mailings.reduce((acc, m) => acc + m.agreementsCount, 0);

    const validRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : "0";
    const avgResponseRate = totalDelivered > 0 ? ((totalReplied / totalDelivered) * 100).toFixed(1) : "0";
    const avgTransferredRate = totalReplied > 0 ? ((totalTransferred / totalReplied) * 100).toFixed(1) : "0";
    const overallConversion = totalSent > 0 ? ((totalAgreements / totalSent) * 100).toFixed(1) : "0";

    return {
      totalSent,
      totalInvalid,
      totalDelivered,
      totalReplied,
      totalTransferred,
      totalAgreements,
      validRate,
      avgResponseRate,
      avgTransferredRate,
      overallConversion,
    };
  }, [mailings]);

  const getStatusBadge = (status: MailingPerformanceRow["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
            Concluído
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-[10px] animate-pulse">
            Disparando...
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-400 font-mono text-[10px]">
            Agendado
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[10px]">
            Pausado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Mailing KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Enviadas */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Disparado</span>
            <Send className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">
            {totals.totalSent.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals.validRate}% entregues com sucesso
          </p>
        </div>

        {/* Números Inválidos */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Números Inválidos</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-rose-400">
            {totals.totalInvalid}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals.totalSent > 0 ? ((totals.totalInvalid / totals.totalSent) * 100).toFixed(1) : 0}% sem WhatsApp / falhas
          </p>
        </div>

        {/* Taxa de Resposta */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">Taxa de Resposta</span>
            <MessageSquare className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-sky-400">
            {totals.avgResponseRate}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals.totalReplied} devedores responderam
          </p>
        </div>

        {/* Transferidos p/ Humano */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Transbordo Humano</span>
            <UserCheck className="h-4 w-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-purple-400">
            {totals.totalTransferred}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals.avgTransferredRate}% dos que responderam
          </p>
        </div>

        {/* Acordos Gerados */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Acordos Fechados</span>
            <Trophy className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {totals.totalAgreements}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals.overallConversion}% de conversão sobre a base
          </p>
        </div>
      </div>

      {/* 2. Tabela Detalhada de Performance de Mailings */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Flame className="h-4 w-4 text-primary" />
                Performance Detalhada por Mailing / Lote de Disparos
              </CardTitle>
              <CardDescription className="text-xs">
                Acompanhamento de entrega, números inválidos, taxa de resposta, transbordo para operador e acordos
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar mailing ou campanha..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pl-6 pr-3">Mailing / Lote</th>
                  <th className="px-3 py-2.5">Assessoria / Campanha</th>
                  <th className="px-3 py-2.5 text-center">Data Disparo</th>
                  <th className="px-3 py-2.5 text-center">Enviadas</th>
                  <th className="px-3 py-2.5 text-center">Números Inválidos</th>
                  <th className="px-3 py-2.5 text-center font-bold text-sky-400">Responderam</th>
                  <th className="px-3 py-2.5 text-center font-bold text-purple-400">Transf. Humano</th>
                  <th className="px-3 py-2.5 text-center font-bold text-emerald-500">Acordos</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Eficácia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-muted/30">
                    {/* Nome do Mailing */}
                    <td className="py-3 pl-6 pr-3">
                      <div className="font-semibold text-foreground font-mono">{m.name}</div>
                    </td>

                    {/* Campanha */}
                    <td className="px-3 py-3">
                      <span className="font-medium text-foreground">{m.campaignName}</span>
                    </td>

                    {/* Data */}
                    <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                      {m.date}
                    </td>

                    {/* Enviadas */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-foreground">
                      {m.sentCount}
                    </td>

                    {/* Números Inválidos */}
                    <td className="px-3 py-3 text-center font-mono text-rose-400">
                      {m.invalidCount}{" "}
                      <span className="text-[10px] text-muted-foreground">({m.invalidRate}%)</span>
                    </td>

                    {/* Responderam / Tx Resposta */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-sky-400">
                      {m.repliedCount}{" "}
                      <span className="text-[10px] font-semibold text-sky-400">({m.responseRate}%)</span>
                    </td>

                    {/* Transferidos para Humano */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-purple-400">
                      {m.transferredToHumanCount}{" "}
                      <span className="text-[10px] text-muted-foreground">({m.transferredRate}%)</span>
                    </td>

                    {/* Acordos Fechados */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-emerald-500">
                      {m.agreementsCount}{" "}
                      <span className="text-[10px] font-semibold text-emerald-400">({m.conversionRate}%)</span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 text-center">{getStatusBadge(m.status)}</td>

                    {/* Eficácia visual (Barra de Progresso) */}
                    <td className="py-3 pl-3 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(10, m.conversionRate * 15))}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          {m.conversionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
