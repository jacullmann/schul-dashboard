-- A sign-up no longer creates an account. It waits here with the password it
-- chose until its link is opened and that same password is entered. Opening
-- the mailbox alone, or knowing the password alone, is not enough, so nobody
-- can claim or take over an address they do not control, and a second sign-up
-- for the same address no longer replaces the first one's password.

ALTER TABLE verifications
    ADD COLUMN password_hash text,
    ADD COLUMN preferences jsonb;

-- Sign-ups still waiting for confirmation keep their links.
UPDATE verifications v
SET password_hash = u.password_hash,
    preferences = u.preferences
FROM users u
WHERE u.email = v.email
  AND NOT u.email_verified
  AND u.password_hash IS NOT NULL;

DELETE FROM verifications WHERE password_hash IS NULL;

-- An unconfirmed account could never sign in, so it holds nothing to keep.
DELETE FROM users WHERE NOT email_verified;

ALTER TABLE verifications
    ALTER COLUMN password_hash SET NOT NULL,
    ALTER COLUMN preferences SET NOT NULL;

-- A sign-up expires with its link; pg_cron keeps calling this function under
-- its old name.
CREATE OR REPLACE FUNCTION public.cleanup_unverified_users()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM verifications WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

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
            SELECT count(*) FROM verifications WHERE expires_at < cutoff.at
        )),
        (8, 'cleanup-password-resets', (
            SELECT count(*) FROM password_resets WHERE created_at < cutoff.at - interval '1 day'
        )),
        (9, 'cleanup-old-items', (
            SELECT count(*) FROM items WHERE due_date < cutoff.at - interval '90 days'
        )),
        (10, 'cleanup-old-schedule-subs', (
            SELECT count(*) FROM schedule_subs sub
            JOIN schedules lesson ON lesson.id = sub.lesson_id
            WHERE schedule_sub_date(sub.week_start, sub.day, lesson.day)
                  < (cutoff.at - interval '90 days')::date
        )),
        (11, 'cleanup-system-announcements', (
            SELECT count(*) FROM system_announcements WHERE ends_at < cutoff.at
        )),
        (12, 'asset-sweep', (
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
