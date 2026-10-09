-- security_events becomes the security audit log, separate from user_activity:
-- sign-ins, account and second-factor changes, group access and every admin
-- action. Unlike activity it has to outlive what it describes, record attempts
-- against no known account, and stay unaltered, so it differs in three ways:
--
-- * The accounts and groups involved are plain ids without foreign keys. A
--   deleted account or group keeps its trail until the retention ends, which
--   is what tells a takeover followed by a deletion apart from a deletion.
-- * Rows are append-only: updates fail, and deletes only once the retention
--   has ended, so neither a bug nor a stolen database session can quietly
--   rewrite the trail.
-- * It is kept for 90 days, longer than activity, since attacks are often
--   noticed only weeks later.

CREATE FUNCTION public.security_events_retention()
    RETURNS interval
    LANGUAGE sql
    IMMUTABLE
AS $$ SELECT interval '90 days' $$;

UPDATE public.security_events SET metadata = '{}' WHERE metadata IS NULL;

ALTER TABLE public.security_events RENAME COLUMN event_status TO outcome;
ALTER TABLE public.security_events
    ADD COLUMN user_id uuid,
    ADD COLUMN actor_id uuid,
    ADD COLUMN tenant_id uuid,
    ADD CONSTRAINT security_events_outcome_check CHECK (outcome IN ('success', 'failure')),
    ALTER COLUMN metadata SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL;

COMMENT ON COLUMN public.security_events.user_id IS
    'The account the event is about, if known. No foreign key: the trail outlives the account.';
COMMENT ON COLUMN public.security_events.actor_id IS
    'The signed-in account that caused the event; NULL for requests without a session.';
COMMENT ON COLUMN public.security_events.tenant_id IS
    'The group the event happened in. No foreign key: the trail outlives the group.';

UPDATE public.security_events
SET event_type = 'group:created',
    actor_id = (metadata->>'createdBy')::uuid,
    tenant_id = (metadata->>'groupId')::uuid
WHERE event_type = 'group_create';

UPDATE public.security_events
SET event_type = 'group:invite_accepted',
    actor_id = (metadata->>'userId')::uuid,
    user_id = (metadata->>'userId')::uuid,
    tenant_id = (metadata->>'groupId')::uuid
WHERE event_type = 'group_invite_accept';

-- The security entries user_activity collected so far move over, so the
-- trail and the failed sign-in chart carry on without a gap.
WITH moved AS (
    DELETE FROM public.user_activity a
    USING (VALUES
        ('auth:login_failed',              'auth:sign_in',                    'failure'),
        ('auth:login:locked',              'auth:sign_in_locked',             'failure'),
        ('auth:mfa_login',                 'auth:sign_in',                    'success'),
        ('auth:passkey_login',             'auth:sign_in',                    'success'),
        ('auth:reauth',                    'auth:reauth',                     'success'),
        ('auth:reauth:locked',             'auth:reauth_locked',              'failure'),
        ('mfa:locked',                     'auth:second_factor_locked',       'failure'),
        ('mfa:activated',                  'mfa:enabled',                     'success'),
        ('mfa:deactivated',                'mfa:disabled',                    'success'),
        ('mfa:recovery_codes:regenerated', 'mfa:recovery_codes_regenerated',  'success'),
        ('passkey:registered',             'passkey:added',                   'success'),
        ('passkey:removed',                'passkey:removed',                 'success'),
        ('account:password_change',        'account:password_changed',        'success'),
        ('account:password_set',           'account:password_set',            'success'),
        ('account:password_removed',       'account:password_removed',        'success'),
        ('account:password_reset',         'account:password_reset',          'success'),
        ('account:data_export',            'account:data_exported',           'success'),
        ('group-admin:change-role',        'group:member_role_changed',       'success'),
        ('group-admin:remove-member',      'group:member_removed',            'success'),
        ('group-admin:revert-ban',         'group:member_unbanned',           'success'),
        ('group-admin:transfer-ownership', 'group:ownership_transferred',     'success'),
        ('group-admin:update-permissions', 'group:permissions_changed',       'success'),
        ('group-admin:delete-group',       'group:deleted',                   'success'),
        ('admin:delete:group',             'admin:group_deleted',             'success'),
        ('admin:delete:user',              'admin:user_deleted',              'success'),
        ('admin:ban:user',                 'admin:user_banned',               'success'),
        ('admin:unban:user',               'admin:user_unbanned',             'success'),
        ('admin:reset:mfa',                'admin:mfa_reset',                 'success'),
        ('admin:access_controls:update',   'admin:access_controls_changed',   'success'),
        ('admin:announcement:create',      'admin:announcement_created',      'success'),
        ('admin:announcement:update',      'admin:announcement_updated',      'success'),
        ('admin:announcement:delete',      'admin:announcement_deleted',      'success'),
        ('admin:report:delete',            'admin:report_deleted',            'success')
    ) AS renamed(old_type, event_type, outcome)
    WHERE a.type = renamed.old_type
    RETURNING a.user_id, a.meta, a.created_at, renamed.event_type, renamed.outcome
)
INSERT INTO public.security_events
    (event_type, outcome, user_id, actor_id, tenant_id, ip_address, metadata, created_at)
SELECT
    event_type,
    outcome,
    -- Group and admin entries were filed under whoever acted; the account
    -- they concern, if any, is the target.
    CASE
        WHEN event_type LIKE 'group:%' OR event_type LIKE 'admin:%'
            THEN COALESCE((meta->>'targetUserId')::uuid, (meta->>'newOwnerId')::uuid)
        ELSE user_id
    END,
    -- Only a success proved who was acting.
    CASE WHEN outcome = 'success' THEN user_id END,
    COALESCE((meta->>'tenantId')::uuid, (meta->>'groupId')::uuid),
    CASE WHEN pg_input_is_valid(meta->>'ip', 'inet') THEN (meta->>'ip')::inet END,
    meta - 'ip',
    created_at
FROM moved;

DROP INDEX public.idx_security_events_event_status;
DROP INDEX public.idx_security_events_event_type;
ALTER INDEX public.idx_security_events_type_status_created RENAME TO idx_security_events_type_outcome_created;

CREATE INDEX idx_security_events_user_created
    ON public.security_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_security_events_actor_created
    ON public.security_events (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

CREATE FUNCTION public.reject_security_event_change()
    RETURNS trigger
    LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'security_events is append-only; rows are removed only once their retention has ended'
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER security_events_append_only
    BEFORE UPDATE ON public.security_events
    FOR EACH STATEMENT EXECUTE FUNCTION public.reject_security_event_change();

CREATE TRIGGER security_events_retention_only_delete
    BEFORE DELETE ON public.security_events
    FOR EACH ROW
    WHEN (OLD.created_at >= now() - public.security_events_retention())
    EXECUTE FUNCTION public.reject_security_event_change();

CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
    RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO 'public'
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM security_events WHERE created_at < now() - security_events_retention();
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
            SELECT count(*) FROM security_events
            WHERE created_at < cutoff.at - security_events_retention()
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
