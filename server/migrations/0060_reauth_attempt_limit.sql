-- Confirming a sensitive action with the password comes from someone who
-- already holds a session, possibly a stolen one. Wrong passwords are counted
-- per account, like second-factor codes, so that session cannot be used to
-- guess the password at the per-IP rate.
ALTER TABLE public.users
    ADD COLUMN reauth_failed_attempts integer NOT NULL DEFAULT 0
        CONSTRAINT users_reauth_failed_attempts_check CHECK (reauth_failed_attempts >= 0),
    ADD COLUMN reauth_locked_until timestamp with time zone;
