-- Add course_id column to schedule_subs table for targeting individual virtual courses
ALTER TABLE public.schedule_subs
    ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_schedule_subs_course_id ON public.schedule_subs USING btree (course_id);
