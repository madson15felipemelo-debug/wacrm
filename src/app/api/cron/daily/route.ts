import { NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron/auth'
import {
  autoCloseStaleConversations,
  drainAutomationExecutions,
  sweepFlowTimeouts,
} from '@/lib/cron/sweeps'

/**
 * Consolidated daily sweep — runs all three scheduled jobs
 * (automation Wait steps, flow timeouts, stale-conversation
 * auto-close) behind one endpoint, so a single native Vercel Cron
 * entry covers everything without exceeding the Hobby plan's 2-cron-
 * job cap. Each sweep still has its own standalone route for anyone
 * already pinging it directly.
 *
 * `Promise.allSettled` so one sweep throwing doesn't stop the others
 * from running — same isolation the separate-URL design gave before,
 * just within one request.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [automations, flows, conversations] = await Promise.allSettled([
    drainAutomationExecutions(),
    sweepFlowTimeouts(),
    autoCloseStaleConversations(),
  ])

  const summarize = (r: PromiseSettledResult<object>) =>
    r.status === 'fulfilled' ? r.value : { error: String(r.reason) }

  return NextResponse.json({
    automations: summarize(automations),
    flows: summarize(flows),
    conversations: summarize(conversations),
  })
}
