-- Reports are no longer resolved and reopened, only deleted once handled.
DROP INDEX IF EXISTS public.idx_reports_processed;
DROP INDEX IF EXISTS public.idx_reports_processed_by;
ALTER TABLE public.reports
    DROP COLUMN IF EXISTS processed,
    DROP COLUMN IF EXISTS processed_at,
    DROP COLUMN IF EXISTS processed_by;
