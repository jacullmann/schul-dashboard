-- Preferences only hold settings the server knows the shape of. The account's
-- course personalization moved to `users.personalized` long ago, and the copy
-- under `preferences` was never read again.
ALTER TABLE public.users
    ALTER COLUMN preferences SET DEFAULT '{"theme": "system", "language": "de"}'::jsonb;

UPDATE public.users
SET preferences = preferences - 'personalized'
WHERE preferences ? 'personalized';

UPDATE public.verifications
SET preferences = preferences - 'personalized'
WHERE preferences ? 'personalized';

-- The theme used to be free text; anything the app does not offer goes, so
-- the app falls back to the device's scheme.
UPDATE public.users
SET preferences = preferences - 'theme'
WHERE preferences ? 'theme'
  AND (preferences -> 'theme') NOT IN ('"system"', '"light"', '"dark"');

UPDATE public.verifications
SET preferences = preferences - 'theme'
WHERE preferences ? 'theme'
  AND (preferences -> 'theme') NOT IN ('"system"', '"light"', '"dark"');
