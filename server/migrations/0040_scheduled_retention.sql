-- Retention: pg_cron cleanups (scheduled in database/pg_cron_setup.sql) and the
-- inventory that lets the server delete Cloudinary files nothing uses anymore.

CREATE FUNCTION public.cleanup_old_user_activity()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM user_activity WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

CREATE FUNCTION public.cleanup_old_security_events()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM security_events WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- An account whose confirmation link expired unused (EMAIL_VERIFY_TTL in the
-- server config) can never be verified. It never signed in, so it owns no
-- groups or content. Links and reset codes are keyed by email, not user id,
-- and go with it.
CREATE FUNCTION public.cleanup_unverified_users()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    WITH deleted_users AS (
        DELETE FROM users
        WHERE NOT email_verified AND created_at < now() - interval '2 days'
        RETURNING email
    ),
    deleted_verifications AS (
        DELETE FROM verifications WHERE email IN (SELECT email FROM deleted_users)
    ),
    deleted_password_resets AS (
        DELETE FROM password_resets WHERE email IN (SELECT email FROM deleted_users)
    )
    SELECT count(*) INTO deleted_count FROM deleted_users;

    RETURN deleted_count;
END;
$$;

-- Codes to reset or set a password are valid for 30 minutes (the server's
-- PASSWORD_RESET_CODE_TTL); used or not, an expired code is worthless.
CREATE FUNCTION public.cleanup_expired_password_resets()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM password_resets WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- The items' files are left to the asset sweep below.
CREATE FUNCTION public.cleanup_old_items()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM items WHERE created_at < now() - interval '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Every file this deployment let a client upload. The server records an entry
-- before it signs the upload, so no file can exist in Cloudinary that the sweep
-- does not know about, and the sweep never touches a file it did not issue.
CREATE TABLE public.uploaded_assets (
    public_id text PRIMARY KEY,
    uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_uploaded_assets_uploaded_at ON public.uploaded_assets (uploaded_at);

-- Every file an item's `images` column points at, including the previews
-- generated for office documents.
CREATE FUNCTION public.item_asset_ids(images jsonb)
    RETURNS SETOF text
    LANGUAGE sql
    IMMUTABLE
AS $$
    SELECT ids.public_id
    FROM jsonb_array_elements(
             CASE jsonb_typeof(images) WHEN 'array' THEN images ELSE '[]'::jsonb END
         ) AS image,
         LATERAL (VALUES (image->>'publicId'), (image->'metadata'->>'thumbnailId')) AS ids(public_id)
    WHERE ids.public_id IS NOT NULL
$$;

-- Everything that keeps a file alive. Group avatars are stored as delivery
-- URLs (…/upload/v123/<public_id>.<format>), so their public ID is read back
-- out of the URL.
CREATE VIEW public.referenced_assets AS
    SELECT ids.public_id
    FROM items, LATERAL item_asset_ids(items.images) AS ids(public_id)
    UNION ALL
    SELECT substring(avatar_url FROM '/upload/(?:v[0-9]+/)?(.+)\.[^./]+$')
    FROM groups
    WHERE avatar_url IS NOT NULL;

-- Files nothing references. A day's grace keeps uploads alive that are still on
-- their way into a task or group: the file goes up before the form is saved.
CREATE FUNCTION public.orphaned_assets()
    RETURNS SETOF public.uploaded_assets
    LANGUAGE sql
    STABLE
    SET search_path TO 'public'
AS $$
    SELECT uploaded_assets.*
    FROM uploaded_assets
    WHERE uploaded_at < now() - interval '1 day'
      AND NOT EXISTS (
          SELECT 1 FROM referenced_assets
          WHERE referenced_assets.public_id = uploaded_assets.public_id
      )
$$;

-- Files uploaded before this inventory existed. Only referenced ones can be
-- known; earlier orphans stay in Cloudinary.
INSERT INTO public.uploaded_assets (public_id)
SELECT DISTINCT public_id FROM public.referenced_assets WHERE public_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- When each server-side worker last completed a pass without errors.
CREATE TABLE public.worker_heartbeats (
    worker text PRIMARY KEY,
    succeeded_at timestamp with time zone NOT NULL
);

-- Rows each cleanup should already have removed, per pg_cron job name. The
-- jobs run every 6 hours, so a row past its limit by more than 12 hours has
-- survived two runs: the job is not running. The limits mirror the cleanup
-- functions (0006, 0012 and this migration) and must change with them.
--
-- The asset sweep runs every 5 minutes in the server. Its orphans have no
-- "orphaned since" time (a task deleted a minute ago frees files of any age),
-- so it counts as behind once it has not completed a pass for 30 minutes.
CREATE FUNCTION public.cleanup_job_backlog()
    RETURNS TABLE (job text, overdue bigint)
    LANGUAGE sql
    STABLE
    SET search_path TO 'public'
AS $$
    WITH cutoff AS (SELECT now() - interval '12 hours' AS at)
    SELECT backlog.job, backlog.overdue
    FROM cutoff, LATERAL (VALUES
        (1, 'cleanup-refresh-tokens', (
            SELECT count(*) FROM refresh_tokens
            WHERE expires_at < cutoff.at OR revoked_at < cutoff.at - interval '7 days'
        )),
        (2, 'cleanup-mfa-pending', (
            SELECT count(*) FROM mfa_pending_secrets WHERE expires_at < cutoff.at
        )),
        (3, 'cleanup-group-messages', (
            SELECT count(*) FROM group_messages WHERE created_at < cutoff.at - interval '7 days'
        )),
        (4, 'cleanup-group-invites', (
            SELECT count(*) FROM group_invites
            WHERE expires_at < cutoff.at - interval '30 days'
               OR used_at < cutoff.at - interval '30 days'
               OR revoked_at < cutoff.at - interval '30 days'
        )),
        (5, 'cleanup-user-activity', (
            SELECT count(*) FROM user_activity WHERE created_at < cutoff.at - interval '30 days'
        )),
        (6, 'cleanup-security-events', (
            SELECT count(*) FROM security_events WHERE created_at < cutoff.at - interval '30 days'
        )),
        (7, 'cleanup-unverified-users', (
            SELECT count(*) FROM users
            WHERE NOT email_verified AND created_at < cutoff.at - interval '2 days'
        )),
        (8, 'cleanup-password-resets', (
            SELECT count(*) FROM password_resets WHERE expires_at < cutoff.at
        )),
        (9, 'cleanup-old-items', (
            SELECT count(*) FROM items WHERE created_at < cutoff.at - interval '90 days'
        )),
        (10, 'asset-sweep', (
            SELECT CASE
                WHEN EXISTS (
                    SELECT 1 FROM worker_heartbeats
                    WHERE worker = 'asset-sweep' AND succeeded_at > now() - interval '30 minutes'
                ) THEN 0
                ELSE (SELECT count(*) FROM orphaned_assets())
            END
        ))
    ) AS backlog(position, job, overdue)
    ORDER BY backlog.position
$$;
