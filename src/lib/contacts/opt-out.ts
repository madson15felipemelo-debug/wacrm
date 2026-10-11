import type { SupabaseClient } from '@supabase/supabase-js'

/** Error shown on a broadcast recipient skipped because of an opt-out. */
export const OPT_OUT_ERROR = 'Contato pediu para não receber disparos.'

/**
 * Whole-message replies that mean "stop sending me broadcasts": the
 * "Cancelar envio" template button and the usual keywords. Compared
 * after lowercasing and stripping accents/punctuation, and only as the
 * ENTIRE message — "não quero parar de pagar" must not opt anyone out.
 */
const OPT_OUT_PHRASES = new Set([
  'cancelar envio',
  'cancelar envios',
  'sair',
  'parar',
  'pare',
  'stop',
  'descadastrar',
  'nao quero receber',
  'nao quero mais receber',
  'nao quero receber mensagens',
  'nao quero mais receber mensagens',
])

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isOptOutMessage(text: string | null | undefined): boolean {
  if (!text) return false
  return OPT_OUT_PHRASES.has(normalize(text))
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
