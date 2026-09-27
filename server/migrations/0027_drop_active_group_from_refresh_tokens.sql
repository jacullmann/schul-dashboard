-- The group a request acts on is now part of its URL, so sessions no longer
-- carry an active group. users.last_active_group_id stays as the landing page
-- after sign-in.
ALTER TABLE public.refresh_tokens
    DROP COLUMN IF EXISTS active_group_id;
