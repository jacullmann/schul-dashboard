-- Passkeys (WebAuthn credentials) sign a user in on their own: every passkey
-- requires user verification, so it stands in for both password and second
-- factor. The authenticator stores `users.id` as the user handle, which is how
-- a usernameless sign-in finds the account.
--
-- `credential` is webauthn-rs' serialised `Passkey`: public key, signature
-- counter and backup flags. None of it is secret, but the counter must be
-- written back after each sign-in so a cloned authenticator is detected.
CREATE TABLE public.passkeys (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    credential_id bytea NOT NULL,
    credential    jsonb NOT NULL,
    name          text NOT NULL,
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    last_used_at  timestamp with time zone,
    -- WebAuthn requires that a credential belongs to one account only.
    CONSTRAINT passkeys_credential_id_key UNIQUE (credential_id),
    CONSTRAINT passkeys_name_length CHECK (char_length(name) BETWEEN 1 AND 64)
);

CREATE INDEX idx_passkeys_user_id ON public.passkeys (user_id, created_at);

-- The server half of an unfinished registration. One per user: starting again
-- replaces it, so an abandoned dialog leaves nothing behind for long.
CREATE TABLE public.passkey_registrations (
    user_id    uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
    state      jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL
);

-- Challenges for signing in with a passkey. They are issued before anyone is
-- known, so they belong to no user; each is deleted when it is answered, which
-- makes it single-use, and expired ones are purged whenever a new one is issued.
CREATE TABLE public.passkey_challenges (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state      jsonb NOT NULL,
    expires_at timestamp with time zone NOT NULL
);

CREATE INDEX idx_passkey_challenges_expires_at ON public.passkey_challenges (expires_at);
