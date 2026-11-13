"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

/**
 * Count of conversations with at least one unread inbound message for
 * the current user. Used by the sidebar to surface a dot on the
 * Inbox nav entry when the user is elsewhere in the app.
 */
export function useTotalUnread(): number {
  const [total, setTotal] = useState(0);
  const countsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const loadSnapshot = async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, unread_count")
        .gt("unread_count", 0);
      if (cancelled || error || !data) return;

      const map = new Map<string, number>();
      let sum = 0;
      for (const row of data as { id: string; unread_count: number }[]) {
        const n = row.unread_count ?? 0;
        if (n > 0) {
          map.set(row.id, n);
          sum += 1;
        }
      }
      countsRef.current = map;
      setTotal(sum);
    };

    void loadSnapshot();

    const channel = supabase
      .channel("total-unread-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const map = countsRef.current;
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Conversation>;
            if (oldRow.id) map.delete(oldRow.id);
          } else {
            const row = payload.new as Conversation;
            const n = row.unread_count ?? 0;
            if (n > 0) {
              map.set(row.id, n);
            } else {
              map.delete(row.id);
            }
          }
          setTotal(map.size);
        },
      )
      .subscribe();

    // Re-sync snapshot when returning to the tab after idle/sleep so
    // any realtime events missed while disconnected are recovered.
    const onVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void loadSnapshot();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(channel);
    };
  }, []);

  return total;
}
