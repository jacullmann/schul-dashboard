-- The daily activity chart counts new groups by creation time.
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups (created_at);
