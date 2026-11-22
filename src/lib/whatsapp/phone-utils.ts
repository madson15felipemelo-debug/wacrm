/**
 * Sanitize phone number for Meta WhatsApp API.
 * Meta requires digits only — no + prefix, no spaces, no dashes.
 * e.g. "+370 63949836" → "37063949836"
 */
export function sanitizePhoneForMeta(phone: string): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Normalizes and validates a Brazilian phone number from a CSV cell to full Meta E.164 digits (`55` + DDD + number).
 *
 * - Rejects masked or corrupted strings containing `#`, `*`, `?`, letters, etc. (e.g. `47655##545`, `47999***99`, `N/A`)
 *   by returning `''` so they are safely skipped as invalid without breaking the import.
 * - Accepts only digits and standard phone formatting (`+`, `-`, `(`, `)`, `.`, spaces).
 * - Strips trunk leading zero (`047...` or `55047...`).
 * - Prepends `55` automatically when 10 or 11 digits (DDD + 8 or 9 digits).
 * - Requires the final normalized number to be a valid 12- or 13-digit Brazil number (`55` + DDD `[1-9][1-9]` + 8/9 digits).
 */
export function normalizeBrazilPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return ''
  const trimmed = phone.trim()
  if (!trimmed) return ''

  // Reject any cell containing masking characters (#, *, ?), letters, or unexpected symbols
  if (!/^[0-9+\-().\s]+$/.test(trimmed)) {
    return ''
  }

  let digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  // Handle trunk 0 after 55 (e.g. 5504799999999 -> 554799999999)
  if (digits.startsWith('550') && (digits.length === 13 || digits.length === 14)) {
    digits = '55' + digits.slice(3)
  }

  // Handle domestic trunk 0 (e.g. 04799999999 -> 47999999999)
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1)
  }

  // Auto-prepend Brazil DDI 55 for 10 or 11 digits (DDD + number)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`
  }

  // Final strict validation for Brazil E.164:
  // 55 + 2-digit DDD (11-99, neither digit 0) + 8 or 9 digits (first local digit 2-9)
  if (!/^55[1-9][1-9][2-9]\d{7,8}$/.test(digits)) {
    return ''
  }

  // Reject obvious dummy repeated digits like 5547999999999 where all local digits are identical?
  // Wait: 999999999 can be used in tests, only reject all-zero local part (already blocked by [2-9]).
  return digits
}

/**
 * Normalize phone number by removing all non-digit characters.
 * Used for comparing phone numbers in different formats.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Compare two phone numbers accounting for trunk prefix differences.
 * e.g. "370063949836" (with trunk 0) matches "37063949836" (without trunk 0)
 * by comparing the last 8 digits.
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const n1 = normalizePhone(phone1)
  const n2 = normalizePhone(phone2)
  if (n1 === n2) return true
  if (n1.length >= 8 && n2.length >= 8) {
    return n1.slice(-8) === n2.slice(-8)
  }
  return false
}

/**
 * Validate phone number is E.164-like format (7-15 digits starting with non-zero).
 * Accepts with or without + prefix.
 */
export function isValidE164(phone: string): boolean {
  return /^\+?[1-9]\d{6,14}$/.test(phone)
}

/**
 * Generate plausible phone number variants for retry when Meta's
 * sandbox rejects a number with error #131030 ("not in allowed list").
 *
 * Many countries use a "trunk prefix" 0 for domestic dialing that is
 * meant to be dropped in international format (e.g. Lithuanian
 * "+370 063 949 836" domestically → "+370 63 949 836" international).
 * But some sandboxes register the number with the trunk 0 included,
 * causing sends to the correct international format to fail.
 *
 * This helper yields up to 3 variants:
 *   1. The original sanitized number (first attempt)
 *   2. With a trunk 0 inserted after the country code
 *   3. With a trunk 0 removed after the country code
 *
 * Country-code lengths of 1, 2, and 3 digits are tried because we
 * don't know the user's country ahead of time.
 *
 * @param sanitized - digits-only phone number (from sanitizePhoneForMeta)
 * @returns deduplicated list of variants, original first
 */
export function phoneVariants(sanitized: string): string[] {
  if (!sanitized) return []
  const seen = new Set<string>()
  const push = (v: string) => {
    if (v && !seen.has(v)) seen.add(v)
  }

  // 1. Original
  push(sanitized)

  // 2. Insert a 0 after each plausible country-code length
  for (const ccLen of [1, 2, 3]) {
    if (sanitized.length <= ccLen) continue
    const cc = sanitized.slice(0, ccLen)
    const rest = sanitized.slice(ccLen)
    if (!rest.startsWith('0')) {
      push(cc + '0' + rest)
    }
  }

  // 3. Remove a leading 0 after each plausible country-code length
  for (const ccLen of [1, 2, 3]) {
    if (sanitized.length <= ccLen + 1) continue
    const cc = sanitized.slice(0, ccLen)
    const rest = sanitized.slice(ccLen)
    if (rest.startsWith('0')) {
      push(cc + rest.slice(1))
    }
  }

  return [...seen]
}

/**
 * Returns true when the Meta API error indicates the recipient
 * phone number isn't in the allowed list (sandbox restriction).
 * Detected via error code 131030 or the standard error text.
 */
export function isRecipientNotAllowedError(message: string): boolean {
  return /131030|not in allowed list|not in the allowed list/i.test(message)
}

/**
 * Both spellings of a Brazilian mobile number: with and without the
 * ninth digit. Meta often reports a BR sender WITHOUT the 9
 * (554791234567) while spreadsheets carry it (5547991234567), so the
 * same person can end up as two contacts. Non-BR or landline numbers
 * come back unchanged as a single-item list. Input is digits only.
 */
export function brazilMobileVariants(phone: string): string[] {
  if (!phone.startsWith('55')) return [phone]
  // 55 + DDD(2) + 9 + 8 digits → also without the 9
  if (phone.length === 13 && phone[4] === '9') {
    return [phone, phone.slice(0, 4) + phone.slice(5)]
  }
  // 55 + DDD(2) + 8-digit mobile (starts 6-9) → also with the 9
  if (phone.length === 12 && /[6-9]/.test(phone[4])) {
    return [phone, phone.slice(0, 4) + '9' + phone.slice(4)]
  }
  return [phone]
}
