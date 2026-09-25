-- The active group lives in each session's tokens, so a fresh login has no
-- group yet. Remembering it per user lets every new session reopen the group
-- the user last worked in, whatever device they sign in from.
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS last_active_group_id uuid
        REFERENCES public.groups (id) ON DELETE SET NULL;

UPDATE public.users u
SET last_active_group_id = latest.active_group_id
FROM (
    SELECT DISTINCT ON (user_id) user_id, active_group_id
    FROM public.refresh_tokens
    WHERE active_group_id IS NOT NULL
    ORDER BY user_id, issued_at DESC
) latest
WHERE u.id = latest.user_id
  AND u.last_active_group_id IS NULL;
