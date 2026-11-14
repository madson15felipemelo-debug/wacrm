"use client";

import type { CpfDropoffStage, CpfLossInsight } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface CpfLossFunnelCardProps {
  stages: CpfDropoffStage[];
  insights: CpfLossInsight[];
  loading?: boolean;
  mode?: "collection" | "sales";
}

const SALES_STAGE_LABELS: Record<string, string> = {
  "1. Mensagem Enviada / Recebida": "1. Leads Recebidos / Acionados",
  "2. Interação Inicial": "2. Engajamento Inicial",
  "3. Triagem Concluída (CPF)": "3. Qualificação Concluída (Robô/IA)",
  "4. Em Negociação": "4. Atendimento com Consultor",
  "5. Acordo Fechado": "5. Venda / Negócio Ganho",
};

export function CpfLossFunnelCard({
  stages,
  insights,
  mode = "collection",
}: CpfLossFunnelCardProps) {
  const isSales = mode === "sales";
  const mappedStages = isSales
    ? stages.map((st) => ({
        ...st,
        label:
          SALES_STAGE_LABELS[st.label] ||
          st.label
            .replace(/CPF/gi, "Lead")
            .replace(/Acordo Fechado/gi, "Venda / Negócio Ganho")
            .replace(/Triagem/gi, "Qualificação"),
      }))
    : stages;
  const mappedInsights = isSales
    ? insights.map((ins) => ({
        ...ins,
        title: ins.title
          .replace(/triagem de CPF/gi, "qualificação inicial")
          .replace(/CPF/gi, "Lead")
          .replace(/acordos/gi, "fechamentos")
          .replace(/acordo/gi, "fechamento"),
        description: ins.description
          .replace(/informar o CPF/gi, "concluir a qualificação")
          .replace(/CPF/gi, "lead")
          .replace(/acordos/gi, "vendas/fechamentos")
          .replace(/acordo/gi, "fechamento")
          .replace(/operadores/gi, "consultores")
          .replace(/operador/gi, "consultor"),
      }))
    : insights;
  const getInsightIcon = (type: CpfLossInsight["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />;
      case "alert":
        return <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />;
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <Card className="h-full border border-border shadow-xs">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-sm font-semibold text-foreground">
            {isSales ? "Funil Comercial & Qualificação" : "Funil de Atendimento"}
          </CardTitle>
          <CardDescription className="text-xs">
            {isSales
              ? "Progressão desde a entrada do lead até o fechamento da venda"
              : "Progressão desde o contato inicial até o fechamento do acordo"}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2.5">
          {mappedStages.map((st, idx) => (
            <div key={st.stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{st.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-semibold text-foreground">{st.count}</span>
                  <span className="text-[11px] text-muted-foreground">({st.percentage}%)</span>
                  {st.dropoffCount > 0 && (
                    <span className="text-[10px] text-rose-500">
                      -{st.dropoffPercentage}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    idx === mappedStages.length - 1
                      ? "bg-emerald-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, st.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            {mappedInsights.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/15 p-2.5 text-xs"
              >
                {getInsightIcon(item.type)}
                <div>
                  <p className="font-medium text-foreground text-[11px]">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
