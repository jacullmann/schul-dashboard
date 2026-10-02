-- Second-factor codes are only six digits, so wrong guesses are counted per
-- account: a per-IP limit alone lets an attacker who knows the password spread
-- guesses over many addresses. The last accepted time step makes every code
-- single-use, even within the window in which it is still valid.
ALTER TABLE public.users
    ADD COLUMN mfa_failed_attempts integer NOT NULL DEFAULT 0
        CONSTRAINT users_mfa_failed_attempts_check CHECK (mfa_failed_attempts >= 0),
    ADD COLUMN mfa_locked_until timestamp with time zone,
    ADD COLUMN mfa_last_used_step bigint;
