import { NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron/auth'
import { drainAutomationExecutions } from '@/lib/cron/sweeps'

/**
 * Drain due `automation_pending_executions` rows. Meant to be hit on
 * a schedule — see `isAuthorizedCron` for the two accepted auth
 * schemes. Also runs as part of the consolidated
 * `/api/cron/daily` sweep; kept as its own route too so an existing
 * external pinger targeting this URL keeps working.
 *
 * The claim step (status = 'running') serves as a simple lock so
 * overlapping invocations don't double-process rows. Best-effort
 * only; expensive SELECT ... FOR UPDATE is avoided in favor of a
 * two-step UPDATE-by-id.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await drainAutomationExecutions()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result)
}
