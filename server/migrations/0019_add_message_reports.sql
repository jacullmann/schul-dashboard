-- Alter reports table columns to be nullable for polymorphism (tasks vs messages)
ALTER TABLE public.reports ALTER COLUMN item_id DROP NOT NULL;
ALTER TABLE public.reports ALTER COLUMN item_title DROP NOT NULL;

-- Add report_type column with default 'task'
ALTER TABLE public.reports ADD COLUMN report_type text NOT NULL DEFAULT 'task';
ALTER TABLE public.reports ADD CONSTRAINT reports_report_type_check CHECK (report_type = ANY (ARRAY['task'::text, 'message'::text]));

-- Add message_id and message_content snapshot columns
ALTER TABLE public.reports ADD COLUMN message_id uuid;
ALTER TABLE public.reports ADD COLUMN message_content text;

-- Add message_id foreign key constraint and index
ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.group_messages(id) ON DELETE SET NULL;

CREATE INDEX idx_reports_message_id ON public.reports USING btree (message_id);
