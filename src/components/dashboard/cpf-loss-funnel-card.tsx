"use client";

import type { CpfDropoffStage, CpfLossInsight } from "@/lib/dashboard/operational-queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, CheckCircle2, Filter, Info, TrendingDown } from "lucide-react";

interface CpfLossFunnelCardProps {
  stages: CpfDropoffStage[];
  insights: CpfLossInsight[];
  loading?: boolean;
}

export function CpfLossFunnelCard({
  stages,
  insights,
  loading = false,
}: CpfLossFunnelCardProps) {
  const getInsightIcon = (type: CpfLossInsight["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-sky-500 shrink-0" />;
    }
  };

  const getInsightBorder = (type: CpfLossInsight["type"]) => {
    switch (type) {
      case "warning":
        return "border-amber-500/30 bg-amber-500/5";
      case "alert":
        return "border-rose-500/30 bg-rose-500/5";
      case "success":
        return "border-emerald-500/30 bg-emerald-500/5";
      default:
        return "border-sky-500/30 bg-sky-500/5";
    }
  };

  return (
    <Card className="h-full border border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Onde o CPF está parando? (Funil de Perda)
            </CardTitle>
            <CardDescription className="text-xs">
              Mapeamento de evasão de devedores da chegada até a conclusão do acordo
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Horizontal Funnel Progress Bars */}
        <div className="space-y-3">
          {stages.map((st, idx) => (
            <div key={st.stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{st.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-foreground">{st.count}</span>
                  <span className="text-[11px] text-muted-foreground">({st.percentage}%)</span>
                  {st.dropoffCount > 0 && (
                    <span className="text-[10px] font-semibold text-rose-500">
                      -{st.dropoffPercentage}% perda
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    idx === stages.length - 1
                      ? "bg-emerald-500"
                      : idx === 0
                      ? "bg-primary"
                      : "bg-primary/80"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, st.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Actionable Insights Box */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Diagnósticos Operacionais Automáticos
          </p>
          <div className="space-y-2">
            {insights.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors ${getInsightBorder(
                  item.type
                )}`}
              >
                {getInsightIcon(item.type)}
                <div>
                  <p className="font-semibold text-foreground text-[11px]">{item.title}</p>
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
