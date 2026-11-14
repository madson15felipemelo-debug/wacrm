import type { ParsedInbound } from "./types";

/**
 * Whole-message replies that make a customer inside a flow leave the
 * current step and start the flow again from its first node. Typed or
 * tapped (a button titled "Menu" / "Voltar ao início" works the same way).
 * Note: "sair" / "finalizar atendimento" are handled by close-attendance.ts
 * to finalize the conversation rather than restart the flow.
 */
const RESTART_WORDS = new Set([
  "menu",
  "inicio",
  "voltar ao inicio",
  "voltar ao menu",
  "recomecar",
  "reiniciar",
]);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isFlowRestartMessage(message: ParsedInbound): boolean {
  const text = message.kind === "text" ? message.text : message.reply_title;
  return RESTART_WORDS.has(normalize(text ?? ""));
}
