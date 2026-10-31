"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AuthAurora } from "@/components/auth/auth-aurora";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageSquare,
  CheckCircle,
  UsersRound,
  AlertCircle,
  ArrowRight,
  Mail,
  Loader2,
} from "lucide-react";
import { isUserAlreadyRegisteredError, translateAuthError } from "@/lib/auth/auth-errors";

// `useSearchParams` opts the component out of static prerendering
// unless wrapped in Suspense — same pattern as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}

function SignupPageInner() {
  const searchParams = useSearchParams();
  // When the user lands here from `/join/<token>` we carry the
  // invite token in the query so it survives the signup → email
  // verification → redirect round-trip. `emailRedirectTo` below
  // points back at /join/<token> so the user lands on the redeem
  // step after verifying instead of being dropped on /dashboard.
  const inviteToken = searchParams.get("invite");
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSendMagicLink = async () => {
    if (!email) return;
    setSendingMagicLink(true);
    try {
      const emailRedirectTo = inviteToken
        ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
        : `${window.location.origin}/dashboard`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (otpError) {
        toast.error(translateAuthError(otpError.message));
      } else {
        setMagicLinkSent(true);
        toast.success("Link de acesso enviado! Verifique sua caixa de entrada.");
      }
    } catch {
      toast.error("Não foi possível enviar o link de acesso.");
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAlreadyRegistered(false);

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    // If we have an invite token, point Supabase's verification
    // email back at the join page so the user can accept after
    // verifying. Without a token, Supabase uses its default
    // redirect (the app root).
    const emailRedirectTo = inviteToken
      ? `${window.location.origin}/join/${encodeURIComponent(inviteToken)}`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });

    if (error) {
      if (isUserAlreadyRegisteredError(error.message)) {
        // Tenta autenticar automaticamente caso a senha digitada coincida com a conta
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError) {
          if (inviteToken) {
            router.push(`/join/${encodeURIComponent(inviteToken)}`);
            return;
          }
          router.push("/dashboard");
          return;
        }
      }

      setIsAlreadyRegistered(isUserAlreadyRegisteredError(error.message));
      setError(translateAuthError(error.message));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="luma-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <AuthAurora />
        <Card className="luma-rise relative w-full max-w-md border-border bg-card shadow-hard">
          <CardHeader className="items-center text-center">
            <Image
            src="/brand/luma-mark.png"
            alt="LUMA"
            width={192}
            height={152}
            priority
            className="mb-1 h-14 w-14 object-contain"
          />
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
              <CheckCircle className="h-[18px] w-[18px] text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">
              Confira seu e-mail
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enviamos um link de confirmação para{" "}
              <span className="text-foreground">{email}</span>. Abra sua caixa de
              entrada e clique no link para verificar sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
            >
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Voltar para o login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="luma-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <AuthAurora />
      <Card className="luma-rise relative w-full max-w-md border-border bg-card shadow-hard">
        <CardHeader className="items-center text-center">
          <Image
            src="/brand/luma-mark.png"
            alt="LUMA"
            width={192}
            height={152}
            priority
            className="mb-1 h-14 w-14 object-contain"
          />
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">
            {inviteToken ? (
              <UsersRound className="h-[18px] w-[18px] text-primary" />
            ) : (
              <MessageSquare className="h-[18px] w-[18px] text-primary" />
            )}
          </div>
          <CardTitle className="text-xl text-foreground">
            {inviteToken ? "Criar conta e entrar no time" : "Criar conta"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {inviteToken
              ? "Confirme seu e-mail e depois aceite o convite para entrar no time."
              : "Comece a usar o LM Core, o CRM da LUMA para WhatsApp"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold text-foreground text-sm">{error}</p>
                    {isAlreadyRegistered && (
                      <div className="space-y-3 pt-2 border-t border-destructive/20 text-muted-foreground">
                        <p className="leading-relaxed">
                          {inviteToken
                            ? "Você já possui uma conta no sistema com este e-mail. Para ingressar no time, você pode entrar com sua senha ou receber um link de acesso direto."
                            : "Você já possui uma conta cadastrada com este e-mail. Faça login ou recupere sua senha se a tiver esquecido."}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Link
                            href={
                              inviteToken
                                ? `/login?invite=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(email)}`
                                : `/login?email=${encodeURIComponent(email)}`
                            }
                          >
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 cursor-pointer"
                            >
                              Entrar com senha
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>

                          {inviteToken && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSendMagicLink}
                              disabled={sendingMagicLink || magicLinkSent}
                              className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5 cursor-pointer"
                            >
                              {sendingMagicLink ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Enviando link...
                                </>
                              ) : magicLinkSent ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                  Link enviado para seu e-mail!
                                </>
                              ) : (
                                <>
                                  <Mail className="h-3.5 w-3.5" />
                                  Entrar sem senha via e-mail
                                </>
                              )}
                            </Button>
                          )}

                          <Link
                            href={`/forgot-password?email=${encodeURIComponent(email)}`}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              Esqueci minha senha
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" className="text-muted-foreground">
                Nome completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Maria Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-muted-foreground">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Pelo menos 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-muted-foreground">
                Confirme a senha
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full disabled:opacity-50"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link
              href={
                inviteToken
                  ? `/login?invite=${encodeURIComponent(inviteToken)}`
                  : "/login"
              }
              className="text-primary hover:text-primary/80"
            >
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
