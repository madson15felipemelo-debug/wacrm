"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { HEARTBEAT_MS, IDLE_AFTER_MS, type StoredPresence } from "@/lib/presence";

// Stop sending background RPCs only after 30 minutes of total inactivity
// in a hidden tab (e.g. user went to lunch or left the tab open overnight).
// During normal work (switching tabs for a few minutes to check an ERP or
// generate a boleto), the operator stays 'online' for IDLE_AFTER_MS (5 min)
// so the distribution engine doesn't drop them from the queue!
const STOP_BACKGROUND_BEATS_AFTER_MS = 30 * 60_000;

export function PresenceHeartbeat() {
  const { accountId } = useAuth();

  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    if (!accountId) return;

    const supabase = createClient();
    let cancelled = false;
    let lastBeatAt = 0;
    let wakeTimer: ReturnType<typeof setTimeout> | null = null;
    lastActivityRef.current = Date.now();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const currentStatus = (): StoredPresence => {
      // Keep the operator 'online' for up to IDLE_AFTER_MS (5 minutes)
      // after their last interaction, even if they briefly switch to
      // another browser tab (e.g. ERP / boleto system).
      if (Date.now() - lastActivityRef.current > IDLE_AFTER_MS) return "away";
      return "online";
    };

    const beat = async () => {
      if (cancelled) return;
      const t = Date.now();
      if (t - lastBeatAt < 2_000) return;
      lastBeatAt = t;
      const { error } = await supabase.rpc("touch_presence", {
        p_status: currentStatus(),
      });
      if (error && !cancelled) {
        console.error("[PresenceHeartbeat] touch_presence failed:", error.message);
      }
    };

    // Passive listeners — markActive only writes a timestamp to a ref in RAM
    // (zero layout/network cost) and prevents operators who are reading or
    // scrolling a conversation from being marked idle after 5 minutes.
    const activityEvents: (keyof DocumentEventMap)[] = [
      "mousemove",
      "keydown",
      "pointerdown",
      "scroll",
    ];
    activityEvents.forEach((e) =>
      document.addEventListener(e, markActive, { passive: true }),
    );

    const onReturn = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        markActive();
        // Wait 1.5s on wake so AuthProvider finishes refreshing any
        // expired session token first without lock contention.
        if (wakeTimer) clearTimeout(wakeTimer);
        wakeTimer = setTimeout(() => {
          void beat();
        }, 1_500);
      }
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    void beat();
    const interval = setInterval(() => {
      const idleDuration = Date.now() - lastActivityRef.current;
      // Only pause database RPCs when the tab has been hidden AND completely
      // inactive for over 30 minutes (e.g., PC left open overnight).
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        idleDuration > STOP_BACKGROUND_BEATS_AFTER_MS
      ) {
        return;
      }
      void beat();
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (wakeTimer) clearTimeout(wakeTimer);
      activityEvents.forEach((e) =>
        document.removeEventListener(e, markActive),
      );
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [accountId]);

  return null;
}
