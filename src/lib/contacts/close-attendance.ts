import type { SupabaseClient } from '@supabase/supabase-js'

export const CLOSE_WORD_PREFIX = '__close_word__:'
export const CLOSE_MSG_PREFIX = '__close_msg__:'
export const VIEW_MODE_PREFIX = '__view_mode__:'

export type CrmAccountViewMode = 'both' | 'collection' | 'sales'

/**
 * Default words/phrases that finalize the attendance when typed or tapped
 * by the customer/debtor. Matched ignoring case, accents, and punctuation.
 */
export const DEFAULT_CLOSE_ATTENDANCE_WORDS = [
  'Sair',
  'Finalizar atendimento',
  'Encerrar atendimento',
  'Finalizar',
  'Encerrar',
]

export const DEFAULT_CLOSE_ATTENDANCE_MESSAGE =
  'Seu atendimento foi finalizado. Caso precise de ajuda novamente, basta nos enviar uma mensagem!'

export interface CloseAttendanceConfig {
  words: string[]
  closeMessage: string
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Checks whether the customer's inbound message (typed text or tapped button)
 * matches one of the configured attendance-closing words/phrases.
 */
export function isCloseAttendanceMessage(
  text: string | null | undefined,
  words: string[] = DEFAULT_CLOSE_ATTENDANCE_WORDS,
): boolean {
  if (!text) return false
  const normalizedInbound = normalize(text)
  if (!normalizedInbound) return false
  return words.some((w) => {
    const target = normalize(w)
    return target !== '' && target === normalizedInbound
  })
}

/**
 * Parses `accounts.opt_out_buttons` array into its two logical parts:
 * - `optOutButtons`: normal broadcast opt-out button titles
 * - `closeConfig`: attendance-closing words and closing auto-reply message
 */
export function unpackAccountMessagingLists(raw: unknown): {
  optOutButtons: string[] | null
  closeConfig: CloseAttendanceConfig
  viewMode: CrmAccountViewMode
} {
  if (!Array.isArray(raw)) {
    return {
      optOutButtons: null,
      closeConfig: {
        words: DEFAULT_CLOSE_ATTENDANCE_WORDS,
        closeMessage: DEFAULT_CLOSE_ATTENDANCE_MESSAGE,
      },
      viewMode: 'both',
    }
  }

  const optOutButtons: string[] = []
  const closeWords: string[] = []
  let hasCustomCloseWords = false
  let closeMessage = DEFAULT_CLOSE_ATTENDANCE_MESSAGE
  let viewMode: CrmAccountViewMode = 'both'

  for (const item of raw) {
    if (typeof item !== 'string') continue
    if (item.startsWith(CLOSE_WORD_PREFIX)) {
      hasCustomCloseWords = true
      const word = item.slice(CLOSE_WORD_PREFIX.length).trim()
      if (word) closeWords.push(word)
    } else if (item.startsWith(CLOSE_MSG_PREFIX)) {
      closeMessage = item.slice(CLOSE_MSG_PREFIX.length)
    } else if (item.startsWith(VIEW_MODE_PREFIX)) {
      const val = item.slice(VIEW_MODE_PREFIX.length).trim()
      if (val === 'collection' || val === 'sales' || val === 'both') {
        viewMode = val
      }
    } else {
      optOutButtons.push(item)
    }
  }

  return {
    optOutButtons,
    closeConfig: {
      words: hasCustomCloseWords ? closeWords : DEFAULT_CLOSE_ATTENDANCE_WORDS,
      closeMessage,
    },
    viewMode,
  }
}

/**
 * Packs `optOutButtons`, `closeConfig`, and `viewMode` back into the single
 * `TEXT[]` array stored on `accounts.opt_out_buttons`.
 */
export function packAccountMessagingLists(
  optOutButtons: string[],
  closeConfig: CloseAttendanceConfig,
  viewMode: CrmAccountViewMode = 'both',
): string[] {
  const cleanOptOut = optOutButtons
    .map((b) => b.trim())
    .filter(
      (b) =>
        b &&
        !b.startsWith('__close_') &&
        !b.startsWith(VIEW_MODE_PREFIX),
    )
  const encodedWords = closeConfig.words
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => `${CLOSE_WORD_PREFIX}${w}`)
  const encodedMsg = `${CLOSE_MSG_PREFIX}${closeConfig.closeMessage ?? ''}`
  const encodedViewMode = `${VIEW_MODE_PREFIX}${viewMode}`

  return [...cleanOptOut, ...encodedWords, encodedMsg, encodedViewMode]
}

export async function loadCloseAttendanceConfig(
  db: SupabaseClient,
  accountId: string,
): Promise<CloseAttendanceConfig> {
  const { data, error } = await db
    .from('accounts')
    .select('opt_out_buttons')
    .eq('id', accountId)
    .maybeSingle()

  if (error || !data) {
    return {
      words: DEFAULT_CLOSE_ATTENDANCE_WORDS,
      closeMessage: DEFAULT_CLOSE_ATTENDANCE_MESSAGE,
    }
  }

  return unpackAccountMessagingLists(data.opt_out_buttons).closeConfig
}

