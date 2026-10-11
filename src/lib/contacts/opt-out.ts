import type { SupabaseClient } from '@supabase/supabase-js'

/** Error shown on a broadcast recipient skipped because of an opt-out. */
export const OPT_OUT_ERROR = 'Contato pediu para não receber disparos.'

/**
 * Button titles that mean "stop sending me broadcasts" when the account
 * hasn't customised them (Settings → Templates; `accounts.opt_out_buttons`,
 * migration 040). Only a BUTTON TAP counts — the webhook checks that —
 * so typed text never opts anyone out, and "sair" stays a flow word.
 */
export const DEFAULT_OPT_OUT_BUTTONS = ['Não quero receber', 'Cancelar envio']

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Is this tapped button title one of the account's opt-out buttons?
 * Ignores case, accents, punctuation and extra spaces.
 */
export function isOptOutButton(
  text: string | null | undefined,
  buttons: string[] = DEFAULT_OPT_OUT_BUTTONS,
): boolean {
  if (!text) return false
  const tapped = normalize(text)
  return tapped !== '' && buttons.some((b) => normalize(b) === tapped)
}

/** The account's opt-out button titles, or the defaults if unset. */
export async function loadOptOutButtons(
  db: SupabaseClient,
  accountId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from('accounts')
    .select('opt_out_buttons')
    .eq('id', accountId)
    .maybeSingle()
  if (error || !Array.isArray(data?.opt_out_buttons)) return DEFAULT_OPT_OUT_BUTTONS
  return data.opt_out_buttons as string[]
}

/**
 * Of the given digits-only phones, return those whose contact in this
 * account has opted out. Chunked so a 5k CSV stays under URL limits.
 */
export async function findOptedOutPhones(
  db: SupabaseClient,
  accountId: string,
  phones: string[],
): Promise<Set<string>> {
  const optedOut = new Set<string>()
  const CHUNK = 500
  for (let i = 0; i < phones.length; i += CHUNK) {
    const { data, error } = await db
      .from('contacts')
      .select('phone_normalized')
      .eq('account_id', accountId)
      .not('opted_out_at', 'is', null)
      .in('phone_normalized', phones.slice(i, i + CHUNK))
    if (error) throw error
    for (const row of data ?? []) optedOut.add(row.phone_normalized as string)
  }
  return optedOut
}
