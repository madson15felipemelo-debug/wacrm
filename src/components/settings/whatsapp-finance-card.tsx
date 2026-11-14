'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DollarSign,
  Send,
  MessageSquare,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FinancePeriod = 'today' | '7d' | 'month' | '30d'

interface FinanceApiPayload {
  period: FinancePeriod
  startDate: string
  endDate: string
  counts: {
    broadcastDisparos: number
    individualTemplates: number
    totalDisparos: number
    humanInteractions: number
    botAiInteractions: number
    totalInteractions: number
    inboundCustomerMsgs: number
    activeConversations: number
    failedNotBilled: number
  }
  metaOfficial?: {
    costUsd: number | null
    conversationsCount: number | null
  }
}

const STORAGE_RATES_KEY = 'luma_wa_finance_rates_v1'

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatInt(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value || 0)
}

export function WhatsAppFinanceCard() {
  const [period, setPeriod] = useState<FinancePeriod>('month')
  const [data, setData] = useState<FinanceApiPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRatesEditor, setShowRatesEditor] = useState(false)

  // Editable unit rates (BRL) persisted locally so the user can match their exact Meta tier/invoice
  const [disparoRate, setDisparoRate] = useState<number>(0.25)
  const [interactionRate, setInteractionRate] = useState<number>(0.05)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_RATES_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.disparoRate === 'number' && parsed.disparoRate >= 0) {
          setDisparoRate(parsed.disparoRate)
        }
        if (typeof parsed.interactionRate === 'number' && parsed.interactionRate >= 0) {
          setInteractionRate(parsed.interactionRate)
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const saveRates = (newDisparo: number, newInteraction: number) => {
    setDisparoRate(newDisparo)
    setInteractionRate(newInteraction)
    try {
      window.localStorage.setItem(
        STORAGE_RATES_KEY,
        JSON.stringify({ disparoRate: newDisparo, interactionRate: newInteraction })
      )
    } catch {
      // ignore
    }
  }

  const fetchFinance = useCallback(async (selectedPeriod: FinancePeriod) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/whatsapp/finance?period=${selectedPeriod}`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (res.ok) {
        const json = (await res.json()) as FinanceApiPayload
        setData(json)
      }
    } catch (err) {
      console.error('[whatsapp-finance-card] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFinance(period)
  }, [period, fetchFinance])

  const breakdown = useMemo(() => {
    const counts = data?.counts ?? {
      broadcastDisparos: 0,
      individualTemplates: 0,
      totalDisparos: 0,
      humanInteractions: 0,
      botAiInteractions: 0,
      totalInteractions: 0,
      inboundCustomerMsgs: 0,
      activeConversations: 0,
      failedNotBilled: 0,
    }

    const broadcastCost = counts.broadcastDisparos * disparoRate
    const templateIndCost = counts.individualTemplates * disparoRate
    const totalDisparosCost = broadcastCost + templateIndCost

    const humanIntCost = counts.humanInteractions * interactionRate
    const botAiIntCost = counts.botAiInteractions * interactionRate
    const totalInteractionsCost = humanIntCost + botAiIntCost

    const totalCost = totalDisparosCost + totalInteractionsCost
    const pct = (val: number) =>
      totalCost > 0 ? Math.round((val / totalCost) * 1000) / 10 : 0

    const rows = [
      {
        id: 'broadcast',
        label: 'Disparos em Massa (Broadcasts entregues)',
        categoryBadge: 'Disparo',
        badgeClass: 'border-primary/30 bg-primary/10 text-primary',
        qty: counts.broadcastDisparos,
        unitRate: disparoRate,
        cost: broadcastCost,
        sharePct: pct(broadcastCost),
      },
      {
        id: 'individual_template',
        label: 'Templates Individuais (Abertura de conversa)',
        categoryBadge: 'Disparo',
        badgeClass: 'border-primary/30 bg-primary/10 text-primary',
        qty: counts.individualTemplates,
        unitRate: disparoRate,
        cost: templateIndCost,
        sharePct: pct(templateIndCost),
      },
      {
        id: 'human_interaction',
        label: 'Interações de Operador Humano',
        categoryBadge: 'Interação',
        badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        qty: counts.humanInteractions,
        unitRate: interactionRate,
        cost: humanIntCost,
        sharePct: pct(humanIntCost),
      },
      {
        id: 'bot_ai_interaction',
        label: 'Interações de Robô (Fluxo) e Agente de IA',
        categoryBadge: 'Interação',
        badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        qty: counts.botAiInteractions,
        unitRate: interactionRate,
        cost: botAiIntCost,
        sharePct: pct(botAiIntCost),
      },
      {
        id: 'failed_exempt',
        label: 'Falhas / Não Entregues (Isentos de cobrança)',
        categoryBadge: 'Isento',
        badgeClass: 'border-border bg-muted/60 text-muted-foreground',
        qty: counts.failedNotBilled,
        unitRate: 0,
        cost: 0,
        sharePct: 0,
      },
    ]

    return {
      totalCost,
      totalDisparosCost,
      totalInteractionsCost,
      totalDisparosQty: counts.totalDisparos,
      totalInteractionsQty: counts.totalInteractions,
      totalBillableQty: counts.totalDisparos + counts.totalInteractions,
      disparosSharePct: pct(totalDisparosCost),
      interactionsSharePct: pct(totalInteractionsCost),
      rows,
    }
  }, [data, disparoRate, interactionRate])

  return (
    <Card className="border-border bg-card shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary">
                <DollarSign className="h-3.5 w-3.5" />
              </span>
              Finanças & Consumo do WhatsApp
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-muted-foreground">
              Controle de gastos separado entre disparos de templates e interações de atendimento.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-[11px]">
              {(
                [
                  { id: 'today', label: 'Hoje' },
                  { id: '7d', label: '7D' },
                  { id: 'month', label: 'Este Mês' },
                  { id: '30d', label: '30D' },
                ] as { id: FinancePeriod; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer',
                    period === p.id
                      ? 'bg-background text-foreground shadow-2xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowRatesEditor((v) => !v)}
              title="Ajustar tarifas unitárias"
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-medium transition-colors cursor-pointer',
                showRatesEditor
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Tarifas</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchFinance(period)}
              disabled={loading}
              title="Atualizar consumo"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Optional Unit Rate Customizer */}
        {showRatesEditor && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="wa-rate-disparo"
                className="mb-1 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Custo Unitário por Disparo (R$)
              </label>
              <input
                id="wa-rate-disparo"
                type="number"
                step="0.01"
                min="0"
                value={disparoRate}
                onChange={(e) =>
                  saveRates(Math.max(0, Number(e.target.value || 0)), interactionRate)
                }
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="wa-rate-interacao"
                className="mb-1 block text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Custo Unitário por Interação (R$)
              </label>
              <input
                id="wa-rate-interacao"
                type="number"
                step="0.01"
                min="0"
                value={interactionRate}
                onChange={(e) =>
                  saveRates(disparoRate, Math.max(0, Number(e.target.value || 0)))
                }
                className="h-8 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Top 3 Compact Summary Strip */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {/* 1. Total Gasto */}
          <div className="rounded-xl border border-border bg-muted/15 p-3">
            <span className="text-[11px] font-medium text-muted-foreground">
              Gasto Total no Período
            </span>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-foreground">
              {loading ? '—' : formatBRL(breakdown.totalCost)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {loading ? '...' : `${formatInt(breakdown.totalBillableQty)} envios contabilizados`}
            </p>
          </div>

          {/* 2. Gasto Disparando */}
          <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Gasto com Disparos
              </span>
              <Send className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-foreground">
              {loading ? '—' : formatBRL(breakdown.totalDisparosCost)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {loading
                ? '...'
                : `${formatInt(breakdown.totalDisparosQty)} disparos (${breakdown.disparosSharePct}%)`}
            </p>
          </div>

          {/* 3. Gasto com Interação */}
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Gasto com Interação
              </span>
              <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <p className="mt-1 font-mono text-lg font-bold tracking-tight text-foreground">
              {loading ? '—' : formatBRL(breakdown.totalInteractionsCost)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {loading
                ? '...'
                : `${formatInt(breakdown.totalInteractionsQty)} interações (${breakdown.interactionsSharePct}%)`}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <th className="px-3.5 py-2.5">Detalhamento de Consumo</th>
                  <th className="px-3 py-2.5 text-center">Tipo</th>
                  <th className="px-3 py-2.5 text-right">Qtd.</th>
                  <th className="px-3 py-2.5 text-right">Tarifa Unit.</th>
                  <th className="px-3.5 py-2.5 text-right">Valor Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {breakdown.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-3.5 py-2.5 font-medium text-foreground">
                      {r.label}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          r.badgeClass
                        )}
                      >
                        {r.categoryBadge}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] font-semibold text-foreground">
                      {loading ? '—' : formatInt(r.qty)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[11px] text-muted-foreground">
                      {r.unitRate > 0 ? formatBRL(r.unitRate) : 'Isento'}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                      {loading ? '—' : formatBRL(r.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/25 font-semibold">
                  <td colSpan={2} className="px-3.5 py-2.5 text-xs text-foreground">
                    Total Consolidado do Período
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-foreground">
                    {loading ? '—' : formatInt(breakdown.totalBillableQty)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground">
                    100%
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-xs font-bold text-primary">
                    {loading ? '—' : formatBRL(breakdown.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
