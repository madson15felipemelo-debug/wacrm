-- ============================================================
-- 041_inbox_queue_views.sql
--
-- `conversations.last_message_from` — who sent the latest message
-- ('customer' | 'agent' | 'bot'). Drives the inbox "Sem resposta" view
-- (customer is waiting for us). Kept by a trigger on `messages`, so
-- every send path (inbox, broadcasts, flows, AI, API) is covered
-- without touching application code.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_from TEXT;

CREATE OR REPLACE FUNCTION set_conversation_last_message_from()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
     SET last_message_from = NEW.sender_type
   WHERE id = NEW.conversation_id
     AND last_message_from IS DISTINCT FROM NEW.sender_type;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversation_last_message_from ON messages;
CREATE TRIGGER trg_conversation_last_message_from
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_last_message_from();

-- Backfill from each conversation's newest message.
UPDATE conversations c
   SET last_message_from = m.sender_type
  FROM (
    SELECT DISTINCT ON (conversation_id) conversation_id, sender_type
      FROM messages
     ORDER BY conversation_id, created_at DESC
  ) m
 WHERE m.conversation_id = c.id
   AND c.last_message_from IS DISTINCT FROM m.sender_type;
