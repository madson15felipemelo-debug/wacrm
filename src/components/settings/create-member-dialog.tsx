'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  UserPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

type MemberRole = 'admin' | 'agent' | 'viewer';

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface CreatedMemberResult {
  fullName: string;
  email: string;
  password: string;
  role: MemberRole;
}

function generateRandomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const array = new Uint32Array(10);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMemberDialogProps) {
  const tRoles = useTranslations('Settings.roles');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [role, setRole] = useState<MemberRole>('agent');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatedMemberResult | null>(null);

  function reset() {
    setFullName('');
    setEmail('');
    setPassword('');
    setShowPassword(true);
    setRole('agent');
    setSubmitting(false);
    setResult(null);
  }

  function handleGeneratePassword() {
    setPassword(generateRandomPassword());
    setShowPassword(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      toast.error('Informe o nome do membro.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/account/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          password,
          role,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || 'Falha ao criar o acesso.');
        return;
      }

      setResult({
        fullName: trimmedName,
        email: trimmedEmail,
        password,
        role,
      });
      toast.success(`Acesso criado para ${trimmedName}`);
      onCreated();
    } catch (err) {
      console.error('[CreateMemberDialog] create error:', err);
      toast.error('Não foi possível conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const loginUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/login`
        : '/login';
    const text = [
      `Acesso à plataforma:`,
      `Link: ${loginUrl}`,
      `E-mail: ${result.email}`,
      `Senha: ${result.password}`,
      `Perfil: ${tRoles(result.role)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Dados de acesso copiados');
    } catch {
      toast.error('Não foi possível copiar automaticamente');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="bg-popover border-border sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Acesso criado com sucesso
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                O usuário já está ativo na equipe como{' '}
                <strong className="text-foreground">{tRoles(result.role)}</strong>{' '}
                e pode entrar imediatamente com os dados abaixo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Nome</span>
                  <span className="font-medium text-foreground">
                    {result.fullName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">E-mail</span>
                  <span className="font-mono font-medium text-foreground">
                    {result.email}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Senha</span>
                  <span className="font-mono font-medium text-foreground">
                    {result.password}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Perfil</span>
                  <span className="font-medium text-foreground">
                    {tRoles(result.role)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={copyCredentials}
                className="w-full border-border text-foreground hover:bg-muted"
              >
                <Copy className="size-4" />
                Copiar dados de acesso
              </Button>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Concluído
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-popover-foreground">
                <UserPlus className="size-4 text-primary" />
                Criar acesso direto
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Cadastre um novo membro diretamente na plataforma com e-mail e
                senha, sem precisar enviar link de convite.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="member-name" className="text-muted-foreground">
                  Nome completo
                </Label>
                <Input
                  id="member-name"
                  placeholder="Ex.: Ana Souza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="member-email" className="text-muted-foreground">
                  E-mail de acesso
                </Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="ana@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="member-password"
                    className="text-muted-foreground"
                  >
                    Senha inicial
                  </Label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <KeyRound className="size-3" />
                    Gerar senha
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="member-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    maxLength={128}
                    required
                    className="bg-muted border-border pr-9 text-foreground font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">
                  Perfil de permissão
                </Label>
                <Select
                  value={role}
                  onValueChange={(v) => v && setRole(v as MemberRole)}
                >
                  <SelectTrigger className="w-full bg-muted border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">{tRoles('agent')}</SelectItem>
                    <SelectItem value="viewer">
                      {tRoles('viewer')} (Apenas leitura)
                    </SelectItem>
                    <SelectItem value="admin">{tRoles('admin')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tRoles(
                    `${role}Hint` as 'adminHint' | 'agentHint' | 'viewerHint',
                  )}
                </p>
              </div>
            </div>

            <DialogFooter className="bg-popover border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar acesso'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

