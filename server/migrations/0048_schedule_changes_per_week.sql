-- A change applies to the one school week it was entered for instead of every
-- week, named by that week's Monday. A lesson carries at most one change per
-- week. Existing changes keep the week they were last saved for; one saved on a
-- weekend was meant for the following week, which the schedule showed by then.
ALTER TABLE public.schedule_subs
    ADD COLUMN week_start date;

-- Filing a change under its week does not edit it, so it keeps its timestamp.
ALTER TABLE public.schedule_subs DISABLE TRIGGER trg_timetable_subs_updated_at;

UPDATE public.schedule_subs
SET week_start = date_trunc('week', updated_at + interval '2 days')::date;

ALTER TABLE public.schedule_subs ENABLE TRIGGER trg_timetable_subs_updated_at;

ALTER TABLE public.schedule_subs
    ALTER COLUMN week_start SET NOT NULL,
    ADD CONSTRAINT schedule_subs_week_start_monday CHECK (extract(isodow FROM week_start) = 1),
    DROP CONSTRAINT schedule_subs_lesson_id_key,
    ADD CONSTRAINT schedule_subs_lesson_id_week_start_key UNIQUE (lesson_id, week_start);

-- Every read asks for a group's changes of some weeks.
DROP INDEX IF EXISTS public.idx_timetable_subs_tenant_id;
CREATE INDEX idx_schedule_subs_tenant_id_week_start
    ON public.schedule_subs USING btree (tenant_id, week_start);
