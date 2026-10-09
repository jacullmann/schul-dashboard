-- Signing in with a password needs no session, so anyone who knows an address
-- can guess at it, from as many IP addresses as they control. Wrong passwords
-- are therefore counted per account, like second-factor codes (0042) and
-- confirmations of a signed-in user (0060). The counter is separate from
-- theirs, so guesses at sign-in never lock a signed-in user out of confirming
-- an action, nor the second factor.
ALTER TABLE public.users
    ADD COLUMN password_failed_attempts integer NOT NULL DEFAULT 0
        CONSTRAINT users_password_failed_attempts_check CHECK (password_failed_attempts >= 0),
    ADD COLUMN password_locked_until timestamp with time zone;
