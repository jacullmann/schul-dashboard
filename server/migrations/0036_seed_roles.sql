-- The server addresses roles by fixed ids (see `Role::db_id`), so they are
-- reference data every database needs, not something to add by hand. Existing
-- databases already hold these rows and are left untouched.
INSERT INTO public.roles (id, name)
VALUES
    (1, 'superadmin'),
    (2, 'admin'),
    (3, 'moderator'),
    (4, 'user')
ON CONFLICT DO NOTHING;
