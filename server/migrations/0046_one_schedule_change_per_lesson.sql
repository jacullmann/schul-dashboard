-- A lesson carries at most one change, which is edited in place instead of
-- stacking further copies of the lesson on the schedule. Of the changes a
-- lesson already collected, only the latest one stays.
DELETE FROM public.schedule_subs sub
USING (
    SELECT id,
           row_number() OVER (
               PARTITION BY lesson_id
               ORDER BY updated_at DESC, created_at DESC, id DESC
           ) AS position
    FROM public.schedule_subs
) ranked
WHERE sub.id = ranked.id
  AND ranked.position > 1;

ALTER TABLE public.schedule_subs
    ADD CONSTRAINT schedule_subs_lesson_id_key UNIQUE (lesson_id);

-- The unique constraint's index serves every lookup by lesson.
DROP INDEX IF EXISTS public.idx_timetable_subs_lesson_id;
