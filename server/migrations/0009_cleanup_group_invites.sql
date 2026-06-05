CREATE OR REPLACE FUNCTION public.cleanup_expired_group_invites()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
deleted_count integer;
BEGIN
WITH del AS (
DELETE FROM public.group_invites
WHERE expires_at < now()
    RETURNING 1
    )
SELECT count(*) INTO deleted_count FROM del;
RETURN deleted_count;
END;
$$;
