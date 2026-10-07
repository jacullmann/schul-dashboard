-- A session the user ends from their own session list was recorded as
-- `admin_revoke`, indistinguishable from a ban, which hid who ended it.
ALTER TABLE public.refresh_tokens
    DROP CONSTRAINT refresh_tokens_revoked_reason_check;

ALTER TABLE public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_revoked_reason_check CHECK (
        revoked_reason = ANY (ARRAY[
            'logout', 'logout_all', 'reuse_detected', 'password_change',
            'admin_revoke', 'account_deleted', 'mfa_change', 'session_limit',
            'session_revoked'
        ])
    );
