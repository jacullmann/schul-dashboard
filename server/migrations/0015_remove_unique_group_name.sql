-- Drop the unique name constraint from the groups table
ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_name_key;
