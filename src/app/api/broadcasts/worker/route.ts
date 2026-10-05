import { NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron/auth'
import { supabaseAdmin } from '@/lib/automations/admin-client'
import { sendTemplateMessage } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'
import {
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'

export const maxDuration = 60

/** Recipients taken per run. Five sends in flight keeps Meta happy. */
const BATCH = 300
const CONCURRENCY = 5
/** Stop starting new sends after this, leaving room to release claims. */
const TIME_BUDGET_MS = 45_000
/** A claim older than this is treated as abandoned and retaken. */
const CLAIM_TTL_MS = 10 * 60_000

type Admin = ReturnType<typeof supabaseAdmin>

interface QueueRow {
  id: string
  broadcast_id: string
  template_params: string[] | null
  broadcasts: {
    account_id: string
    template_name: string
    template_language: string
  }
  contacts: { phone: string }
}

/**
 * GET /api/broadcasts/worker — drains the CSV broadcast queue.
 *
 * Triggered once a minute by an external pinger (cron-job.org) with
 * `Authorization: Bearer <CRON_SECRET>`. Each run claims up to BATCH
 * pending recipients, sends them with bounded concurrency, stops before
 * the time budget, and closes any broadcast whose queue is empty.
 * Overlapping runs can't double-send: a row is only taken if it is
 * unclaimed or its claim has expired.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const admin = supabaseAdmin()
  const nowIso = new Date().toISOString()
  const staleIso = new Date(Date.now() - CLAIM_TTL_MS).toISOString()

  const { data: candidates, error: selectError } = await admin
    .from('broadcast_recipients')
    .select(
      'id, broadcast_id, template_params, broadcasts!inner(account_id, template_name, template_language, status), contacts!inner(phone)',
    )
    .eq('status', 'pending')
    .eq('broadcasts.status', 'sending')
    .or(`claimed_at.is.null,claimed_at.lt.${staleIso}`)
    .order('created_at', { ascending: true })
    .limit(BATCH)
  if (selectError) {
    console.error('[broadcast-worker] queue read failed:', selectError)
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }
  if (!candidates || candidates.length === 0) {
    await closeFinishedBroadcasts(admin)
    return NextResponse.json({ claimed: 0, sent: 0, failed: 0 })
  }

  const candidateIds = candidates.map((c) => c.id)
  const { data: claimed, error: claimError } = await admin
    .from('broadcast_recipients')
    .update({ claimed_at: nowIso })
    .in('id', candidateIds)
    .or(`claimed_at.is.null,claimed_at.lt.${staleIso}`)
    .select('id')
  if (claimError) {
    console.error('[broadcast-worker] claim failed:', claimError)
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }
  const claimedIds = new Set((claimed ?? []).map((r) => r.id))
  const rows = (candidates as unknown as QueueRow[]).filter((r) =>
    claimedIds.has(r.id),
  )

  const sendContext = new Map<
    string,
    { phoneNumberId: string; accessToken: string } | null
  >()
  const templateCache = new Map<string, unknown>()

  const processed = new Set<string>()
  let sent = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break
    const group = rows.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      group.map((row) =>
        sendOne(admin, row, sendContext, templateCache).then((ok) => ({
          id: row.id,
          ok,
        })),
      ),
    )
    for (const r of results) {
      processed.add(r.id)
      if (r.ok) sent++
      else failed++
    }
  }

  // Rows we claimed but never reached go back to the queue right away,
  // so the next run doesn't have to wait out the claim TTL.
  const unprocessed = rows.map((r) => r.id).filter((id) => !processed.has(id))
  if (unprocessed.length > 0) {
    await admin
      .from('broadcast_recipients')
      .update({ claimed_at: null })
      .in('id', unprocessed)
  }

  await closeFinishedBroadcasts(admin)

  return NextResponse.json({
    claimed: rows.length,
    sent,
    failed,
    released: unprocessed.length,
  })
}

async function sendOne(
  admin: Admin,
  row: QueueRow,
  sendContext: Map<string, { phoneNumberId: string; accessToken: string } | null>,
  templateCache: Map<string, unknown>,
): Promise<boolean> {
  const accountId = row.broadcasts.account_id

  if (!sendContext.has(accountId)) {
    const { data: config } = await admin
      .from('whatsapp_config')
      .select('phone_number_id, access_token')
      .eq('account_id', accountId)
      .maybeSingle()
    sendContext.set(
      accountId,
      config
        ? {
            phoneNumberId: config.phone_number_id,
            accessToken: decrypt(config.access_token),
          }
        : null,
    )
  }
  const ctx = sendContext.get(accountId)
  if (!ctx) {
    await markRecipient(admin, row.id, 'failed', null, 'WhatsApp not configured')
    return false
  }

  const templateKey = `${accountId}|${row.broadcasts.template_name}|${row.broadcasts.template_language}`
  if (!templateCache.has(templateKey)) {
    const { data: template } = await admin
      .from('message_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('name', row.broadcasts.template_name)
      .eq('language', row.broadcasts.template_language)
      .maybeSingle()
    templateCache.set(templateKey, template ?? null)
  }
  const template = templateCache.get(templateKey) as
    | Parameters<typeof sendTemplateMessage>[0]['template']
    | null

  const phone = row.contacts.phone.replace(/\D/g, '')
  let messageId: string | null = null
  let lastError = 'Unknown error'

  for (const variant of phoneVariants(phone)) {
    try {
      const result = await sendTemplateMessage({
        phoneNumberId: ctx.phoneNumberId,
        accessToken: ctx.accessToken,
        to: variant,
        templateName: row.broadcasts.template_name,
        language: row.broadcasts.template_language,
        template: template ?? undefined,
        params: row.template_params ?? [],
      })
      messageId = result.messageId
      break
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
      if (!isRecipientNotAllowedError(lastError)) break
    }
  }

  if (messageId) {
    await markRecipient(admin, row.id, 'sent', messageId, null)
    return true
  }
  await markRecipient(admin, row.id, 'failed', null, lastError)
  return false
}

async function markRecipient(
  admin: Admin,
  id: string,
  status: 'sent' | 'failed',
  whatsappMessageId: string | null,
  errorMessage: string | null,
) {
  await admin
    .from('broadcast_recipients')
    .update({
      status,
      claimed_at: null,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      whatsapp_message_id: whatsappMessageId,
      error_message: errorMessage,
    })
    .eq('id', id)
}

/**
 * Close every CSV broadcast that has no pending recipients left. Status
 * follows the existing rule: `sent` if anything went out, else `failed`.
 */
async function closeFinishedBroadcasts(admin: Admin) {
  const { data: open } = await admin
    .from('broadcasts')
    .select('id')
    .eq('status', 'sending')
    .contains('audience_filter', { type: 'csv' })
  for (const b of open ?? []) {
    const { count: pendingCount } = await admin
      .from('broadcast_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('broadcast_id', b.id)
      .eq('status', 'pending')
    if (pendingCount && pendingCount > 0) continue

    const { count: sentCount } = await admin
      .from('broadcast_recipients')
      .select('id', { count: 'exact', head: true })
      .eq('broadcast_id', b.id)
      .in('status', ['sent', 'delivered', 'read', 'replied'])
    await admin
      .from('broadcasts')
      .update({
        status: (sentCount ?? 0) > 0 ? 'sent' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', b.id)
  }
}
