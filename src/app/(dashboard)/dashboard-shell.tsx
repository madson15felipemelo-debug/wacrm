"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PresenceHeartbeat } from "@/components/presence/presence-heartbeat";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.
//
// Visually this is the LUMA shell: the whole product lives inside one
// rounded, elevated card floating on a neutral "desk" surface. The
// dark navigation rail is the card's left edge, the frosted header its
// top edge, and the workspace fills the rest.

/** localStorage key for the desktop rail's collapsed/expanded state. */
const RAIL_KEY = "wacrm.rail";

// The rail's collapsed/expanded state lives in a tiny module-level store
// read through `useSyncExternalStore` rather than `useState` + an effect.
// localStorage isn't available during the server render, and writing it
// into state from an effect triggers a second render pass on every mount
// (and trips react-hooks' cascading-render rule). An external store gives
// React an explicit server snapshot (collapsed) and a client snapshot it
// can read during render instead.
let railCache: boolean | null = null;
const railListeners = new Set<() => void>();

function subscribeRail(onChange: () => void) {
  railListeners.add(onChange);
  return () => {
    railListeners.delete(onChange);
  };
}

function getRailSnapshot(): boolean {
  if (railCache === null) {
    try {
      railCache = window.localStorage.getItem(RAIL_KEY) === "expanded";
    } catch {
      // Private mode / storage disabled — collapsed default is fine.
      railCache = false;
    }
  }
  return railCache;
}

/** Server render always starts collapsed — the LUMA icon rail. */
function getRailServerSnapshot(): boolean {
  return false;
}

function setRail(next: boolean) {
  railCache = next;
  try {
    window.localStorage.setItem(RAIL_KEY, next ? "expanded" : "collapsed");
  } catch {
    // Non-fatal: the state still applies for this session.
  }
  for (const listener of railListeners) listener();
}

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("Shell");

  // Sidebar drawer state — only used on mobile. On lg+ the sidebar is
  // always visible and this stays at `false` (ignored by the component).
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Desktop rail state. Defaults to collapsed (the LUMA icon strip) and
  // is remembered per browser — people who work labels-open shouldn't
  // have to re-open it on every visit.
  const railExpanded = useSyncExternalStore(
    subscribeRail,
    getRailSnapshot,
    getRailServerSnapshot,
  );
  const toggleRail = useCallback(() => {
    setRail(!getRailSnapshot());
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="luma-shell flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="luma-pulse-ring absolute inset-0 rounded-full bg-primary-soft" />
            <Image
              src="/brand/luma-mark.png"
              alt=""
              width={192}
              height={152}
              priority
              className="relative h-11 w-11 object-contain"
            />
          </div>
          <p className="luma-eyebrow">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    // Outer "desk". The padding is what makes the app read as a card
    // resting on a surface rather than filling the viewport.
    <div className="luma-shell h-screen w-full overflow-hidden p-0 sm:p-1.5">
      {/* Reports this tab's online/away presence once we know a user is
          signed in. Headless — renders nothing. */}
      <PresenceHeartbeat />
      <div className="luma-shell-card relative flex h-full w-full bg-card max-sm:rounded-none max-sm:border-0 max-sm:shadow-none">
        <Sidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          expanded={railExpanded}
          onToggleExpanded={toggleRail}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-workspace">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          {/* Thinner horizontal padding on mobile so cards have room to breathe. */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthProvider>
  );
}
