-- One-time codes that stand in for the authenticator app when it is lost. Only
-- a keyed hash is stored (HMAC-SHA256 with a server secret), so a database
-- leak alone does not allow the codes to be guessed offline.
CREATE TABLE public.mfa_recovery_codes (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    code_hash  bytea NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    used_at    timestamp with time zone,
    CONSTRAINT mfa_recovery_codes_user_code_key UNIQUE (user_id, code_hash)
);
