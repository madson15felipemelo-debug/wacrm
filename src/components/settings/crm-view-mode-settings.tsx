'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  CheckCircle2,
  Layers,
  LayoutDashboard,
  Loader2,
  TrendingUp,
} from 'lucide-react';

import { useCrmViewMode } from '@/hooks/use-crm-view-mode';
import type { CrmAccountViewMode } from '@/lib/contacts/close-attendance';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const VIEW_MODE_OPTIONS: {
  id: CrmAccountViewMode;
  title: string;
  badge: string;
  description: string;
  icon: typeof Layers;
  highlights: string[];
}[] = [
  {
    id: 'both',
    title: 'Ambas as Visões Liberadas (Híbrido)',
    badge: 'Padrão',
    description:
      'Exibe o seletor no topo do Painel e de Relatórios permitindo alternar entre Operações & Cobrança e Pipeline & Vendas.',
    icon: Layers,
    highlights: [
      'Seletor visível no Painel e Relatórios',
      'Ideal para operações mistas ou demonstração comercial',
    ],
  },
  {
    id: 'collection',
    title: 'Exclusivo Operações & Cobrança',
    badge: 'Cobrança / Crédito',
    description:
      'Fixa o CRM na visão de Cobrança, Carteiras, CPFs e Acordos e oculta o botão de Pipeline & Vendas para toda a conta.',
    icon: Activity,
    highlights: [
      'Foco em Carteiras, CPFs, Acionamentos e Acordos',
      'Oculta a alternância para Pipeline & Vendas',
    ],
  },
  {
    id: 'sales',
    title: 'Exclusivo Pipeline, Leads & Vendas',
    badge: 'Comercial / Atendimento',
    description:
      'Fixa o CRM na visão Comercial, Leads, Funil de Negócios e Fechamentos e oculta os termos de Cobrança/Devedor.',
    icon: TrendingUp,
    highlights: [
      'Foco em Leads, Funis, Oportunidades e Fechamentos',
      'Oculta a alternância para Operações & Cobrança',
    ],
  },
];

export function CrmViewModeSettings({ className }: { className?: string }) {
  const { crmViewMode, loading, saveViewMode, canEditSettings } =
    useCrmViewMode();
  const [selected, setSelected] = useState<CrmAccountViewMode>(crmViewMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(crmViewMode);
  }, [crmViewMode]);

  const dirty = selected !== crmViewMode;

  async function handleSave() {
    if (!canEditSettings || !dirty) return;
    setSaving(true);
    const { ok } = await saveViewMode(selected);
    setSaving(false);
    if (!ok) {
      toast.error('Não foi possível salvar o modo de visualização do CRM.');
      return;
    }
    toast.success('Modo de visualização do Painel e Relatórios atualizado!');
  }

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <LayoutDashboard className="size-4 text-primary" />
          Modo de Operação do CRM (Painel & Relatórios)
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Defina qual visão executiva fica disponível para os usuários desta
          conta no <strong>Painel Principal</strong> e na central de{' '}
          <strong>Relatórios</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {VIEW_MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={!canEditSettings || loading}
                onClick={() => setSelected(opt.id)}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all',
                  active
                    ? 'border-primary bg-primary/[0.05] shadow-xs ring-1 ring-primary/30'
                    : 'border-border bg-muted/25 hover:border-primary/40 hover:bg-muted/50',
                  (!canEditSettings || loading) && 'cursor-not-allowed opacity-60',
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-lg border transition-colors',
                        active
                          ? 'border-primary/30 bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        active
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {opt.badge}
                    </span>
                  </div>

                  <div className="mt-3 text-sm font-semibold text-foreground">
                    {opt.title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {opt.description}
                  </p>
                </div>

                <ul className="mt-3.5 space-y-1 border-t border-border/60 pt-2.5">
                  {opt.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <CheckCircle2
                        className={cn(
                          'mt-0.5 size-3 shrink-0',
                          active ? 'text-primary' : 'text-muted-foreground/60',
                        )}
                      />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {canEditSettings && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Ao escolher uma visão exclusiva, o botão de alternância desaparece
              do Painel e de Relatórios para os usuários da conta.
            </p>
            <Button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar visão da conta'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

