import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/automations/admin-client'

/**
 * Auto-close stale "pending" conversations.
 *
 * `pending` means an agent already replied and the thread is waiting
 * on the customer — see the auto-transition in
 * `src/lib/whatsapp/send-message.ts`. If nothing more comes in for
 * `INBOX_AUTO_CLOSE_DAYS` (default 7), the thread is stale rather than
 * actively being worked, so we mark it `closed`. This only tidies the
 * inbox list — it says nothing about whether the underlying deal (in
 * Pipelines) was actually won or lost.
 *
 * Scoped to `status = 'pending'` only: an `open` conversation nobody
 * has answered yet is never auto-closed, so an ignored lead can't
 * silently disappear from view.
 *
 * Auth: two schemes, since this can be triggered either way —
 * - Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` (Vercel's
 *   own convention: it auto-injects this header when `CRON_SECRET` is
 *   set as a project env var), checked here.
 * - `x-cron-secret: <AUTOMATION_CRON_SECRET>` for an external pinger,
 *   matching the existing automations/flows cron routes.
 * Constant-time compares — this endpoint is publicly reachable.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Number(process.env.INBOX_AUTO_CLOSE_DAYS)
  const cutoffDays = Number.isFinite(days) && days > 0 ? days : 7
  const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000).toISOString()

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('conversations')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('last_message_at', cutoff)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ closed: data?.length ?? 0, cutoffDays })
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization') ?? ''
  if (cronSecret && constantTimeEquals(authHeader, `Bearer ${cronSecret}`)) {
    return true
  }

  const automationSecret = process.env.AUTOMATION_CRON_SECRET
  const suppliedHeader = request.headers.get('x-cron-secret') ?? ''
  if (automationSecret && constantTimeEquals(suppliedHeader, automationSecret)) {
    return true
  }

  return false
}

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf)
}
