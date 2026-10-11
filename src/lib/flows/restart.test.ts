import { describe, it, expect } from "vitest";
import { isFlowRestartMessage } from "./restart";

const text = (t: string) =>
  ({ kind: "text", text: t, meta_message_id: "m" }) as const;
const tap = (title: string) =>
  ({ kind: "interactive_reply", reply_id: "x", reply_title: title, meta_message_id: "m" }) as const;

describe("isFlowRestartMessage", () => {
  it("restarts on typed SAIR / MENU / Início, any case or accent", () => {
    expect(isFlowRestartMessage(text("SAIR"))).toBe(true);
    expect(isFlowRestartMessage(text("menu"))).toBe(true);
    expect(isFlowRestartMessage(text("Início!"))).toBe(true);
    expect(isFlowRestartMessage(text("voltar ao início"))).toBe(true);
  });

  it("restarts on a tapped button titled Sair", () => {
    expect(isFlowRestartMessage(tap("Sair"))).toBe(true);
  });

  it("does not restart when the word is part of a sentence", () => {
    expect(isFlowRestartMessage(text("vou sair do trabalho e pago"))).toBe(false);
    expect(isFlowRestartMessage(tap("Quero o boleto"))).toBe(false);
  });
});
