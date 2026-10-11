-- ============================================================
-- 040_contact_opt_out.sql
--
-- Broadcast opt-out. `opted_out_at` is set when the contact asks to
-- stop receiving broadcasts — tapping a "Cancelar envio" template
-- button or typing SAIR / PARAR — or when an agent blocks them by
-- hand. Every broadcast path skips contacts where it is not null.
-- Conversations in the inbox are NOT affected: the customer can still
-- talk to the team.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_contacts_opted_out
  ON contacts (account_id)
  WHERE opted_out_at IS NOT NULL;
