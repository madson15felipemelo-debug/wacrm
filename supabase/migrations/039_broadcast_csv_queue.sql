-- ============================================================
-- 039_broadcast_csv_queue.sql
--
-- Supports large CSV broadcasts sent by a server-side queue:
--
--   * template_params — the body variables for each recipient, taken
--     from the uploaded CSV columns ({{1}} = first non-phone column...).
--     Stored per recipient so the worker can send without the browser.
--
--   * claimed_at — set when the worker takes a pending row, so an
--     overlapping run (a slow ping) never sends the same row twice.
--     A claim older than 10 minutes is considered abandoned and can be
--     picked up again.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS template_params TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE broadcast_recipients
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_queue
  ON broadcast_recipients (created_at)
  WHERE status = 'pending';
