-- Email codes double as the record of how many codes an address received:
-- the server issues an address at most a handful per day (ISSUE_LIMITS in
-- server/src/auth/email_code.rs). They therefore stay for a day instead of
-- going as soon as they expire; past its 30 minutes a code is worthless.
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM password_resets WHERE created_at < now() - interval '1 day';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Codes are looked up by address, newest first, both to redeem the latest one
-- and to count the recent ones. No query looks one up by its value.
DROP INDEX public.idx_password_resets_email_code;
CREATE INDEX idx_password_resets_email_created_at
    ON public.password_resets (email, created_at DESC);

-- Same function as in 0041, with the password reset limit following the new rule.
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
