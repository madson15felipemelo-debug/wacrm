"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { ConversationNote } from "@/types";

/**
 * Internal notes of one conversation (migration 042): initial load,
 * realtime INSERT/DELETE so teammates see notes live, and add/delete.
 * `resyncToken` refetches after a realtime reconnect, like messages.
 */
const NO_NOTES: ConversationNote[] = [];

export function useConversationNotes(
  conversationId: string | null,
  resyncToken = 0,
) {
  const { user, profile, accountId } = useAuth();
  // Notes are stored with the conversation they belong to, so switching
  // threads never shows the previous thread's notes while loading.
  const [state, setState] = useState<{ convId: string | null; notes: ConversationNote[] }>({
    convId: null,
    notes: [],
  });
  const notes = state.convId === conversationId ? state.notes : NO_NOTES;
  const setNotes = useCallback(
    (update: (prev: ConversationNote[]) => ConversationNote[]) =>
      setState((s) => ({
        convId: conversationId,
        notes: update(s.convId === conversationId ? s.notes : []),
      })),
    [conversationId],
  );

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    createClient()
      .from("conversation_notes")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch conversation notes:", error.message);
          return;
        }
        setState({ convId: conversationId, notes: (data as ConversationNote[]) ?? [] });
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, resyncToken]);

  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const filter = `conversation_id=eq.${conversationId}`;
    const channel = supabase
      .channel(`notes:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_notes", filter },
        (payload) => {
          const row = payload.new as ConversationNote;
          setNotes((prev) => (prev.some((n) => n.id === row.id) ? prev : [...prev, row]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "conversation_notes", filter },
        (payload) => {
          const old = payload.old as Partial<ConversationNote>;
          if (old?.id) setNotes((prev) => prev.filter((n) => n.id !== old.id));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, setNotes]);

  const addNote = useCallback(
    async (body: string): Promise<boolean> => {
      const text = body.trim();
      if (!conversationId || !accountId || !user || !text) return false;
      const { data, error } = await createClient()
        .from("conversation_notes")
        .insert({
          account_id: accountId,
          conversation_id: conversationId,
          user_id: user.id,
          author_name: profile?.full_name || user.email || null,
          body: text,
        })
        .select()
        .single();
      if (error || !data) {
        console.error("Failed to add note:", error?.message);
        return false;
      }
      const row = data as ConversationNote;
      setNotes((prev) => (prev.some((n) => n.id === row.id) ? prev : [...prev, row]));
      return true;
    },
    [conversationId, accountId, user, profile?.full_name, setNotes],
  );

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await createClient().from("conversation_notes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete note:", error.message);
      return false;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    return true;
  }, [setNotes]);

  return { notes, addNote, deleteNote };
}
