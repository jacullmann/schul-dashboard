-- Sign-up age check. Only the birth year is kept, and only accounts that need
-- a guardian's consent record when it was given.
ALTER TABLE public.users
    ADD COLUMN birth_year integer,
    ADD COLUMN guardian_consent_at timestamp with time zone,
    ADD CONSTRAINT users_birth_year_plausible
        CHECK (birth_year BETWEEN 1900 AND 2100),
    ADD CONSTRAINT users_guardian_consent_has_birth_year
        CHECK (guardian_consent_at IS NULL OR birth_year IS NOT NULL);
