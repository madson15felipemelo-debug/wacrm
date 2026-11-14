"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_OPT_OUT_BUTTONS } from "@/lib/contacts/opt-out";
import {
  DEFAULT_CLOSE_ATTENDANCE_MESSAGE,
  DEFAULT_CLOSE_ATTENDANCE_WORDS,
  packAccountMessagingLists,
  unpackAccountMessagingLists,
} from "@/lib/contacts/close-attendance";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function toList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Account-wide configuration for customer-initiated attendance closure.
 * When a debtor/customer sends or taps any of the configured words/phrases
 * (e.g. "Sair", "Finalizar atendimento"), any active bot flow run is ended,
 * the optional closing confirmation message is sent, and the conversation
 * status is set to `resolved`.
 */
export function CloseAttendanceSettings() {
  const supabase = createClient();
  const { accountId, canEditSettings } = useAuth();

  const [savedWords, setSavedWords] = useState<string>("");
  const [wordsText, setWordsText] = useState<string>("");
  const [savedMsg, setSavedMsg] = useState<string>(DEFAULT_CLOSE_ATTENDANCE_MESSAGE);
  const [closeMsg, setCloseMsg] = useState<string>(DEFAULT_CLOSE_ATTENDANCE_MESSAGE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    supabase
      .from("accounts")
      .select("opt_out_buttons")
      .eq("id", accountId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const { closeConfig } = unpackAccountMessagingLists(data?.opt_out_buttons);
        const joined = (
          closeConfig.words.length > 0
            ? closeConfig.words
            : DEFAULT_CLOSE_ATTENDANCE_WORDS
        ).join("\n");
        setSavedWords(joined);
        setWordsText(joined);
        setSavedMsg(closeConfig.closeMessage);
        setCloseMsg(closeConfig.closeMessage);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const dirty =
    toList(wordsText).join("\n") !== toList(savedWords).join("\n") ||
    closeMsg.trim() !== savedMsg.trim();

  async function handleSave() {
    if (!accountId || !dirty) return;
    setSaving(true);
    const words = toList(wordsText);
    const trimmedMsg = closeMsg.trim();

    const { data: currentRow } = await supabase
      .from("accounts")
      .select("opt_out_buttons")
      .eq("id", accountId)
      .maybeSingle();

    const { optOutButtons } = unpackAccountMessagingLists(currentRow?.opt_out_buttons);
    const packed = packAccountMessagingLists(
      optOutButtons ?? DEFAULT_OPT_OUT_BUTTONS,
      {
        words,
        closeMessage: trimmedMsg,
      },
    );

    const { error } = await supabase
      .from("accounts")
      .update({ opt_out_buttons: packed })
      .eq("id", accountId);

    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a configuração de encerramento.");
      return;
    }

    const joined = words.join("\n");
    setSavedWords(joined);
    setWordsText(joined);
    setSavedMsg(trimmedMsg);
    setCloseMsg(trimmedMsg);
    toast.success("Configuração de finalização de atendimento salva!");
  }

  return (
    <Card className="mt-6 max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          Palavras para &quot;Finalizar atendimento&quot;
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Quando o devedor/cliente digita ou toca num botão com um destes termos, o fluxo do robô é encerrado e o atendimento é finalizado automaticamente no CRM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="close-attendance-words" className="text-muted-foreground">
            Palavras ou frases de saída (uma por linha)
          </Label>
          <textarea
            id="close-attendance-words"
            value={wordsText}
            onChange={(e) => setWordsText(e.target.value)}
            disabled={!canEditSettings || loading}
            rows={5}
            placeholder={"Sair\nFinalizar atendimento\nEncerrar atendimento"}
            className="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-xs text-muted-foreground">
            Maiúsculas, acentos e pontuação são ignorados. Funciona tanto para texto digitado quanto para clique em botão.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="close-attendance-msg" className="text-muted-foreground">
            Mensagem automática ao finalizar (deixe em branco para não enviar)
          </Label>
          <textarea
            id="close-attendance-msg"
            value={closeMsg}
            onChange={(e) => setCloseMsg(e.target.value)}
            disabled={!canEditSettings || loading}
            rows={2}
            placeholder="Ex: Seu atendimento foi finalizado. Caso precise novamente, basta enviar uma mensagem!"
            className="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {canEditSettings && (
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

