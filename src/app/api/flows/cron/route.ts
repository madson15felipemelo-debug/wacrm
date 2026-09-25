import { NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron/auth'
import { sweepFlowTimeouts } from '@/lib/cron/sweeps'

/**
 * Sweep abandoned active flow runs.
 *
 * Reads each active run's parent-flow `fallback_policy.on_timeout_hours`
 * to compute the staleness cutoff (default 24h), then marks any run
 * past its cutoff as `timed_out`. Writes a matching `flow_run_events`
 * row for the audit trail.
 *
 * Without this sweep, a customer who abandons a flow mid-conversation
 * keeps a row in `idx_one_active_run_per_contact` (the partial unique
 * index on `flow_runs WHERE status='active'`) forever — blocking any
 * new triggers for them. The cron is therefore not optional.
 *
 * Auth: see `isAuthorizedCron`. The endpoints (`/api/automations/cron`
 * and this one) are independent operations; we keep them on separate
 * URLs so one failing doesn't block the other. Also runs as part of
 * the consolidated `/api/cron/daily` sweep.
 *
 * Hosting: hit on a schedule. A 5-minute interval is more than enough
 * for a 24h timeout default; once per hour would also be acceptable
 * for low-volume tenants. The Hobby-plan-friendly `/api/cron/daily`
 * runs this once a day, which is coarser but zero-setup.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await sweepFlowTimeouts()
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result)
}
