-- Editing others' tasks used to be impossible for everyone. Groups that limited
-- deleting others' content to admins start with the same limit for editing it,
-- instead of the moderator default, so no group widens its moderation rights
-- by this release alone.
UPDATE public.groups
SET permissions = permissions || jsonb_build_object('edit_other_content', permissions -> 'delete_other_content')
WHERE permissions ? 'delete_other_content'
  AND NOT permissions ? 'edit_other_content';
