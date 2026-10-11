import type { Conversation } from "@/types";

/**
 * Inbox queue views (Octadesk-style). Every view except "all" ignores
 * closed conversations — they are about work still to do.
 *
 *  - mine        — assigned to the current agent
 *  - unassigned  — nobody owns it yet
 *  - awaiting    — the customer sent the last message (waiting on us)
 *  - unread      — has unread customer messages
 */
export const INBOX_VIEWS = ["all", "mine", "unassigned", "awaiting", "unread"] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export function matchesView(
  conv: Conversation,
  view: InboxView,
  currentUserId: string | null,
): boolean {
  if (view === "all") return true;
  if (conv.status === "closed") return false;
  switch (view) {
    case "mine":
      return !!currentUserId && conv.assigned_agent_id === currentUserId;
    case "unassigned":
      return !conv.assigned_agent_id;
    case "awaiting":
      return conv.last_message_from === "customer";
    case "unread":
      return conv.unread_count > 0;
  }
}

/** Count of conversations per view, for the badges on the view tabs. */
export function countViews(
  conversations: Conversation[],
  currentUserId: string | null,
): Record<InboxView, number> {
  const counts = Object.fromEntries(INBOX_VIEWS.map((v) => [v, 0])) as Record<
    InboxView,
    number
  >;
  for (const conv of conversations) {
    for (const view of INBOX_VIEWS) {
      if (matchesView(conv, view, currentUserId)) counts[view] += 1;
    }
  }
  return counts;
}
