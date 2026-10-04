-- Course choices are per group, so whether a member has been through them is
-- too. The flag lives on the membership row: leaving a group drops it together
-- with the courses chosen there, so rejoining starts the setup over.
ALTER TABLE public.user_roles
    ADD COLUMN done_course_setup boolean NOT NULL DEFAULT false;

-- Members who finished the old account-wide setup are not asked again.
UPDATE public.user_roles ur
SET done_course_setup = true
FROM public.users u
WHERE u.id = ur.user_id
  AND ur.tenant_id IS NOT NULL
  AND u.done_setup;

ALTER TABLE public.users
    DROP COLUMN done_setup;
