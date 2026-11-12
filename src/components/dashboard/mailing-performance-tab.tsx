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
  MessageSquare,
  UserCheck,
  CheckCircle2,
  Search,
  Download,
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

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const headers = [
      "Lote",
      "Modelo/Carteira",
      "Data",
      "Enviadas",
      "Invalidos",
      "Entregues",
      "Respostas",
      "Transbordo",
      "Acordos",
      "Status",
      "Conversao (%)",
    ];
    const rows = filtered.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.campaignName.replace(/"/g, '""')}"`,
      m.date,
      m.sentCount,
      m.invalidCount,
      m.deliveredCount,
      m.repliedCount,
      m.transferredToHumanCount,
      m.agreementsCount,
      m.status,
      m.conversionRate,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "relatorio_disparos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: MailingPerformanceRow["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500 font-mono text-[10px]">
            Concluído
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="outline" className="border-sky-500/25 bg-sky-500/10 text-sky-500 font-mono text-[10px]">
            Em andamento
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px]">
            Agendado
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="outline" className="border-amber-500/25 bg-amber-500/10 text-amber-500 font-mono text-[10px]">
            Pausado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Resumo de Disparos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Disparados</span>
            <Send className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">
            {totals.totalSent.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {totals.validRate}% entregues
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Inválidos</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">
            {totals.totalInvalid}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {totals.totalSent > 0 ? ((totals.totalInvalid / totals.totalSent) * 100).toFixed(1) : 0}% de falha
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Taxa de Resposta</span>
            <MessageSquare className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">
            {totals.avgResponseRate}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {totals.totalReplied} respostas
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Transbordo</span>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-foreground">
            {totals.totalTransferred}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {totals.avgTransferredRate}% das respostas
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Acordos</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold font-mono text-emerald-500">
            {totals.totalAgreements}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {totals.overallConversion}% sobre o total
          </p>
        </div>
      </div>

      {/* 2. Tabela de Mailings */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                Desempenho por Lote de Disparo
              </CardTitle>
              <CardDescription className="text-xs">
                Entrega, respostas, encaminhamento para equipe e conversão
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar lote..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
                className="h-8 gap-1.5 text-xs cursor-pointer"
              >
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
                <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 pl-6 pr-3">Lote</th>
                  <th className="px-3 py-2.5">Template</th>
                  <th className="px-3 py-2.5 text-center">Data</th>
                  <th className="px-3 py-2.5 text-center">Enviadas</th>
                  <th className="px-3 py-2.5 text-center">Inválidos</th>
                  <th className="px-3 py-2.5 text-center">Respostas</th>
                  <th className="px-3 py-2.5 text-center">Transbordo</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-emerald-500">Acordos</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="py-2.5 pl-3 pr-6 text-right">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                      Carregando lotes de disparo...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-xs text-muted-foreground">
                      Nenhum lote de disparo registrado no período.
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-muted/30">
                      <td className="py-3 pl-6 pr-3">
                        <div className="font-medium text-foreground font-mono">{m.name}</div>
                      </td>

                      <td className="px-3 py-3 text-muted-foreground">
                        {m.campaignName}
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {m.date}
                      </td>

                      <td className="px-3 py-3 text-center font-mono font-medium text-foreground">
                        {m.sentCount}
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-muted-foreground">
                        {m.invalidCount}{" "}
                        <span className="text-[10px]">({m.invalidRate}%)</span>
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {m.repliedCount}{" "}
                        <span className="text-[10px] text-muted-foreground">({m.responseRate}%)</span>
                      </td>

                      <td className="px-3 py-3 text-center font-mono text-foreground">
                        {m.transferredToHumanCount}{" "}
                        <span className="text-[10px] text-muted-foreground">({m.transferredRate}%)</span>
                      </td>

                      <td className="px-3 py-3 text-center font-mono font-semibold text-emerald-500">
                        {m.agreementsCount}
                      </td>

                      <td className="px-3 py-3 text-center">{getStatusBadge(m.status)}</td>

                      <td className="py-3 pl-3 pr-6 text-right font-mono font-medium text-foreground">
                        {m.conversionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
