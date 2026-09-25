// ============================================================
// Core logic for every scheduled sweep, extracted out of their route
// handlers so /api/cron/daily can run all three from one Vercel Cron
// invocation (Hobby plan caps native cron jobs at 2) while each
// original route stays callable on its own for an external pinger.
// ============================================================

import { supabaseAdmin as automationsAdmin } from '@/lib/automations/admin-client'
import { supabaseAdmin as flowsAdmin } from '@/lib/flows/admin-client'
import { supabaseAdmin as inboxAdmin } from '@/lib/automations/admin-client'
import { resumePendingExecution } from '@/lib/automations/engine'
import type { AutomationContext } from '@/lib/automations/engine'
import { resolveFallbackPolicy } from '@/lib/flows/fallback'

/** Drain due `automation_pending_executions` rows (Wait steps). */
export async function drainAutomationExecutions(): Promise<
  { processed: number } | { error: string }
> {
  const admin = automationsAdmin()
  const { data: due, error } = await admin
    .from('automation_pending_executions')
    .select('*')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .order('run_at', { ascending: true })
    .limit(50)

  if (error) return { error: error.message }
  if (!due || due.length === 0) return { processed: 0 }

  let processed = 0
  for (const row of due) {
    const { data: claim } = await admin
      .from('automation_pending_executions')
      .update({ status: 'running' })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (!claim) continue

    await resumePendingExecution({
      id: row.id as string,
      automation_id: row.automation_id as string,
      account_id: row.account_id as string,
      user_id: row.user_id as string,
      contact_id: (row.contact_id as string | null) ?? null,
      log_id: (row.log_id as string | null) ?? null,
      parent_step_id: (row.parent_step_id as string | null) ?? null,
      branch: (row.branch as 'yes' | 'no' | null) ?? null,
      next_step_position: row.next_step_position as number,
      context: (row.context as AutomationContext) ?? {},
    })
    processed++
  }

  return { processed }
}

/** Mark abandoned active flow runs `timed_out` per their fallback policy. */
export async function sweepFlowTimeouts(): Promise<
  { swept: number } | { error: string }
> {
  const admin = flowsAdmin()
  const now = new Date()

  const { data: runs, error } = await admin
    .from('flow_runs')
    .select(
      'id, flow_id, user_id, contact_id, last_advanced_at, flows ( fallback_policy )',
    )
    .eq('status', 'active')

  if (error) {
    console.error('[flows-cron] active-run scan failed:', error.message)
    return { error: error.message }
  }
  if (!runs?.length) return { swept: 0 }

  type Row = {
    id: string
    flow_id: string
    user_id: string
    contact_id: string | null
    last_advanced_at: string
    flows: { fallback_policy: unknown } | { fallback_policy: unknown }[] | null
  }

  let swept = 0
  for (const r of runs as Row[]) {
    const flowsField = Array.isArray(r.flows) ? r.flows[0] : r.flows
    const policy = resolveFallbackPolicy(flowsField?.fallback_policy ?? null)
    const lastAdvanced = new Date(r.last_advanced_at)
    const ageHours = (now.getTime() - lastAdvanced.getTime()) / (1000 * 60 * 60)
    if (ageHours < policy.on_timeout_hours) continue

    const { data: updated } = await admin
      .from('flow_runs')
      .update({
        status: 'timed_out',
        ended_at: now.toISOString(),
        end_reason: 'stale_sweep',
      })
      .eq('id', r.id)
      .eq('status', 'active')
      .select('id')

    if (Array.isArray(updated) && updated.length > 0) {
      await admin.from('flow_run_events').insert({
        flow_run_id: r.id,
        event_type: 'timeout',
        payload: {
          age_hours: Math.round(ageHours * 10) / 10,
          policy_hours: policy.on_timeout_hours,
        },
      })
      swept += 1
    }
  }

  return { swept }
}

/** Close "pending" conversations idle past INBOX_AUTO_CLOSE_DAYS (default 7). */
export async function autoCloseStaleConversations(): Promise<
  { closed: number; cutoffDays: number } | { error: string }
> {
  const days = Number(process.env.INBOX_AUTO_CLOSE_DAYS)
  const cutoffDays = Number.isFinite(days) && days > 0 ? days : 7
  const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000).toISOString()

  const admin = inboxAdmin()
  const { data, error } = await admin
    .from('conversations')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('last_message_at', cutoff)
    .select('id')

  if (error) return { error: error.message }
  return { closed: data?.length ?? 0, cutoffDays }
}
