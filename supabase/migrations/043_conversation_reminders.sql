-- ============================================================
-- 043_conversation_reminders.sql
--
-- Follow-up reminders on a conversation ("cliente prometeu pagar dia
-- 15 — cobrar dia 16 às 10h"). When `remind_at` passes, the minute
-- cron calls fire_due_reminders(), which drops a 'reminder_due'
-- notification in the owner's bell (same table/realtime as assignment
-- notifications) and stamps `notified_at` so it fires once.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  -- Who gets notified (the agent who created it).
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  notified_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_reminders_conversation
  ON conversation_reminders (conversation_id, remind_at);
CREATE INDEX IF NOT EXISTS idx_conversation_reminders_due
  ON conversation_reminders (remind_at)
  WHERE notified_at IS NULL AND done_at IS NULL;

ALTER TABLE conversation_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_reminders_select ON conversation_reminders;
DROP POLICY IF EXISTS conversation_reminders_insert ON conversation_reminders;
DROP POLICY IF EXISTS conversation_reminders_update ON conversation_reminders;
DROP POLICY IF EXISTS conversation_reminders_delete ON conversation_reminders;

CREATE POLICY conversation_reminders_select ON conversation_reminders FOR SELECT
  USING (is_account_member(account_id));
CREATE POLICY conversation_reminders_insert ON conversation_reminders FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND user_id = auth.uid());
-- Any agent can mark a teammate's reminder done (shared inbox).
CREATE POLICY conversation_reminders_update ON conversation_reminders FOR UPDATE
  USING (is_account_member(account_id, 'agent'))
  WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY conversation_reminders_delete ON conversation_reminders FOR DELETE
  USING (user_id = auth.uid() OR is_account_member(account_id, 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_reminders;
  END IF;
END $$;

-- Allow the new notification type. The CHECK from migration 027 is
-- unnamed, so drop whichever check constraint guards `type`.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
     WHERE rel.relname = 'notifications'
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('conversation_assigned', 'reminder_due'));

-- Turn every due, un-notified, open reminder into a bell notification.
-- Called by the minute cron with the service role; returns how many fired.
CREATE OR REPLACE FUNCTION fire_due_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH due AS (
    UPDATE conversation_reminders r
       SET notified_at = NOW()
     WHERE r.notified_at IS NULL
       AND r.done_at IS NULL
       AND r.remind_at <= NOW()
    RETURNING r.*
  )
  INSERT INTO notifications (
    account_id, user_id, type, conversation_id, contact_id, title, body
  )
  SELECT
    due.account_id,
    due.user_id,
    'reminder_due',
    due.conversation_id,
    due.contact_id,
    'Lembrete: ' || COALESCE(NULLIF(ct.name, ''), ct.phone, 'conversa'),
    due.comment
  FROM due
  LEFT JOIN contacts ct ON ct.id = due.contact_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION fire_due_reminders() FROM PUBLIC, anon, authenticated;
