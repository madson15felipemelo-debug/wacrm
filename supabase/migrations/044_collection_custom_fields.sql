-- ============================================================
-- 044_collection_custom_fields.sql
--
-- Seeds the debt-collection contact fields shown in the inbox contact
-- panel — CPF, Contrato, Credor, Valor, Vencimento — on every existing
-- account that doesn't have a field with that name yet. They are plain
-- custom fields: rename or delete them in Settings → Fields & tags.
-- A broadcast CSV column with the same name fills them automatically.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- created_at is staggered so the panel lists them in this order.
INSERT INTO custom_fields (account_id, user_id, field_name, field_type, created_at)
SELECT a.id, a.owner_user_id, f.name, 'text', NOW() + f.ord * INTERVAL '1 millisecond'
  FROM accounts a
 CROSS JOIN (VALUES
   (1, 'CPF'),
   (2, 'Contrato'),
   (3, 'Credor'),
   (4, 'Valor'),
   (5, 'Vencimento')
 ) AS f(ord, name)
 WHERE a.owner_user_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM custom_fields cf
      WHERE cf.account_id = a.id
        AND lower(cf.field_name) = lower(f.name)
   );
