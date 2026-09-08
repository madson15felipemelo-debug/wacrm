"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useTotalUnread } from "@/hooks/use-total-unread";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import {
  Bell,
  Bot,
  ChevronLeft,
  Crown,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Radio,
  Settings,
  Shield,
  User,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import type { AccountRole } from "@/lib/auth/roles";

// Per-role chip metadata used in the sidebar's account strip + the
// Members tab roster. Keeping this near both consumers in a single
// place avoids drift between the two surfaces — when a designer
// wants to recolour "agent" rows, this is the one diff.
//
// Inside the LUMA rail the chips sit on a dark surface, so they use
// translucent white/accent fills rather than the light-mode tints the
// Members roster uses.
const ROLE_CHIP: Record<
  AccountRole,
  { icon: typeof Crown; labelKey: string; className: string }
> = {
  owner: {
    icon: Crown,
    labelKey: "roleOwner",
    // Amber: scarce, immutable, "the boss" — gets visual emphasis.
    className: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  },
  admin: {
    icon: Shield,
    labelKey: "roleAdmin",
    // Primary-tinted: significant but not as scarce as owner.
    className:
      "border-primary/50 bg-primary/25 text-rail-foreground",
  },
  agent: {
    icon: UserCog,
    labelKey: "roleAgent",
    // Neutral: the operational default.
    className: "border-white/20 bg-white/10 text-rail-foreground",
  },
  viewer: {
    icon: User,
    labelKey: "roleViewer",
    // Quieter than agent — read-only role.
    className: "border-white/10 bg-white/5 text-rail-muted",
  },
};
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  /**
   * When true, the nav row renders a small "Beta" chip after the label.
   * Purely informational — doesn't affect routing or access.
   */
  beta?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/inbox", labelKey: "inbox", icon: MessageSquare },
  { href: "/notifications", labelKey: "notifications", icon: Bell },
  { href: "/contacts", labelKey: "contacts", icon: Users },
  { href: "/pipelines", labelKey: "pipelines", icon: GitBranch },
  { href: "/broadcasts", labelKey: "broadcasts", icon: Radio },
  { href: "/automations", labelKey: "automations", icon: Zap },
  { href: "/flows", labelKey: "flows", icon: Workflow, beta: true },
  { href: "/agents", labelKey: "aiAgents", icon: Bot },
];

const bottomNavItems = [
  { href: "/settings", labelKey: "settings", icon: Settings },
];

/** Matches the Tailwind `lg` breakpoint the rail's layout switches at. */
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** No viewport on the server — assume desktop, the collapsed-rail markup. */
function getDesktopServerSnapshot(): boolean {
  return true;
}

interface SidebarProps {
  /** Controlled on mobile by the Header's hamburger button. Ignored on lg+. */
  open?: boolean;
  onClose?: () => void;
  /**
   * Desktop rail state. Collapsed the rail is a 60px icon strip; expanded
   * it grows to 232px and reveals labels. Owned by the shell so the header
   * and the rail animate as one unit.
   */
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

import { useTranslations } from "next-intl";

export function Sidebar({
  open = false,
  onClose,
  expanded = false,
  onToggleExpanded,
}: SidebarProps) {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { profile, profileLoading, account, accountRole, signOut } = useAuth();
  const totalUnread = useTotalUnread();
  const unreadNotifications = useUnreadNotifications();
  // Only surface the account-name strip when it actually carries
  // information. A solo user's personal account is named after them
  // (the 017 signup trigger seeds it from `full_name`), so showing it
  // here would just duplicate the user name in the footer below. Once
  // the account is renamed or the user joins a shared account, the
  // name diverges and the strip becomes meaningful — that's the signal
  // we gate on. Wait for the profile fetch to settle first, otherwise
  // the strip flashes in once the row resolves (a layout jump).
  const showAccountStrip =
    !profileLoading &&
    !!account?.name &&
    account.name !== profile?.full_name;

  // On mobile the drawer is always fully expanded — a 60px icon strip
  // makes no sense as an overlay you deliberately opened. Read through
  // an external store so React gets the viewport during render (server
  // snapshot: desktop, matching the collapsed-rail markup) instead of
  // via a state-setting effect that would render twice on every mount.
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
  const railExpanded = isDesktop ? expanded : true;

  // Close the drawer when route changes — users opened it to navigate,
  // so once they pick a destination the drawer should get out of the way.
  useEffect(() => {
    onClose?.();
    // Only pathname drives this — onClose identity doesn't need to re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Lock body scroll and allow Escape to close while the drawer is open on
  // mobile. No-ops on desktop because the sidebar isn't positioned there.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — only exists on mobile and only when open. Clicking
          it closes the drawer. Hidden from lg+ since the sidebar is
          part of the main flex row there. */}
      <button
        type="button"
        aria-label={t("closeMenu")}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-shell/80 transition-opacity lg:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          // Mobile: fixed drawer that slides in from the left, always
          // label-expanded.
          "fixed inset-y-0 left-0 z-40 flex h-full w-[268px] shrink-0 flex-col",
          // No `will-change` here: it would permanently promote the rail
          // to its own compositing layer on desktop, where it never
          // animates at all.
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: static column inside the shell card. Width animates
          // between the icon rail and the labelled rail.
          "lg:static lg:z-0 lg:translate-x-0",
          "lg:transition-[width] lg:duration-300 lg:ease-[cubic-bezier(0.4,0,0.2,1)]",
          expanded ? "lg:w-[232px]" : "lg:w-[60px]",
          railExpanded && "luma-rail-expanded",
        )}
        aria-label="Navegação principal"
      >
        {/* Brand plate. Sits on the card surface (not the rail) exactly
            like the LUMA reference, forming the top-left corner of the
            shell. */}
        <div className="relative flex h-[60px] shrink-0 items-center justify-center gap-2 border-b border-border bg-card px-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 overflow-hidden"
            aria-label={t("title")}
          >
            <Image
              src="/brand/luma-mark.png"
              alt=""
              width={192}
              height={152}
              priority
              className="h-[34px] w-[34px] shrink-0 object-contain"
            />
            <span
              className={cn(
                "min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300",
                railExpanded
                  ? "w-auto opacity-100"
                  : "w-0 opacity-0 lg:w-0 lg:opacity-0",
              )}
            >
              <span className="block text-[15px] leading-none font-extrabold tracking-tight text-foreground">
                {t("title")}
              </span>
              <span className="luma-eyebrow mt-1 block">CRM</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation rail — the dark spine of the LUMA shell. */}
        <nav className="luma-rail relative flex flex-1 flex-col items-center gap-1.5 overflow-x-hidden overflow-y-auto py-2">
          {/* Collapse / expand handle. Desktop only — on mobile the rail
              is a drawer and always shows labels. */}
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={railExpanded ? t("collapseMenu") : t("expandMenu")}
            title={railExpanded ? t("collapseMenu") : t("expandMenu")}
            aria-expanded={railExpanded}
            className="hidden shrink-0 self-center rounded-md p-1 text-rail-muted transition-colors hover:text-rail-foreground lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                railExpanded ? "rotate-0" : "rotate-180",
              )}
            />
          </button>

          <div className="luma-rail-divider my-1 hidden lg:block" />

          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const showUnreadDot =
              item.href === "/inbox" && totalUnread > 0 && !isActive;

            // Unlike the inbox dot, the notifications count stays visible
            // even while the page is active — it reflects unread state
            // (cleared by marking notifications read), not "currently
            // viewing this section".
            const showNotificationBadge =
              item.href === "/notifications" && unreadNotifications > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.labelKey as string)}
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                className="luma-rail-item shrink-0"
              >
                <item.icon className="h-[19px] w-[19px] shrink-0" />
                <span className="luma-rail-label">
                  {t(item.labelKey as string)}
                </span>
                {item.beta && railExpanded && (
                  <span
                    aria-label={t("beta")}
                    className="ml-2 shrink-0 rounded-full border border-amber-400/40 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-amber-200"
                  >
                    {t("beta")}
                  </span>
                )}
                {showUnreadDot && (
                  <span
                    aria-label={t("unreadConversations", {
                      count: totalUnread,
                    })}
                    className={cn(
                      "relative flex h-2 w-2 shrink-0",
                      railExpanded
                        ? "ml-2"
                        : "absolute top-1.5 right-1.5",
                    )}
                  >
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                )}
                {showNotificationBadge && (
                  <span
                    aria-label={t("unreadNotifications", {
                      count: unreadNotifications,
                    })}
                    className={cn(
                      "flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
                      railExpanded
                        ? "ml-2 h-5 min-w-5 px-1 text-[10px]"
                        : "absolute top-0.5 right-0.5 h-4 min-w-4 px-1 text-[9px]",
                    )}
                  >
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Push the settings block to the bottom of the rail. */}
          <div className="flex-1" />

          <div className="luma-rail-divider my-1" />

          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.labelKey as string)}
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                className="luma-rail-item shrink-0"
              >
                <item.icon className="h-[19px] w-[19px] shrink-0" />
                <span className="luma-rail-label">
                  {t(item.labelKey as string)}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User section — anchored to the bottom of the rail, on the rail
            surface so the dark spine runs edge to edge. */}
        <div className="luma-rail shrink-0 border-t border-rail-border px-2 pt-2 pb-2.5">
          {/* Account name display — surfaced only when the account
              name differs from the user's own name (see
              `showAccountStrip`). For a default solo account the two
              match, so we hide it to avoid duplicating the user name
              below; for renamed or shared accounts it tells the user
              which account they're acting in. */}
          {showAccountStrip && account?.name && railExpanded ? (
            <div className="mb-2 flex items-center gap-2 px-2 text-[11px] text-rail-muted">
              <UsersRound className="size-3.5 shrink-0" />
              {/* `title=` exposes the full name on hover when it
                  gets truncated (long account names + narrow
                  sidebars). Cheap a11y win. */}
              <span className="truncate" title={account.name}>
                {account.name}
              </span>
              {accountRole ? (
                // Always render the chip — owners used to be
                // invisible here, which made them indistinguishable
                // from admins at a glance. Now everyone sees their
                // role (with a colour cue) regardless of tier.
                (() => {
                  const meta = ROLE_CHIP[accountRole];
                  const Icon = meta.icon;
                  return (
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tracking-wider uppercase ${meta.className}`}
                    >
                      <Icon className="size-3" />
                      {t(meta.labelKey as string)}
                    </span>
                  );
                })()
              ) : null}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              title={profile?.full_name ?? t("defaultUser")}
              className={cn(
                "flex w-full items-center rounded-lg text-left transition-colors hover:bg-white/10 focus:bg-white/10 focus:outline-none data-popup-open:bg-white/10",
                railExpanded
                  ? "gap-3 px-2 py-2"
                  : "justify-center px-0 py-1.5",
              )}
            >
              <Avatar className="size-8 shrink-0 ring-1 ring-white/15">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.full_name ?? t("defaultAvatar")}
                  />
                ) : null}
                <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
                  {profile?.full_name?.charAt(0)?.toUpperCase() ??
                    profile?.email?.charAt(0)?.toUpperCase() ??
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "min-w-0 flex-1 overflow-hidden transition-all duration-300",
                  railExpanded ? "w-auto opacity-100" : "hidden w-0 opacity-0",
                )}
              >
                <p className="truncate text-[13px] font-medium text-rail-foreground">
                  {profile?.full_name ?? t("defaultUser")}
                </p>
                <p className="truncate text-[11px] text-rail-muted">
                  {profile?.email ?? ""}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={6}
              className="min-w-56 bg-popover text-popover-foreground shadow-pop ring-border"
            >
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=profile"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <User className="size-4" />
                {t("menuProfile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href="/settings?tab=whatsapp"
                    onClick={onClose}
                    className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
                  />
                }
              >
                <Settings className="size-4" />
                {t("menuSettings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={signOut}
                className="text-popover-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <LogOut className="size-4" />
                {t("menuSignOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
