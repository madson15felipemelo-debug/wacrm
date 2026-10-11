"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { ConversationReminder } from "@/types";

const NO_REMINDERS: ConversationReminder[] = [];

function sortByTime(list: ConversationReminder[]) {
  return [...list].sort(
    (a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime(),
  );
}

/**
 * Open (not done) follow-up reminders of one conversation (migration
 * 043), live via realtime, plus create / mark done / delete. The bell
 * notification itself is created server-side by the minute cron.
 */
export function useConversationReminders(
  conversationId: string | null,
  contactId: string | null,
  resyncToken = 0,
) {
  const { user, accountId } = useAuth();
  // Keyed by conversation so switching threads never flashes old rows.
  const [state, setState] = useState<{ convId: string | null; list: ConversationReminder[] }>({
    convId: null,
    list: [],
  });
  const reminders = state.convId === conversationId ? state.list : NO_REMINDERS;
  const update = useCallback(
    (fn: (prev: ConversationReminder[]) => ConversationReminder[]) =>
      setState((s) => ({
        convId: conversationId,
        list: sortByTime(fn(s.convId === conversationId ? s.list : [])),
      })),
    [conversationId],
  );

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    createClient()
      .from("conversation_reminders")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("done_at", null)
      .order("remind_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch reminders:", error.message);
          return;
        }
        setState({ convId: conversationId, list: (data as ConversationReminder[]) ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, resyncToken]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`reminders:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_reminders",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<ConversationReminder>;
            if (old?.id) update((prev) => prev.filter((r) => r.id !== old.id));
            return;
          }
          const row = payload.new as ConversationReminder;
          update((prev) => {
            const rest = prev.filter((r) => r.id !== row.id);
            return row.done_at ? rest : [...rest, row];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, update]);

  const createReminder = useCallback(
    async (remindAt: Date, comment: string): Promise<boolean> => {
      if (!conversationId || !accountId || !user) return false;
      const { data, error } = await createClient()
        .from("conversation_reminders")
        .insert({
          account_id: accountId,
          conversation_id: conversationId,
          contact_id: contactId,
          user_id: user.id,
          remind_at: remindAt.toISOString(),
          comment: comment.trim() || null,
        })
        .select()
        .single();
      if (error || !data) {
        console.error("Failed to create reminder:", error?.message);
        return false;
      }
      const row = data as ConversationReminder;
      update((prev) => [...prev.filter((r) => r.id !== row.id), row]);
      return true;
    },
    [conversationId, contactId, accountId, user, update],
  );

  const completeReminder = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await createClient()
        .from("conversation_reminders")
        .update({ done_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        console.error("Failed to complete reminder:", error.message);
        return false;
      }
      update((prev) => prev.filter((r) => r.id !== id));
      return true;
    },
    [update],
  );

  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await createClient().from("conversation_reminders").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete reminder:", error.message);
        return false;
      }
      update((prev) => prev.filter((r) => r.id !== id));
      return true;
    },
    [update],
  );

  return { reminders, createReminder, completeReminder, deleteReminder };
}
