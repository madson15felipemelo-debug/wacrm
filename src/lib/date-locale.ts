import { enUS, ko, ptBR } from "date-fns/locale";
import type { Locale } from "date-fns";

/**
 * date-fns locale matching the app's configured language.
 *
 * next-intl localizes our own strings, but date-fns has its own locale
 * registry and defaults to en-US — which is why relative timestamps read
 * "about 2 hours ago" on an otherwise Portuguese screen. Import
 * `dateLocale` and pass it to every `format` / `formatDistanceToNow`
 * call:
 *
 *     format(date, "PP p", { locale: dateLocale })
 *
 * Resolved from the same env var `src/i18n/request.ts` reads, so the
 * two never drift apart.
 */
const LOCALES: Record<string, Locale> = {
  "pt-BR": ptBR,
  en: enUS,
  ko,
};

export const dateLocale: Locale =
  LOCALES[process.env.NEXT_PUBLIC_APP_LOCALE ?? "pt-BR"] ?? ptBR;
