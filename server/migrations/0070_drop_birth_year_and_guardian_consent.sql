-- Sign-ups no longer declare a birth year (0065). Accepting the terms now
-- confirms being at least 18 or having the consent of a legal guardian, so no
-- age data is kept.
ALTER TABLE public.users
    DROP COLUMN birth_year,
    DROP COLUMN guardian_consent_at;

ALTER TABLE public.verifications
    DROP COLUMN birth_year,
    DROP COLUMN guardian_consent_at;
