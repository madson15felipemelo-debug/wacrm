"use client";

import { useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { HEARTBEAT_MS, IDLE_AFTER_MS, type StoredPresence } from "@/lib/presence";

/**
 * PresenceHeartbeat — headless. Mount ONCE per signed-in dashboard tab
 * (in the dashboard shell, below the auth gate). Reports this tab's
 * presence to the `member_presence` table via the `touch_presence` RPC
 * roughly every HEARTBEAT_MS while the tab is visible.
 *
 * When the tab is hidden (`document.hidden`), we send a single 'away'
 * beat and pause the periodic timer until the user returns, preventing
 * background RPC overload and auth-token lock contention.
 */
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
      if (typeof document !== "undefined" && document.hidden) return "away";
      if (Date.now() - lastActivityRef.current > IDLE_AFTER_MS) return "away";
      return "online";
    };

    const beat = async (forceStatus?: StoredPresence) => {
      if (cancelled) return;
      const t = Date.now();
      if (t - lastBeatAt < 2_000) return;
      lastBeatAt = t;
      const status = forceStatus ?? currentStatus();
      const { error } = await supabase.rpc("touch_presence", {
        p_status: status,
      });
      if (error && !cancelled) {
        console.error("[PresenceHeartbeat] touch_presence failed:", error.message);
      }
    };

    const activityEvents: (keyof DocumentEventMap)[] = [
      "keydown",
      "pointerdown",
    ];
    activityEvents.forEach((e) =>
      document.addEventListener(e, markActive, { passive: true }),
    );

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (wakeTimer) {
          clearTimeout(wakeTimer);
          wakeTimer = null;
        }
        void beat("away");
      } else {
        markActive();
        // Delay slightly on wake so AuthProvider finishes refreshing
        // any expired access token first without lock contention.
        if (wakeTimer) clearTimeout(wakeTimer);
        wakeTimer = setTimeout(() => {
          void beat("online");
        }, 1_500);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    void beat();
    const interval = setInterval(() => {
      // Do not spam RPC calls while the tab is hidden in the background
      if (typeof document !== "undefined" && document.hidden) return;
      void beat();
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (wakeTimer) clearTimeout(wakeTimer);
      activityEvents.forEach((e) =>
        document.removeEventListener(e, markActive),
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [accountId]);

  return null;
}
