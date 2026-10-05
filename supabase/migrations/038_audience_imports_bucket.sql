-- ============================================================
-- 038_audience_imports_bucket.sql
--
-- Adds the `audience-imports` Supabase Storage bucket: a PRIVATE
-- place to store the CSV contact lists uploaded for broadcasts.
--
-- Unlike flow-media / chat-media (public, so Meta can fetch the URL),
-- these files hold personal data — phone numbers and names — so the
-- bucket is NOT public. Nothing is readable by an anonymous request;
-- reads go through a server-side route that issues a short-lived
-- signed URL, or through the service role.
--
-- Path convention (same account-scoped shape as the other buckets):
--   audience-imports/account-<account_id>/<timestamp>-<basename>.csv
-- Writes, reads, and deletes are allowed only to members of that
-- account, matched on the path's first segment.
--
-- Size limit 16 MB — roughly 150k+ phone rows in a CSV, which covers
-- realistic broadcast lists while matching the other buckets.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ============================================================
-- 1. audience-imports storage bucket (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audience-imports',
  'audience-imports',
  FALSE,
  16777216, -- 16 MB
  ARRAY[
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel' -- Excel's "CSV (separated by commas)" export
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 2. Storage RLS — account members only, no anonymous access
--
-- No SELECT policy for anon/public: the bucket is private, so the
-- only read path is an authenticated member of the account (or the
-- service role, which bypasses RLS). Drop-then-create keeps the
-- migration re-runnable.
-- ============================================================
DROP POLICY IF EXISTS "Members can upload audience imports" ON storage.objects;
CREATE POLICY "Members can upload audience imports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audience-imports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Members can read audience imports" ON storage.objects;
CREATE POLICY "Members can read audience imports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audience-imports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Members can delete audience imports" ON storage.objects;
CREATE POLICY "Members can delete audience imports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audience-imports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND ('account-' || p.account_id::text) = (storage.foldername(name))[1]
    )
  );
