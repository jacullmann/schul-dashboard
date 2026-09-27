-- Role versions invalidated sessions whose tokens carried outdated roles.
-- Tokens now carry no roles and every request reads them from the database,
-- so there is nothing left to invalidate.
ALTER TABLE public.refresh_tokens DROP COLUMN IF EXISTS role_version;
ALTER TABLE public.users DROP COLUMN IF EXISTS role_version;
