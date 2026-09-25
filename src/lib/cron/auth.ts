import { timingSafeEqual } from 'node:crypto'

/**
 * Shared auth check for every scheduled-sweep route. Accepts either:
 *
 * - `Authorization: Bearer <CRON_SECRET>` — Vercel's own convention:
 *   it auto-attaches this header to requests it triggers via
 *   `vercel.json`'s `crons` list, as long as a `CRON_SECRET` env var
 *   is set. Zero extra config on our side.
 * - `x-cron-secret: <AUTOMATION_CRON_SECRET>` — for an external
 *   pinger (GitHub Actions, cron-job.org, etc.) hitting a route
 *   directly, predating the Vercel-native option.
 *
 * Both compares are constant-time — these endpoints are publicly
 * reachable (protected only by the secret, not by session auth).
 */
export function isAuthorizedCron(request: Request): boolean {
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
