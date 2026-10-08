-- Schedule changes are deleted 90 days after the day they apply to, like tasks
-- after their due date. Scheduled by pg_cron in database/pg_cron_setup.sql.

-- The day a change applies to: the weekday it moves the lesson to, otherwise
-- the lesson's own, within the change's week. Both count Monday as 1. The
-- change's day is stored as text, so anything but a weekday number falls back
-- to the lesson's day instead of failing the whole cleanup on a bad cast.
CREATE FUNCTION public.schedule_sub_date(week_start date, sub_day text, lesson_day integer)
    RETURNS date
    LANGUAGE sql
    IMMUTABLE
AS $$
    SELECT week_start + coalesce(
        CASE WHEN sub_day ~ '^[1-7]$' THEN sub_day::integer END,
        lesson_day
    ) - 1
$$;

CREATE FUNCTION public.cleanup_old_schedule_subs()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM schedule_subs sub
    USING schedules lesson
    WHERE lesson.id = sub.lesson_id
      AND schedule_sub_date(sub.week_start, sub.day, lesson.day) < current_date - 90;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Same function as in 0051, with the new job added.
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
