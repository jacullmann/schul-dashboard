-- The group's profile (name and picture) got its own permission name once the
-- group type and Dalton moved to the admin-only edit_group_configuration.
UPDATE public.groups
SET permissions = (permissions - 'edit_group_general')
    || jsonb_build_object('edit_group_profile', permissions -> 'edit_group_general')
WHERE permissions ? 'edit_group_general';
