-- Alter group_invites table to support tracking used/revoked invite links
ALTER TABLE public.group_invites
    ADD COLUMN used_at timestamp with time zone,
    ADD COLUMN used_by uuid,
    ADD COLUMN revoked_at timestamp with time zone,
    ADD COLUMN revoked_by uuid;

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT group_invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.group_invites
    ADD CONSTRAINT group_invites_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Redefine cleanup_expired_group_invites() to keep expired invites for 30 days
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
WHERE (expires_at < now() - interval '30 days')
   OR (used_at IS NOT NULL AND used_at < now() - interval '30 days')
   OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days')
    RETURNING 1
    )
SELECT count(*) INTO deleted_count FROM del;
RETURN deleted_count;
END;
$$;
