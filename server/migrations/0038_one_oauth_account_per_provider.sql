-- Linking from the account settings attaches a Google account by its subject
-- rather than its email, so the schema itself has to guarantee that a user
-- holds at most one account per provider. Duplicates could only arise from
-- races before this constraint existed; the earliest link wins.
DELETE FROM public.oauth_accounts newer
USING public.oauth_accounts older
WHERE newer.user_id = older.user_id
  AND newer.provider = older.provider
  AND (newer.linked_at, newer.id) > (older.linked_at, older.id);

ALTER TABLE ONLY public.oauth_accounts
    ADD CONSTRAINT oauth_accounts_user_id_provider_key UNIQUE (user_id, provider);

-- The new unique index leads with user_id and serves every lookup this one did.
DROP INDEX IF EXISTS public.idx_oauth_accounts_user_id;
