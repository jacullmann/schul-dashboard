-- Announcements to every user, posted by superadmins. Kept apart from the
-- group announcements so that `announcements.tenant_id` stays NOT NULL: group
-- data never has to account for rows that belong to no group.
--
-- An announcement shows from `starts_at` until `ends_at`, or until it is
-- deleted when it has no end. Expired ones are deleted by pg_cron.
CREATE TABLE public.system_announcements (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content    text NOT NULL,
    important  boolean NOT NULL DEFAULT false,
    starts_at  timestamp with time zone NOT NULL DEFAULT now(),
    ends_at    timestamp with time zone,
    created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT system_announcements_ends_after_start CHECK (ends_at > starts_at)
);

CREATE TABLE public.system_announcement_reads (
    user_id         uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    announcement_id uuid NOT NULL REFERENCES public.system_announcements (id) ON DELETE CASCADE,
    read_at         timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, announcement_id)
);

-- The primary key covers lookups per user; this one covers the cascade when an
-- announcement is deleted and the read count per announcement.
CREATE INDEX idx_system_announcement_reads_announcement_id
    ON public.system_announcement_reads (announcement_id);

CREATE FUNCTION public.cleanup_expired_system_announcements()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM system_announcements WHERE ends_at <= now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Same function as in 0050, with the new job added.
CREATE OR REPLACE FUNCTION public.cleanup_job_backlog()
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
            SELECT count(*) FROM password_resets WHERE created_at < cutoff.at - interval '1 day'
        )),
        (9, 'cleanup-old-items', (
            SELECT count(*) FROM items WHERE due_date < cutoff.at - interval '90 days'
        )),
        (10, 'cleanup-system-announcements', (
            SELECT count(*) FROM system_announcements WHERE ends_at < cutoff.at
        )),
        (11, 'asset-sweep', (
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
