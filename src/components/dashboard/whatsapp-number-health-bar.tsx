'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Phone,
  RefreshCw,
  ShieldAlert,
  Wifi,
  Zap,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface WhatsAppPhoneHealth {
  id?: string;
  verified_name: string;
  display_phone_number: string;
  quality_rating: string;
  status?: string;
  messaging_limit_tier?: string;
  name_status?: string;
  profile_picture_url?: string | null;
  is_primary?: boolean;
}

export function getQualityMeta(ratingRaw: string | undefined) {
  const rating = (ratingRaw || '').toUpperCase();
  if (rating === 'GREEN') {
    return {
      level: 'good' as const,
      label: 'Saúde Boa',
      shortLabel: 'Boa',
      description: 'Qualidade alta na Meta · entregas sem restrições',
      badgeClass:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500',
      barActiveClass: 'bg-emerald-500',
      activeBars: 3,
      icon: CheckCircle2,
    };
  }
  if (rating === 'YELLOW') {
    return {
      level: 'medium' as const,
      label: 'Saúde Média',
      shortLabel: 'Média',
      description: 'Atenção · houve bloqueios recentes de destinatários',
      badgeClass:
        'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      dotClass: 'bg-amber-500',
      barActiveClass: 'bg-amber-500',
      activeBars: 2,
      icon: AlertTriangle,
    };
  }
  if (rating === 'RED') {
    return {
      level: 'low' as const,
      label: 'Saúde Baixa',
      shortLabel: 'Baixa',
      description: 'Crítica · revise a frequência e os modelos de disparo',
      badgeClass:
        'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
      dotClass: 'bg-red-500',
      barActiveClass: 'bg-red-500',
      activeBars: 1,
      icon: ShieldAlert,
    };
  }
  return {
    level: 'good' as const,
    label: 'Saúde Boa',
    shortLabel: 'Boa',
    description: 'Linha ativa e pronta para operação',
    badgeClass:
      'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    barActiveClass: 'bg-emerald-500',
    activeBars: 3,
    icon: CheckCircle2,
  };
}

export function formatPhoneStatus(statusRaw: string | undefined) {
  const status = (statusRaw || 'CONNECTED').toUpperCase();
  switch (status) {
    case 'CONNECTED':
      return {
        label: 'Conectado',
        tone: 'ok' as const,
        className:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      };
    case 'FLAGGED':
      return {
        label: 'Sinalizado',
        tone: 'warn' as const,
        className:
          'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      };
    case 'RESTRICTED':
      return {
        label: 'Restrito',
        tone: 'danger' as const,
        className:
          'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
      };
    case 'PENDING':
      return {
        label: 'Pendente',
        tone: 'warn' as const,
        className:
          'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
      };
    default:
      return {
        label: status,
        tone: 'ok' as const,
        className: 'border-border bg-muted text-foreground',
      };
  }
}

export function formatMessagingTier(tierRaw: string | undefined): string {
  const tier = (tierRaw || '').toUpperCase();
  switch (tier) {
    case 'TIER_50':
      return '50 envios / 24h';
    case 'TIER_250':
      return '250 envios / 24h';
    case 'TIER_1K':
      return '1.000 envios / 24h';
    case 'TIER_10K':
      return '10.000 envios / 24h';
    case 'TIER_100K':
      return '100.000 envios / 24h';
    case 'TIER_UNLIMITED':
      return 'Ilimitado';
    default:
      return 'Padrão Meta';
  }
}

export function WhatsAppNumberHealthBar() {
  const [phones, setPhones] = useState<WhatsAppPhoneHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/profile', { cache: 'no-store' });
      if (!res.ok) {
        setPhones([]);
        return;
      }
      const payload = await res.json();
      if (Array.isArray(payload?.phones) && payload.phones.length > 0) {
        setPhones(payload.phones);
      } else if (payload?.phone) {
        setPhones([
          {
            ...payload.phone,
            profile_picture_url: payload.profile?.profile_picture_url ?? null,
            is_primary: true,
          },
        ]);
      } else {
        setPhones([]);
      }
    } catch {
      // Ignore silently on dashboard if WhatsApp is not configured yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  if (!loading && phones.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
      {/* Header when multiple numbers exist */}
      {!loading && phones.length > 1 && (
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Phone className="size-3.5 text-primary" />
            Números do WhatsApp na conta ({phones.length})
          </div>
          <button
            type="button"
            onClick={() => void fetchHealth()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="size-3" />
            Atualizar todos
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <Avatar className="size-10 shrink-0 ring-1 ring-border">
            <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
              WA
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Verificando linhas do WhatsApp...
            </p>
            <p className="text-xs text-muted-foreground">
              Consultando qualidade e status na API da Meta...
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {phones.map((item, idx) => {
            const quality = getQualityMeta(item.quality_rating);
            const statusMeta = formatPhoneStatus(item.status);
            const tierLabel = formatMessagingTier(item.messaging_limit_tier);

            return (
              <div
                key={item.id || item.display_phone_number || idx}
                className="flex flex-col gap-4 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between"
              >
                {/* Identificação da Linha */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <Avatar className="size-10 shrink-0 ring-1 ring-border">
                    {item.profile_picture_url ? (
                      <AvatarImage
                        src={item.profile_picture_url}
                        alt={item.verified_name || 'WhatsApp'}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {(item.verified_name || 'WA').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.verified_name || 'WhatsApp Oficial'}
                      </span>
                      {item.display_phone_number && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {item.display_phone_number}
                        </span>
                      )}
                      {phones.length > 1 && item.is_primary && (
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/10 text-primary text-[10px]"
                        >
                          Principal no CRM
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {quality.description}
                    </p>
                  </div>
                </div>

                {/* Indicadores de Saúde e Status */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {/* Escala Visual: Baixa | Média | Boa */}
                  <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
                    <Activity className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      Saúde do número:
                    </span>
                    <div className="inline-flex items-center gap-1 rounded-md bg-background/80 p-0.5 border border-border/60">
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                          quality.level === 'low'
                            ? 'bg-red-500 text-white font-semibold shadow-2xs'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        Baixa
                      </span>
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                          quality.level === 'medium'
                            ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        Média
                      </span>
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                          quality.level === 'good'
                            ? 'bg-emerald-500 text-white font-semibold shadow-2xs'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        Boa
                      </span>
                    </div>
                  </div>

                  {/* Status da Conexão */}
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
                    <Wifi className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                        statusMeta.className,
                      )}
                    >
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          statusMeta.tone === 'ok'
                            ? 'bg-emerald-500'
                            : statusMeta.tone === 'warn'
                              ? 'bg-amber-500'
                              : 'bg-red-500',
                        )}
                      />
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Limite de Disparos */}
                  {item.messaging_limit_tier && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
                      <Zap className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Limite:</span>
                      <span className="font-semibold text-foreground">
                        {tierLabel}
                      </span>
                    </div>
                  )}

                  {phones.length === 1 && (
                    <button
                      type="button"
                      onClick={() => void fetchHealth()}
                      title="Atualizar saúde do número"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RefreshCw className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
