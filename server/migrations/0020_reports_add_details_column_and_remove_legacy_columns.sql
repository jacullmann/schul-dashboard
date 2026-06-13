ALTER TABLE public.reports ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reports DROP CONSTRAINT reports_message_id_fkey;
DROP INDEX idx_reports_message_id;

ALTER TABLE public.reports DROP COLUMN item_id;
ALTER TABLE public.reports DROP COLUMN item_title;
ALTER TABLE public.reports DROP COLUMN message_id;
ALTER TABLE public.reports DROP COLUMN message_content;

CREATE INDEX idx_reports_details ON public.reports USING gin (details);
