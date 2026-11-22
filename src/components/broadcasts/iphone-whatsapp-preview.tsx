'use client';

import React from 'react';
import type { MessageTemplate, TemplateButton } from '@/types';
import {
  ChevronLeft,
  Phone,
  Video,
  CheckCircle2,
  ExternalLink,
  Reply,
  Copy,
  ImageIcon,
  FileText,
  Film,
  Plus,
  Camera,
  Mic,
  Signal,
  Wifi,
  BatteryFull,
  Lock,
} from 'lucide-react';

export interface IphoneWhatsappPreviewProps {
  template?: Partial<MessageTemplate> | null;
  /** Rendered body text (already with {{1}}, {{2}} replaced if applicable) */
  bodyText?: string;
  /** Header text (already with {{1}} replaced if applicable) */
  headerText?: string;
  /** Media URL for image/video/document header */
  headerMediaUrl?: string;
  /** Footer text override */
  footerText?: string;
  /** Buttons override */
  buttons?: TemplateButton[];
  /** Business display name in the WhatsApp header */
  businessName?: string;
  /** Optional subtitle below the phone or badge above */
  recipientLabel?: string;
  className?: string;
}

/**
 * Formats WhatsApp basic markdown (*bold*, _italic_) into React nodes
 * while preserving line breaks.
 */
function renderWhatsAppFormattedText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <strong key={idx} className="font-semibold text-zinc-900 dark:text-zinc-50">
          {part.slice(1, -1)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function getButtonIcon(type: TemplateButton['type']) {
  switch (type) {
    case 'URL':
      return <ExternalLink className="h-3.5 w-3.5 shrink-0" />;
    case 'PHONE_NUMBER':
      return <Phone className="h-3.5 w-3.5 shrink-0" />;
    case 'COPY_CODE':
      return <Copy className="h-3.5 w-3.5 shrink-0" />;
    case 'QUICK_REPLY':
    default:
      return <Reply className="h-3.5 w-3.5 shrink-0" />;
  }
}

export function IphoneWhatsappPreview({
  template,
  bodyText,
  headerText,
  headerMediaUrl,
  footerText,
  buttons,
  businessName = 'Canal Oficial',
  recipientLabel,
  className = '',
}: IphoneWhatsappPreviewProps) {
  const effectiveHeaderType = template?.header_type ?? null;
  const effectiveHeaderText =
    headerText ?? (effectiveHeaderType === 'text' ? template?.header_content ?? '' : '');
  const effectiveMediaUrl =
    headerMediaUrl?.trim() || template?.header_media_url?.trim() || '';
  const effectiveBody = bodyText ?? template?.body_text ?? '';
  const effectiveFooter = footerText ?? template?.footer_text ?? '';
  const effectiveButtons = buttons ?? template?.buttons ?? [];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {recipientLabel && (
        <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-[11px] font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Prévia no celular: <strong className="text-foreground">{recipientLabel}</strong></span>
        </div>
      )}

      {/* iPhone Titanium Frame */}
      <div className="relative w-full max-w-[320px] rounded-[42px] border-[6px] border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl ring-1 ring-white/10">
        {/* Inner Bezel & Screen */}
        <div className="relative flex min-h-[560px] flex-col overflow-hidden rounded-[34px] bg-[#efeae2] dark:bg-[#0b141a]">
          {/* iOS Status Bar + Dynamic Island */}
          <div className="relative z-10 flex items-center justify-between bg-[#f6f6f6]/95 px-5 pt-2.5 pb-1.5 text-[11px] font-semibold text-zinc-900 backdrop-blur-md dark:bg-[#1f2c34]/95 dark:text-zinc-100">
            <span className="tracking-tight">09:41</span>
            {/* Dynamic Island */}
            <div className="h-4 w-20 rounded-full bg-black shadow-inner" />
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* WhatsApp iOS Top Navigation Bar */}
          <div className="relative z-10 flex items-center justify-between border-b border-black/5 bg-[#f6f6f6]/95 px-2.5 py-2 backdrop-blur-md dark:border-white/5 dark:bg-[#1f2c34]/95">
            <div className="flex min-w-0 items-center gap-1.5">
              <ChevronLeft className="h-5 w-5 shrink-0 text-[#007aff] dark:text-[#00a884]" />
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow-xs">
                {businessName.charAt(0).toUpperCase()}
                <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-[#1f2c34]">
                  <CheckCircle2 className="h-3 w-3 fill-emerald-500 text-white dark:text-[#1f2c34]" />
                </span>
              </div>
              <div className="min-w-0 pl-0.5">
                <div className="flex items-center gap-1">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {businessName}
                  </p>
                </div>
                <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                  Conta comercial oficial
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pr-1.5 text-[#007aff] dark:text-[#00a884]">
              <Video className="h-4 w-4" />
              <Phone className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Chat Canvas */}
          <div
            className="relative flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
            style={{
              backgroundImage:
                'radial-gradient(rgba(0, 0, 0, 0.045) 1px, transparent 0)',
              backgroundSize: '16px 16px',
            }}
          >
            {/* Date Pill */}
            <div className="flex justify-center">
              <span className="rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600 shadow-2xs backdrop-blur-xs dark:bg-[#182229]/90 dark:text-zinc-400">
                Hoje
              </span>
            </div>

            {/* Meta Encryption Pill */}
            <div className="mx-auto max-w-[92%] rounded-lg bg-[#fff5c4]/90 px-2.5 py-1.5 text-center text-[10px] leading-snug text-zinc-700 shadow-2xs dark:bg-[#182229]/95 dark:text-amber-200/80">
              <Lock className="mr-1 inline h-2.5 w-2.5 -translate-y-0.5" />
              Esta empresa usa um serviço seguro da Meta para gerenciar conversas.
            </div>

            {/* WhatsApp Template Message Bubble + Action Buttons */}
            <div className="max-w-[92%] overflow-hidden rounded-2xl rounded-tl-sm bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#202c33] dark:ring-white/5">
              {/* Media Header (Image / Video / Document) */}
              {effectiveHeaderType === 'image' && (
                <div className="p-1 pb-0">
                  {effectiveMediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveMediaUrl}
                      alt="Cabeçalho do template"
                      className="max-h-40 w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800/70">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-[10px] font-medium">Imagem do cabeçalho</span>
                    </div>
                  )}
                </div>
              )}

              {effectiveHeaderType === 'video' && (
                <div className="p-1 pb-0">
                  <div className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl bg-zinc-900/90 text-zinc-200">
                    <Film className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Vídeo do cabeçalho</span>
                  </div>
                </div>
              )}

              {effectiveHeaderType === 'document' && (
                <div className="p-1.5 pb-0">
                  <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 text-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-200">
                    <FileText className="h-5 w-5 shrink-0 text-rose-500" />
                    <span className="truncate text-[11px] font-medium">
                      Documento anexado.pdf
                    </span>
                  </div>
                </div>
              )}

              {/* Text Header + Body + Footer */}
              <div className="px-3 pt-2 pb-1.5">
                {effectiveHeaderType === 'text' && effectiveHeaderText && (
                  <p className="mb-1 text-[12.5px] font-bold text-zinc-900 dark:text-zinc-100">
                    {effectiveHeaderText}
                  </p>
                )}

                <div className="whitespace-pre-wrap break-words text-[12px] leading-[1.42] text-zinc-800 dark:text-zinc-100">
                  {effectiveBody ? (
                    renderWhatsAppFormattedText(effectiveBody)
                  ) : (
                    <span className="italic text-zinc-400">
                      O texto da sua mensagem aparecerá aqui...
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-end justify-between gap-2">
                  {effectiveFooter ? (
                    <span className="text-[10.5px] text-zinc-400 dark:text-zinc-400">
                      {effectiveFooter}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="ml-auto shrink-0 text-[10px] text-zinc-400 dark:text-zinc-400">
                    09:41
                  </span>
                </div>
              </div>

              {/* Interactive Template Buttons */}
              {effectiveButtons.length > 0 && (
                <div className="divide-y divide-zinc-200/80 border-t border-zinc-200/80 bg-zinc-50/50 dark:divide-white/10 dark:border-white/10 dark:bg-[#202c33]">
                  {effectiveButtons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#00a884] transition-colors hover:bg-black/[0.02] dark:text-[#53bdeb]"
                    >
                      {getButtonIcon(btn.type)}
                      <span className="truncate">
                        {btn.text?.trim() || `Botão ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* iOS WhatsApp Bottom Composer Bar */}
          <div className="mt-auto border-t border-black/5 bg-[#f6f6f6]/95 px-2.5 pt-1.5 pb-2 backdrop-blur-md dark:border-white/5 dark:bg-[#1f2c34]/95">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 shrink-0 text-[#007aff] dark:text-zinc-400" />
              <div className="flex h-7 flex-1 items-center rounded-full border border-black/10 bg-white px-3 text-[11px] text-zinc-400 dark:border-white/10 dark:bg-[#2a3942]">
                Mensagem
              </div>
              <Camera className="h-4 w-4 shrink-0 text-[#007aff] dark:text-zinc-400" />
              <Mic className="h-4 w-4 shrink-0 text-[#007aff] dark:text-zinc-400" />
            </div>
            {/* Home Indicator */}
            <div className="mx-auto mt-2 h-1 w-28 rounded-full bg-zinc-900/30 dark:bg-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
