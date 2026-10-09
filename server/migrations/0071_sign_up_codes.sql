-- A sign-up is confirmed with a six-digit code instead of a link. A code is
-- short enough to guess, so each one counts its guesses like a password reset
-- code does, and is no longer unique: only the address it was sent to and the
-- password chosen at sign-up single out the sign-up it confirms.
--
-- Sign-ups still waiting keep their rows. Their old link tokens can never
-- match a code, so confirming them takes a resent code.

ALTER TABLE public.verifications DROP CONSTRAINT verifications_token_key;
DROP INDEX public.idx_verifications_token;

ALTER TABLE public.verifications RENAME COLUMN token TO code;
ALTER TABLE public.verifications ADD COLUMN attempts integer NOT NULL DEFAULT 0;
