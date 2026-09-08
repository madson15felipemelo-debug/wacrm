"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { MessageSquare, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
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
              Enviamos um link de redefinição de senha para{" "}
              <span className="text-foreground">{email}</span>. Confira sua caixa
              de entrada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
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
            <MessageSquare className="h-[18px] w-[18px] text-primary" />
          </div>
          <CardTitle className="text-xl text-foreground">Redefinir senha</CardTitle>
          <CardDescription className="text-muted-foreground">
            Informe seu e-mail que enviamos um link de redefinição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

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

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>

          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
