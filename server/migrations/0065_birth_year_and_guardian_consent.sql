-- Sign-up age check. Only the birth year is kept, and only the sign-ups and
-- accounts that need a guardian's consent record when it was given.
ALTER TABLE public.users
    ADD COLUMN birth_year integer,
    ADD COLUMN guardian_consent_at timestamp with time zone,
    ADD CONSTRAINT users_birth_year_plausible
        CHECK (birth_year BETWEEN 1900 AND 2100),
    ADD CONSTRAINT users_guardian_consent_has_birth_year
        CHECK (guardian_consent_at IS NULL OR birth_year IS NOT NULL);

ALTER TABLE public.verifications
    ADD COLUMN birth_year integer,
    ADD COLUMN guardian_consent_at timestamp with time zone,
    ADD CONSTRAINT verifications_birth_year_plausible
        CHECK (birth_year BETWEEN 1900 AND 2100),
    ADD CONSTRAINT verifications_guardian_consent_has_birth_year
        CHECK (guardian_consent_at IS NULL OR birth_year IS NOT NULL);

-- Sign-ups waiting for their link have no birth year yet. Confirming one would
-- skip the age check, so they are dropped and the address signs up again.
DELETE FROM public.verifications WHERE birth_year IS NULL;

ALTER TABLE public.verifications
    ALTER COLUMN birth_year SET NOT NULL;
