"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ScheduledAgreementRow } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Clock } from "lucide-react";

interface ScheduledAgreementsTabProps {
  scheduled: ScheduledAgreementRow[];
  loading?: boolean;
}

export function ScheduledAgreementsTab({
  scheduled,
  loading = false,
}: ScheduledAgreementsTabProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return scheduled;
    const q = search.toLowerCase();
    return scheduled.filter(
      (s) =>
        s.clientName.toLowerCase().includes(q) ||
        s.campaignName.toLowerCase().includes(q) ||
        s.operatorName.toLowerCase().includes(q) ||
        s.observation.toLowerCase().includes(q)
    );
  }, [scheduled, search]);

  return (
    <Card className="border border-border shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Agendamentos e Promessas de Pagamento
            </CardTitle>
            <CardDescription className="text-xs">
              Retornos programados e compromissos registrados pela equipe
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente, operador ou nota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="py-2.5 pl-6 pr-3">Carteira</th>
                <th className="px-3 py-2.5">Data Prevista</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Telefone</th>
                <th className="px-3 py-2.5">Operador</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Observação</th>
                <th className="py-2.5 pl-3 pr-6 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Carregando agendamentos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Nenhum retorno agendado no momento.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="py-3 pl-6 pr-3 font-medium text-foreground">
                      {item.campaignName}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{item.scheduledDate}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className="font-medium text-foreground">{item.clientName}</span>
                    </td>

                    <td className="px-3 py-3 font-mono text-muted-foreground">
                      {item.contactPhone}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-muted text-foreground font-semibold">
                            {item.operatorInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{item.operatorName}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <Badge variant="outline" className="border-border text-muted-foreground font-mono text-[10px]">
                        {item.tabulation}
                      </Badge>
                    </td>

                    <td className="px-3 py-3 max-w-xs">
                      <p className="text-[11px] text-muted-foreground truncate" title={item.observation}>
                        {item.observation}
                      </p>
                    </td>

                    <td className="py-3 pl-3 pr-6 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          router.push(
                            item.conversationId ? `/inbox?c=${item.conversationId}` : "/inbox"
                          )
                        }
                        className="h-7 text-xs text-primary cursor-pointer"
                      >
                        Abrir
                      </Button>
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
