"use client";

import { useState } from "react";
import { addDays, format, isPast } from "date-fns";
import { AlarmClock, Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { dateLocale } from "@/lib/date-locale";
import { cn } from "@/lib/utils";
import type { ConversationReminder } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (remindAt: Date, comment: string) => Promise<boolean>;
}

/** "Criar lembrete" — date, time and an optional comment. */
export function ReminderDialog({ open, onOpenChange, onCreate }: ReminderDialogProps) {
  const t = useTranslations("Inbox.reminders");
  // Default: tomorrow 10:00 — the usual "cobrar amanhã" follow-up.
  const [date, setDate] = useState(() => format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const when = new Date(`${date}T${time}`);
    if (Number.isNaN(when.getTime())) {
      toast.error(t("invalidDate"));
      return;
    }
    if (when.getTime() <= Date.now()) {
      toast.error(t("pastDate"));
      return;
    }
    setSaving(true);
    const ok = await onCreate(when, comment);
    setSaving(false);
    if (!ok) {
      toast.error(t("createFailed"));
      return;
    }
    toast.success(t("created", { when: format(when, "dd/MM 'às' HH:mm") }));
    setComment("");
    onOpenChange(false);
  };

  const inputClass =
    "h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {t("explainer")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="reminder-date">{t("date")}</Label>
            <input
              id="reminder-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reminder-time">{t("time")}</Label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reminder-comment">{t("comment")}</Label>
          <textarea
            id="reminder-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t("commentPlaceholder")}
            className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={() => void handleCreate()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RemindersBarProps {
  reminders: ConversationReminder[];
  onComplete: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

/** Open reminders of this conversation, pinned above the messages. */
export function RemindersBar({ reminders, onComplete, onDelete }: RemindersBarProps) {
  const t = useTranslations("Inbox.reminders");
  if (reminders.length === 0) return null;

  return (
    <div className="space-y-1 border-b border-border bg-card px-4 py-2">
      {reminders.map((r) => {
        const when = new Date(r.remind_at);
        const overdue = isPast(when);
        return (
          <div
            key={r.id}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1 text-xs",
              overdue ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            <AlarmClock className="h-3.5 w-3.5 shrink-0" />
            <span className="shrink-0 font-medium">
              {format(when, "dd/MM HH:mm", { locale: dateLocale })}
              {overdue && ` · ${t("overdue")}`}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground">{r.comment}</span>
            <button
              onClick={() =>
                void onComplete(r.id).then((ok) => !ok && toast.error(t("updateFailed")))
              }
              title={t("markDone")}
              className="rounded p-0.5 hover:bg-background/60"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() =>
                void onDelete(r.id).then((ok) => !ok && toast.error(t("updateFailed")))
              }
              title={t("delete")}
              className="rounded p-0.5 text-muted-foreground hover:bg-background/60 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
