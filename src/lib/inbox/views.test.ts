import { describe, it, expect } from "vitest";
import type { Conversation } from "@/types";
import { countViews, matchesView } from "./views";

const ME = "user-me";

function conv(over: Partial<Conversation>): Conversation {
  return {
    id: Math.random().toString(36),
    user_id: "u",
    contact_id: "c",
    status: "open",
    unread_count: 0,
    created_at: "",
    updated_at: "",
    ...over,
  };
}

describe("matchesView", () => {
  it("'all' includes closed conversations; the others never do", () => {
    const closed = conv({ status: "closed", assigned_agent_id: ME, unread_count: 2, last_message_from: "customer" });
    expect(matchesView(closed, "all", ME)).toBe(true);
    for (const v of ["mine", "unassigned", "awaiting", "unread"] as const) {
      expect(matchesView(closed, v, ME)).toBe(false);
    }
  });

  it("'mine' and 'unassigned' follow the assignee", () => {
    expect(matchesView(conv({ assigned_agent_id: ME }), "mine", ME)).toBe(true);
    expect(matchesView(conv({ assigned_agent_id: "other" }), "mine", ME)).toBe(false);
    expect(matchesView(conv({}), "mine", null)).toBe(false);
    expect(matchesView(conv({}), "unassigned", ME)).toBe(true);
    expect(matchesView(conv({ assigned_agent_id: "other" }), "unassigned", ME)).toBe(false);
  });

  it("'awaiting' means the customer spoke last", () => {
    expect(matchesView(conv({ last_message_from: "customer" }), "awaiting", ME)).toBe(true);
    expect(matchesView(conv({ last_message_from: "agent" }), "awaiting", ME)).toBe(false);
    expect(matchesView(conv({ last_message_from: "bot" }), "awaiting", ME)).toBe(false);
  });
});

describe("countViews", () => {
  it("counts each conversation in every view it matches", () => {
    const counts = countViews(
      [
        conv({ assigned_agent_id: ME, last_message_from: "customer", unread_count: 1 }),
        conv({}),
        conv({ status: "closed" }),
      ],
      ME,
    );
    expect(counts).toEqual({ all: 3, mine: 1, unassigned: 1, awaiting: 1, unread: 1 });
  });
});
