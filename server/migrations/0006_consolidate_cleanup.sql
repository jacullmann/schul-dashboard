CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
deleted_count integer;
BEGIN
WITH del AS (
DELETE FROM public.refresh_tokens
WHERE expires_at < now()
   OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days')
    RETURNING 1
    )
SELECT count(*) INTO deleted_count FROM del;
RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_mfa_pending()
    RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
BEGIN
DELETE FROM public.mfa_pending_secrets WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_group_messages()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
deleted_count integer;
BEGIN

UPDATE public.group_messages
SET parent_id = NULL
WHERE parent_id IN (
    SELECT id FROM public.group_messages
    WHERE created_at < now() - interval '7 days'
    );

WITH del AS (
DELETE FROM public.group_messages
WHERE created_at < now() - interval '7 days'
    RETURNING 1
    )
SELECT count(*) INTO deleted_count FROM del;

RETURN deleted_count;
END;
$$;
