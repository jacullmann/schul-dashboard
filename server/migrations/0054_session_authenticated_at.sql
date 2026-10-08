-- When the user last proved who they are within a session: signing in,
-- finishing the second factor or confirming a sensitive action. Rotating the
-- refresh token carries it over unchanged, so a session never counts as freshly
-- authenticated merely because it stayed open.
ALTER TABLE public.refresh_tokens
    ADD COLUMN authenticated_at timestamp with time zone;

-- Existing sessions were authenticated when their family began.
UPDATE public.refresh_tokens AS token
SET authenticated_at = family.started_at
FROM (
    SELECT family_id, min(issued_at) AS started_at
    FROM public.refresh_tokens
    GROUP BY family_id
) AS family
WHERE token.family_id = family.family_id;

ALTER TABLE public.refresh_tokens
    ALTER COLUMN authenticated_at SET NOT NULL;
