-- Retention jobs run by pg_cron (scheduled in database/pg_cron_setup.sql) and
-- the queue that lets them delete item files, which live in Cloudinary and are
-- out of the database's reach.

-- Files whose last reference may be gone. The server's asset worker deletes
-- them from Cloudinary unless something still points at them. Queueing a file
-- again refreshes `queued_at`, which tells the worker that a reference it saw
-- may have disappeared since, so it must not drop the entry.
CREATE TABLE public.asset_deletion_queue (
    public_id text PRIMARY KEY,
    queued_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_deletion_queue_queued_at ON public.asset_deletion_queue (queued_at);

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

-- Statement-level triggers with transition tables see a bulk delete (a cleanup
-- job, a cascading group deletion) as one set instead of firing per row. They
-- catch every code path, so no caller can forget to release an item's files.
CREATE FUNCTION public.queue_deleted_item_assets()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO asset_deletion_queue (public_id)
    SELECT DISTINCT ids.public_id
    FROM deleted_items, LATERAL item_asset_ids(deleted_items.images) AS ids(public_id)
    ON CONFLICT (public_id) DO UPDATE SET queued_at = EXCLUDED.queued_at;

    RETURN NULL;
END;
$$;

CREATE FUNCTION public.queue_detached_item_assets()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO asset_deletion_queue (public_id)
    SELECT DISTINCT ids.public_id
    FROM old_items
    JOIN new_items USING (id),
         LATERAL item_asset_ids(old_items.images) AS ids(public_id)
    WHERE old_items.images IS DISTINCT FROM new_items.images
      AND ids.public_id NOT IN (SELECT item_asset_ids(new_items.images))
    ON CONFLICT (public_id) DO UPDATE SET queued_at = EXCLUDED.queued_at;

    RETURN NULL;
END;
$$;

CREATE TRIGGER items_queue_deleted_assets
    AFTER DELETE ON public.items
    REFERENCING OLD TABLE AS deleted_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.queue_deleted_item_assets();

-- Postgres allows neither a column list nor a second event on a trigger with
-- transition tables, hence a separate trigger that compares `images` itself.
CREATE TRIGGER items_queue_detached_assets
    AFTER UPDATE ON public.items
    REFERENCING OLD TABLE AS old_items NEW TABLE AS new_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.queue_detached_item_assets();

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

-- The items' files are queued for deletion by the trigger above.
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

-- Rows each cleanup should already have removed, per pg_cron job name. The
-- jobs run every 6 hours, so a row past its limit by more than 12 hours has
-- survived two runs: the job is not running. The limits mirror the cleanup
-- functions (0006, 0012 and this migration) and must change with them. The
-- asset worker runs every minute, so its queue gets an hour.
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
        (8, 'cleanup-old-items', (
            SELECT count(*) FROM items WHERE created_at < cutoff.at - interval '90 days'
        )),
        (9, 'asset-deletion-queue', (
            SELECT count(*) FROM asset_deletion_queue WHERE queued_at < now() - interval '1 hour'
        ))
    ) AS backlog(position, job, overdue)
    ORDER BY backlog.position
$$;
