-- The admin statistics, daily activity chart and retention cleanups all
-- filter these tables by creation time.
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items (created_at);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users (created_at);
