"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellOff, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DEFAULT_OPT_OUT_BUTTONS } from "@/lib/contacts/opt-out";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

function toList(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Account-wide list of button titles that opt a contact out of
 * broadcasts (`accounts.opt_out_buttons`, migration 040). One title per
 * line. Writes go straight to `accounts`; the `accounts_update` RLS
 * policy (017) restricts that to admins, so others see it read-only.
 */
export function OptOutButtonsSettings() {
  const supabase = createClient();
  const { accountId, canEditSettings } = useAuth();
  const t = useTranslations("Settings.optOutButtons");

  const [saved, setSaved] = useState<string>("");
  const [text, setText] = useState<string>("");
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
        const list = Array.isArray(data?.opt_out_buttons)
          ? (data.opt_out_buttons as string[])
          : DEFAULT_OPT_OUT_BUTTONS;
        const joined = list.join("\n");
        setSaved(joined);
        setText(joined);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // supabase client is stable per render tree; re-run only on account change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const dirty = toList(text).join("\n") !== toList(saved).join("\n");

  async function handleSave() {
    if (!accountId || !dirty) return;
    setSaving(true);
    const list = toList(text);
    const { error } = await supabase
      .from("accounts")
      .update({ opt_out_buttons: list })
      .eq("id", accountId);
    setSaving(false);
    if (error) {
      toast.error(t("saveFailed"));
      return;
    }
    const joined = list.join("\n");
    setSaved(joined);
    setText(joined);
    toast.success(t("saveSuccess"));
  }

  return (
    <Card className="mt-6 max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BellOff className="size-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="opt-out-buttons" className="text-muted-foreground">
            {t("label")}
          </Label>
          <textarea
            id="opt-out-buttons"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canEditSettings || loading}
            rows={4}
            className="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-xs text-muted-foreground">
            {canEditSettings ? t("hint") : t("adminOnlyHint")}
          </p>
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
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
