"use client";

import { format } from "date-fns";
import { Lock, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ConversationNote } from "@/types";

interface NoteBubbleProps {
  note: ConversationNote;
  /** Shown only when the current user may delete it (author or admin). */
  onDelete?: () => void;
}

/**
 * Internal note in the thread — full-width, amber, with a lock so it
 * never reads as a message the customer saw.
 */
export function NoteBubble({ note, onDelete }: NoteBubbleProps) {
  const t = useTranslations("Inbox.notes");
  return (
    <div className="group mx-auto w-full max-w-[85%] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
        <Lock className="h-3 w-3" />
        <span>{t("label")}</span>
        {note.author_name && (
          <span className="normal-case tracking-normal text-muted-foreground">
            · {note.author_name}
          </span>
        )}
        <span className="ml-auto normal-case tracking-normal text-muted-foreground">
          {format(new Date(note.created_at), "HH:mm")}
        </span>
        {onDelete && (
          <button
            onClick={onDelete}
            title={t("delete")}
            className="ml-1 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
        {note.body}
      </p>
    </div>
  );
}
