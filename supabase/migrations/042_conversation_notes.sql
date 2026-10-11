-- ============================================================
-- 042_conversation_notes.sql
--
-- Internal notes inside a conversation thread. Visible only to the
-- team — never sent to WhatsApp. Kept apart from `messages` so no send,
-- AI-context or broadcast path can ever pick one up by mistake.
--
-- Idempotent — safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Display name at write time, so the note still reads well if the
  -- author later leaves the team.
  author_name TEXT,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_notes_conversation
  ON conversation_notes (conversation_id, created_at);

ALTER TABLE conversation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_notes_select ON conversation_notes;
DROP POLICY IF EXISTS conversation_notes_insert ON conversation_notes;
DROP POLICY IF EXISTS conversation_notes_delete ON conversation_notes;

CREATE POLICY conversation_notes_select ON conversation_notes FOR SELECT
  USING (is_account_member(account_id));
-- Agents+ write notes, always as themselves.
CREATE POLICY conversation_notes_insert ON conversation_notes FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent') AND user_id = auth.uid());
-- Authors delete their own notes; admins can delete any.
CREATE POLICY conversation_notes_delete ON conversation_notes FOR DELETE
  USING (user_id = auth.uid() OR is_account_member(account_id, 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_notes;
  END IF;
END $$;
