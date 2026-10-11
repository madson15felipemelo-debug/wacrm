-- ============================================================
-- 040_contact_opt_out.sql
--
-- Broadcast opt-out. `opted_out_at` is set when the contact asks to
-- stop receiving broadcasts — tapping an opt-out button ("Não quero
-- receber", "Cancelar envio") — or when an agent blocks them by
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

-- Button titles that opt a contact out, editable per account in
-- Settings → Templates. Matched ignoring case, accents and punctuation.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS opt_out_buttons TEXT[] NOT NULL
  DEFAULT ARRAY['Não quero receber', 'Cancelar envio'];
