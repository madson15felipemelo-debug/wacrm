'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  formatMessagingTier,
  formatPhoneStatus,
  getQualityMeta,
} from '@/components/dashboard/whatsapp-number-health-bar';
import { cn } from '@/lib/utils';

interface PhoneMeta {
  verified_name: string;
  display_phone_number: string;
  quality_rating: string;
  status?: string;
  messaging_limit_tier?: string;
  name_status: string;
  new_display_name: string | null;
  new_name_status: string | null;
}

export function WhatsAppBusinessProfileCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [requestingName, setRequestingName] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [about, setAbout] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  const [phoneMeta, setPhoneMeta] = useState<PhoneMeta | null>(null);
  const [newDisplayName, setNewDisplayName] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/profile', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return;
      }
      if (data.profile) {
        setPhotoUrl(data.profile.profile_picture_url || null);
        setAbout(data.profile.about || '');
        setDescription(data.profile.description || '');
        setAddress(data.profile.address || '');
        setEmail(data.profile.email || '');
        setWebsite(
          Array.isArray(data.profile.websites) && data.profile.websites[0]
            ? data.profile.websites[0]
            : '',
        );
      }
      if (data.phone) {
        setPhoneMeta(data.phone);
      }
    } catch (err) {
      console.error('[WhatsAppBusinessProfileCard] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      toast.error('Selecione uma imagem em formato JPG ou PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        body: formData,
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(payload.error || 'Falha ao atualizar a foto de perfil.');
        return;
      }

      if (payload.profile_picture_url) {
        setPhotoUrl(payload.profile_picture_url);
      } else {
        await loadProfile();
      }
      toast.success('Foto de perfil do WhatsApp atualizada com sucesso!');
    } catch (err) {
      console.error('[WhatsAppBusinessProfileCard] photo upload error:', err);
      toast.error('Não foi possível enviar a foto para a Meta.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          about,
          description,
          address,
          email,
          website,
        }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(payload.error || 'Falha ao salvar perfil do WhatsApp.');
        return;
      }

      toast.success('Perfil comercial do WhatsApp atualizado!');
    } catch (err) {
      console.error('[WhatsAppBusinessProfileCard] save error:', err);
      toast.error('Erro de conexão ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRequestDisplayName() {
    const trimmed = newDisplayName.trim();
    if (!trimmed || trimmed.length < 3) {
      toast.error('Digite o novo nome de apresentação (mínimo 3 caracteres).');
      return;
    }

    setRequestingName(true);
    try {
      const res = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_display_name',
          newDisplayName: trimmed,
        }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          payload.error ||
            'A Meta não permitiu solicitar a troca de nome neste momento.',
        );
        return;
      }

      toast.success(
        'Solicitação de novo nome enviada para análise da Meta!',
      );
      setNewDisplayName('');
      await loadProfile();
    } catch (err) {
      console.error('[WhatsAppBusinessProfileCard] name request error:', err);
      toast.error('Erro ao enviar solicitação para a Meta.');
    } finally {
      setRequestingName(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-foreground text-base">
            Perfil Público do WhatsApp Business
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Altere a foto de perfil, recado, descrição e solicite troca do nome
            de apresentação diretamente pela API da Meta, sem precisar abrir a
            BM.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadProfile()}
          disabled={loading}
          className="shrink-0 border-border text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Foto de Perfil + Número atual */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
              <Avatar className="size-20 shrink-0 ring-2 ring-primary/20">
                {photoUrl ? (
                  <AvatarImage src={photoUrl} alt="Foto do WhatsApp" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {(phoneMeta?.verified_name || 'WA').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-foreground">
                    {phoneMeta?.verified_name || 'Número Conectado'}
                  </span>
                  {phoneMeta?.name_status && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[11px]"
                    >
                      <CheckCircle2 className="mr-1 size-3" />
                      {phoneMeta.name_status}
                    </Badge>
                  )}
                </div>
                {phoneMeta?.display_phone_number && (
                  <p className="text-xs font-mono text-muted-foreground">
                    {phoneMeta.display_phone_number}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG ou PNG até 5 MB (recomendado imagem quadrada de 640×640 px).
                </p>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Enviando foto...
                    </>
                  ) : (
                    <>
                      <Camera className="size-4" />
                      Trocar foto de perfil
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Acompanhamento de Saúde e Status do Número */}
            {phoneMeta && (() => {
              const quality = getQualityMeta(phoneMeta.quality_rating);
              const statusInfo = formatPhoneStatus(phoneMeta.status);
              const tierLabel = formatMessagingTier(phoneMeta.messaging_limit_tier);
              const QualityIcon = quality.icon;

              return (
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Saúde do Número (Baixa / Média / Boa) */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Saúde do Número
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                          quality.badgeClass,
                        )}
                      >
                        <QualityIcon className="size-3" />
                        {quality.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-background/80 p-1 border border-border/60 text-center text-[11px]">
                      <span
                        className={cn(
                          'rounded py-1 font-medium transition-colors',
                          quality.level === 'low'
                            ? 'bg-red-500 text-white font-semibold'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        Baixa
                      </span>
                      <span
                        className={cn(
                          'rounded py-1 font-medium transition-colors',
                          quality.level === 'medium'
                            ? 'bg-amber-500 text-white font-semibold'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        Média
                      </span>
                      <span
                        className={cn(
                          'rounded py-1 font-medium transition-colors',
                          quality.level === 'good'
                            ? 'bg-emerald-500 text-white font-semibold'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        Boa
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {quality.description}
                    </p>
                  </div>

                  {/* Status da Linha */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Status da Linha
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                          statusInfo.className,
                        )}
                      >
                        <span
                          className={cn(
                            'size-1.5 rounded-full',
                            statusInfo.tone === 'ok'
                              ? 'bg-emerald-500'
                              : statusInfo.tone === 'warn'
                                ? 'bg-amber-500'
                                : 'bg-red-500',
                          )}
                        />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Estado operacional do número na Cloud API da Meta.
                    </p>
                  </div>

                  {/* Limite de Disparos */}
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Capacidade de Envio
                      </span>
                      <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                        {tierLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Limite diário de conversas iniciadas pela empresa em 24h.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Nome de Apresentação */}
            <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Nome de apresentação no WhatsApp
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Nome atual aprovado:{' '}
                    <strong className="text-foreground">
                      {phoneMeta?.verified_name || '—'}
                    </strong>
                  </p>
                </div>
                {phoneMeta?.new_display_name && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs"
                  >
                    <Clock className="mr-1 size-3" />
                    Novo nome em análise: {phoneMeta.new_display_name} (
                    {phoneMeta.new_name_status || 'PENDING'})
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Digite o novo nome de apresentação..."
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="bg-muted border-border text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestDisplayName}
                  disabled={requestingName || !newDisplayName.trim()}
                  className="shrink-0 border-border text-foreground hover:bg-muted"
                >
                  {requestingName ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Solicitando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Solicitar troca de nome
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A troca do nome passa pela análise da Meta. Assim que for
                aprovada, basta clicar em <strong>Salvar configuração</strong>{' '}
                abaixo (com seu PIN de 6 dígitos) para aplicar o novo nome ao
                número.
              </p>
            </div>

            {/* Dados do Perfil Comercial */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="wa-about" className="text-muted-foreground">
                    Recado / Status (até 139 caracteres)
                  </Label>
                  <Input
                    id="wa-about"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    maxLength={139}
                    placeholder="Ex.: Atendimento oficial"
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label
                    htmlFor="wa-description"
                    className="text-muted-foreground"
                  >
                    Descrição da empresa (até 512 caracteres)
                  </Label>
                  <Textarea
                    id="wa-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={512}
                    rows={3}
                    placeholder="Descrição exibida quando o cliente abre o perfil do seu número no WhatsApp..."
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="wa-email" className="text-muted-foreground">
                    E-mail comercial
                  </Label>
                  <Input
                    id="wa-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={128}
                    placeholder="contato@empresa.com.br"
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="wa-website" className="text-muted-foreground">
                    Site
                  </Label>
                  <Input
                    id="wa-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.suaempresa.com.br"
                    className="bg-muted border-border text-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="wa-address" className="text-muted-foreground">
                    Endereço comercial
                  </Label>
                  <Input
                    id="wa-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={256}
                    placeholder="Rua, número, cidade - UF"
                    className="bg-muted border-border text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Salvar dados do perfil
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

