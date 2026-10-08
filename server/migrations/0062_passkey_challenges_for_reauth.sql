-- Confirming a sensitive action with a passkey issues a challenge for one
-- account's passkeys. The challenge records that account, so it can only be
-- answered in that account's session and never serves as a sign-in challenge.
ALTER TABLE public.passkey_challenges
    ADD COLUMN user_id uuid REFERENCES public.users (id) ON DELETE CASCADE;
