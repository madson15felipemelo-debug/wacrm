import { NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron/auth'
import { autoCloseStaleConversations } from '@/lib/cron/sweeps'

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
 * Auth: see `isAuthorizedCron`. Also runs as part of the consolidated
 * `/api/cron/daily` sweep; kept as its own route too in case
 * something targets this URL directly.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await autoCloseStaleConversations()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result)
}
